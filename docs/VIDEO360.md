# Vídeos 360°

Las paradas pueden llevar vídeos 360° (equirrectangulares, 2:1). En la ficha del lugar y en el recorrido guiado aparecen en la sección «En 360°». Cada vídeo es una tarjeta con su nombre, su duración, una descripción de lo que se ve y su crédito. El visor se carga solo cuando el visitante pulsa «Ver en 360°».

## Cómo se ve

- Se mira alrededor arrastrando con el dedo o el ratón. También con las flechas del teclado (con Mayús, de 30 en 30 grados) o moviendo el móvil («Mover con el móvil»; el iPhone pide permiso).
- La rueda del ratón y las teclas + y − acercan y alejan la vista. El espacio reproduce y pausa.
- Hay botones de reproducir, sonido y pantalla completa, de 44 px.
- El móvil, y cualquier conexión con «ahorro de datos», recibe la versión ligera. Las pantallas grandes reciben la 4K.
- Los vídeos se ven en streaming. **No entran en la descarga sin conexión**: un recorrido con cuatro vídeos pesaría más de 1 GB. La app lo avisa.

Código: `web/src/components/tour/StopVideos360.tsx` (three.js). El tipo es `StopVideo360` en `domain/types.ts`. El gestor exige una descripción de al menos 40 caracteres. Avisa si falta el crédito o la versión para móvil.

## Preparar los vídeos

Los originales pesan entre 0,2 y 1,6 GB: no se pueden publicar tal cual. `web/scripts/preparar-360.ts` genera tres archivos por vídeo con ffmpeg:

| Archivo | Para qué | Tamaño |
| --- | --- | --- |
| `<archivo>-4k.mp4` | Pantallas grandes | 3840×1920, H.264, 30 fps, máximo ~16 Mb/s |
| `<archivo>-movil.mp4` | Móviles y ahorro de datos | 2560×1280, H.264, 30 fps, máximo ~7 Mb/s |
| `<archivo>.jpg` | Portada mientras carga | 2048×1024 |

También escribe un `manifiesto.json` con la duración de cada vídeo y comprueba que sea 2:1.

Un minuto de vídeo pesa unos 100 MB en 4K y unos 50 MB en la versión para móvil.

```bash
# 1. Descargar los originales de la carpeta de vídeos 360° del Drive a una carpeta local
# 2. Desde web/:
npx tsx scripts/preparar-360.ts --origen <carpeta de originales> --salida <carpeta preparada>
#    (--calidad: compresión más lenta y algo más ligera, para la versión final)
```

## Enlazarlos a sus paradas

En `contenidos/config-importacion.json`, apartado `videos360`:

- `paradas`: por cada parada del prototipo, sus vídeos. Cada vídeo lleva `original`, `archivo`, `nombre` y **`descripcion`**. Opcionalmente, `credito` y `orientacion` (en grados: hacia dónde mira al abrirse; 0 es el centro del vídeo, 90 a la derecha).
- `credito`: el crédito común de las grabaciones. Un crédito con huecos (`[autoría]`) no se publica.
- `base`: dónde se sirven. Con `/media/360/` van con la app. Con una dirección `https://`, desde un servidor de vídeo.

Después:

```bash
npx tsx scripts/importar-contenidos.ts --origen <prototipo> --videos360 <carpeta preparada> --copiar-medios
```

Un vídeo sin preparar, o sin descripción, no se importa. El informe lo lista en «Vídeos 360°».

También se pueden añadir o corregir a mano en `/admin`, en la ficha de la parada, sección «Vídeos 360°», escribiendo la dirección de cada archivo.

## Dónde alojarlos

Los cinco vídeos preparados ocuparán varios cientos de MB. Hay tres opciones:

- **Con la app**, en `/media/360/`. Es lo más sencillo si el alojamiento sirve archivos grandes con peticiones parciales (Range), que todos los habituales admiten.
- **En un almacenamiento de objetos con CDN**, como Cloudflare R2, Bunny o S3 con CloudFront. Es lo recomendable para producción: se paga por tráfico y no carga el servidor de la app. Necesita CORS abierto para el dominio de la app, porque el visor lee el vídeo como textura.
- **Supabase Storage**: solo con plan de pago, porque el plan gratuito limita cada archivo a 50 MB.

## Estado (05/11/2026)

| Original | Parada | Pendiente |
| --- | --- | --- |
| yacimiento guarrazar hostel.mp4 | Guarrazar 3 · El hospital de peregrinos | Confirmar que «hostel» es el hospital; descripción |
| museo concilios.mp4 | Concilios 2 · La nave (propuesta) | Confirmar en qué parada se grabó; descripción |
| castillo patio.mp4 | Castillo de Guadamur | Descripción |
| castillo dentro puerta.mp4 | Castillo de Guadamur | Descripción |
| mezquita de las tornerias 2.mp4 | Ninguna | No es parada de ningún recorrido: decidir si se añade como patrimonio no visigodo o se deja fuera |

Falta además la autoría de las grabaciones.

El visor se ha probado con un vídeo de prueba. Los cinco reales aún no: hay que prepararlos y revisar en un móvil la dirección inicial de cada uno.
