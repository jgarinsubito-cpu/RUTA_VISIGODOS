/*
 * Ruta Visigoda service worker: the app keeps working where there is no coverage (a dig, the
 * fields of the territory route). No dependencies; plain Cache Storage.
 *
 *   rv-shell-<version>  pages and static assets seen while browsing (replaced on each version)
 *   rv-packs-v1         tours the visitor downloaded (kept across versions until removed)
 *
 * Pages: network first (short timeout), then the cached copy, then /sin-conexion.
 * Build assets (/_next/static): cache first. Media (/media, /images): cache first, with partial
 * (Range) responses built from the cached file so audio can seek offline. /_next/image falls
 * back to the cached original. The assistant and the admin (/api) are never cached.
 */
const VERSION = "2026-11-05";
const SHELL = `rv-shell-${VERSION}`;
const OFFLINE_URL = "/sin-conexion";
const PRECACHE = ["/", OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const NAV_TIMEOUT_MS = 4000;

/** Build assets a page or a stylesheet refers to. */
function assetUrls(text) {
  return [...new Set((text.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? []).map((u) => u.replace(/&amp;/g, "&")))];
}

async function cacheWithAssets(cache, url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return;
  await cache.put(url, res.clone());
  const text = await res.text();
  const assets = assetUrls(text);
  await Promise.all(
    assets.map(async (a) => {
      if (await cache.match(a)) return;
      const r = await fetch(a);
      if (!r.ok) return;
      await cache.put(a, r.clone());
      if (a.endsWith(".css")) {
        for (const nested of assetUrls(await r.text())) {
          if (!(await cache.match(nested))) {
            const n = await fetch(nested);
            if (n.ok) await cache.put(nested, n);
          }
        }
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      for (const url of PRECACHE) {
        try {
          await (url === "/" || url === OFFLINE_URL ? cacheWithAssets(cache, url) : cache.add(url));
        } catch {
          // Installing must not fail because one file could not be fetched.
        }
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("rv-shell-") && n !== SHELL).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** A 206 response for `range` ("bytes=a-b") cut from a full cached response. */
async function partial(response, range) {
  const buffer = await response.arrayBuffer();
  const size = buffer.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  end = Math.min(end, size - 1);
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

async function fromCaches(request) {
  return (await caches.match(request.url, { ignoreVary: true })) ?? null;
}

async function navigate(request) {
  const cache = await caches.open(SHELL);
  try {
    const network = fetch(request);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS));
    const res = await Promise.race([network, timeout]);
    if (res.ok) cache.put(request.url, res.clone());
    return res;
  } catch {
    const url = new URL(request.url);
    const cached =
      (await caches.match(request.url, { ignoreVary: true })) ??
      (await caches.match(url.origin + url.pathname, { ignoreVary: true })) ??
      (await caches.match(OFFLINE_URL));
    return cached ?? new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request, store) {
  const cached = await fromCaches(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok && store) (await caches.open(SHELL)).put(request.url, res.clone());
  return res;
}

async function media(request) {
  const cached = await fromCaches(request);
  const range = request.headers.get("Range");
  if (cached) return range ? partial(cached, range) : cached;
  return fetch(request);
}

async function optimizedImage(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(SHELL)).put(request.url, res.clone());
    return res;
  } catch {
    const cached = await fromCaches(request);
    if (cached) return cached;
    // Offline: the original file of a downloaded tour.
    const original = new URL(request.url).searchParams.get("url");
    const fallback = original && (await caches.match(new URL(original, self.location.origin).href, { ignoreVary: true }));
    return fallback ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin"))) return;
  // Client navigation data: when it fails, the router falls back to a full page load, which is
  // then served from the cache.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
  } else if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, true));
  } else if (sameOrigin && url.pathname === "/_next/image") {
    event.respondWith(optimizedImage(request));
  } else if ((sameOrigin && (url.pathname.startsWith("/media/") || url.pathname.startsWith("/images/"))) || url.pathname.includes("/storage/v1/object/public/")) {
    event.respondWith(media(request));
  } else if (sameOrigin) {
    event.respondWith(cacheFirst(request, url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest"));
  }
});
