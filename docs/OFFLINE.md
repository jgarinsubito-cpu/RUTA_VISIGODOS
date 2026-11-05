# Uso sin conexión

La app se puede instalar en el móvil (manifiesto en `web/src/app/manifest.ts`, iconos en `web/public/icons/`) y cada recorrido guiado se puede descargar para hacerlo donde no hay cobertura.

## Cómo funciona

- **Service worker** (`web/public/sw.js`, sin dependencias), registrado solo en producción (`components/shell/ServiceWorker.tsx`):
  - páginas: primero la red (4 s como máximo), después la copia guardada, después `/sin-conexion`;
  - recursos de la build (`/_next/static`): primero la caché;
  - audio e imágenes (`/media`, `/images`, almacén del gestor): primero la caché; el audio se sirve por fragmentos (respuestas 206) para poder avanzar y retroceder sin conexión;
  - `/_next/image`: sin conexión, sirve el original descargado;
  - nunca guarda `/api` (asistente, gestor) ni `/admin`.
- **Descarga de un recorrido** (`lib/offline.ts`, `components/tour/OfflinePack.tsx`): en el inicio de cada recorrido guiado. Guarda la página del recorrido, la de la ruta o el lugar, las fichas de los lugares, los audios y las imágenes, y los scripts, estilos y fuentes que cargan esas páginas. Muestra progreso, tamaño y fecha; avisa si el contenido publicado cambió desde la descarga; permite reintentar (solo baja lo que falta) y borrar (sin tocar archivos que use otro recorrido descargado).
- **Sin conexión**, el recorrido avisa de que sigue funcionando con lo descargado; el asistente, el mapa y «Cómo llegar» necesitan conexión. `/sin-conexion` lista los recorridos guardados.

Probado en Chromium con la visita de Guarrazar: 13,1 MB; sin red se abre, avanza por las paradas, reproduce y busca en el audio, muestra las imágenes y la ficha del lugar; una página no descargada lleva a `/sin-conexion`; borrar la descarga vacía la caché.

## Al desplegar

- Cambia `VERSION` en `web/public/sw.js` en cada despliegue: así se descarta la caché de navegación anterior. Las descargas de los visitantes (`rv-packs-v1`) se conservan; si el contenido publicado cambia, el recorrido les ofrece actualizar.
- Sirve la app por HTTPS (obligatorio para el service worker).

## Límites

- El navegador puede borrar las descargas si el móvil se queda sin espacio; la app pide almacenamiento persistente, pero no siempre se concede.
- En iPhone, el uso sin conexión funciona mejor con la app instalada en la pantalla de inicio; Safari limita el espacio de las webs sin instalar. Hay que probarlo en dispositivos reales antes de la presentación.
- La geolocalización funciona sin datos (es GPS del móvil), pero los mapas no se descargan.

Los vídeos 360° no entran en la descarga: se ven solo con conexión (docs/VIDEO360.md).
