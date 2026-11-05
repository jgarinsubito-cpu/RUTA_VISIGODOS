/**
 * Prepara los vídeos 360° para la app (docs/VIDEO360.md). Lee la lista de «videos360» de la
 * configuración de importación y, por cada original, genera:
 *
 *   <archivo>-4k.mp4     3840×1920, H.264, 30 fps, ~16 Mb/s como máximo (pantallas grandes)
 *   <archivo>-movil.mp4  2560×1280, H.264, 30 fps, ~7 Mb/s como máximo (móviles y ahorro de datos)
 *   <archivo>.jpg        fotograma de portada (2048×1024)
 *   manifiesto.json      duración y resolución de cada vídeo: lo lee el importador
 *
 * Uso (desde web/):
 *   npx tsx scripts/preparar-360.ts --origen <carpeta con los originales> --salida <carpeta>
 *     [--config ../contenidos/config-importacion.json] [--calidad]   (--calidad: más lento, algo menos de peso)
 *
 * Necesita ffmpeg y ffprobe instalados. Los originales no se modifican. Si un archivo de salida
 * ya existe, no se rehace (bórralo para regenerarlo).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface EntradaVideo {
  /** Nombre del archivo original, tal como está en la carpeta de origen. */
  original: string;
  /** Nombre base de los archivos web (sin extensión), p. ej. «castillo-patio». */
  archivo: string;
  /** Segundo del que sacar la portada. */
  portada?: number;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const origen = arg("origen");
const salida = arg("salida");
const configPath = arg("config") ?? path.resolve(__dirname, "../../contenidos/config-importacion.json");
const preset = process.argv.includes("--calidad") ? "slow" : "veryfast";
if (!origen || !salida) {
  console.error("Uso: npx tsx scripts/preparar-360.ts --origen <originales> --salida <carpeta> [--config …] [--calidad]");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as { videos360?: { paradas?: Record<string, EntradaVideo[]> } };
const entradas = Object.values(config.videos360?.paradas ?? {}).flat();
const unicas = [...new Map(entradas.map((e) => [e.archivo, e])).values()];
fs.mkdirSync(salida, { recursive: true });

function probe(file: string): { width: number; height: number; duration: number } {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(out) as { streams: { width: number; height: number }[]; format: { duration: string } };
  return { width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format.duration) };
}

function encode(src: string, dest: string, width: number, maxrate: string, crf: number) {
  if (fs.existsSync(dest)) return;
  console.log(`  → ${path.basename(dest)}`);
  execFileSync(
    "ffmpeg",
    [
      "-v", "error", "-stats", "-y", "-i", src,
      "-vf", `fps=30,scale=${width}:${width / 2}:flags=lanczos`,
      "-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-maxrate", maxrate, "-bufsize", maxrate.replace(/\d+/, (n) => String(Number(n) * 2)),
      "-profile:v", "high", "-pix_fmt", "yuv420p", "-tag:v", "avc1",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-movflags", "+faststart",
      `${dest}.tmp.mp4`,
    ],
    { stdio: "inherit" },
  );
  fs.renameSync(`${dest}.tmp.mp4`, dest);
}

const manifiesto: Record<string, { original: string; durationSeconds: number; origen: string; aviso?: string }> = {};
const manifiestoPath = path.join(salida, "manifiesto.json");
if (fs.existsSync(manifiestoPath)) Object.assign(manifiesto, JSON.parse(fs.readFileSync(manifiestoPath, "utf8")));

for (const e of unicas) {
  const src = path.join(origen, e.original);
  if (!fs.existsSync(src)) {
    console.warn(`Falta el original: ${e.original}`);
    continue;
  }
  const info = probe(src);
  console.log(`${e.original}: ${info.width}×${info.height}, ${Math.round(info.duration)} s`);
  // Un vídeo 360° equirrectangular mide el doble de ancho que de alto.
  const aviso = Math.abs(info.width / info.height - 2) > 0.02 ? `No es 2:1 (${info.width}×${info.height}): ¿es de verdad un 360° equirrectangular?` : undefined;
  if (aviso) console.warn(`  ${aviso}`);
  if (info.width < 3840) console.warn(`  El original mide menos de 3840 px de ancho: la versión 4K se amplía.`);

  encode(src, path.join(salida, `${e.archivo}-4k.mp4`), 3840, "16M", 23);
  encode(src, path.join(salida, `${e.archivo}-movil.mp4`), 2560, "7M", 24);
  const poster = path.join(salida, `${e.archivo}.jpg`);
  if (!fs.existsSync(poster)) {
    const at = Math.min(e.portada ?? 2, Math.max(0, info.duration - 0.5));
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(at), "-i", src, "-frames:v", "1", "-vf", "scale=2048:1024", "-q:v", "3", poster]);
  }
  manifiesto[e.archivo] = { original: e.original, durationSeconds: Math.max(1, Math.round(info.duration)), origen: `${info.width}×${info.height}`, ...(aviso ? { aviso } : {}) };
}

fs.writeFileSync(manifiestoPath, JSON.stringify(manifiesto, null, 2));
const pesos = fs
  .readdirSync(salida)
  .filter((f) => f.endsWith(".mp4"))
  .map((f) => `${f}: ${(fs.statSync(path.join(salida, f)).size / 1024 / 1024).toFixed(0)} MB`);
console.log(`\nListo. ${Object.keys(manifiesto).length} vídeos en ${salida}\n${pesos.join("\n")}`);
