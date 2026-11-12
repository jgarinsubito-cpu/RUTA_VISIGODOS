# Modo coche

En las rutas en coche, como la del territorio de Guarrazar o Toledo y Guadamur, el modo coche convierte la ruta en un programa de audio para el trayecto. Está en `/rutas/<ruta>/coche`; se entra desde «Modo coche» en la ficha de la ruta.

Es la fase 1 de la versión para el coche: una página web sin app nativa. Más adelante, las apps de audio para Android Auto y CarPlay leerán el mismo catálogo.

## Qué suena y cuándo

El programa alterna dos tipos de audio:

- **Tramo** (`Route.legs`): se escucha de camino a una parada y suena solo al terminar el audio anterior. Se escribe para oír sin mirar: nada de «mira a tu izquierda».
- **Relato de la parada** (`Stop.audio`): pide mirar, así que con la posición activada suena al llegar. Nunca suena kilómetros antes ni corta el audio que está sonando: si se llega durante un tramo, el relato espera a que termine. Sin la posición activada, quien acompaña pulsa «Reproducir» al llegar.

Nada suena hasta que el visitante pulsa «Empezar». Es la excepción acordada a la regla de no reproducir audio por sí solo: el visitante pide expresamente un programa continuo.

**Zonas de llegada** (`src/domain/drive.ts`): unos 200 m en pueblos y ciudad y 450 m en el campo, más 100 m si la coordenada es aproximada. Son más amplias que a pie, porque el coche para donde puede. Solo se busca la llegada a las tres paradas siguientes, para mantener el orden de la ruta.

## El coche y el móvil

- **Mandos del coche.** La API de controles de reproducción (Media Session) publica el título y la ruta, y responde a reproducir, pausar, siguiente y anterior. Así funcionan los mandos del volante y la pantalla «Reproduciendo» cuando el móvil suena por Bluetooth, CarPlay o Android Auto. Hay que comprobarlo en coches reales: depende del coche y del navegador.
- **Pantalla encendida.** Con la posición activada, la pantalla no se apaga (Screen Wake Lock), porque el navegador deja de dar la ubicación con la pantalla bloqueada. Se recomienda llevar el móvil en un soporte y cargando.
- **Cómo llegar.** El botón abre la app de mapas con la siguiente parada. La app no guía giro a giro.
- **Sin conexión.** «Usar sin conexión» descarga la página, los relatos y los tramos.
- **Avisos de cercanía.** Se pausan en el modo coche, porque el programa ya avisa de cada parada.
- **Seguridad.** Un aviso fijo pide no mirar la pantalla al conducir. Los controles son grandes (64-80 px) para quien va de acompañante.

## Contenido pendiente

Los tramos se editan en el gestor de contenidos: ficha de la ruta, sección «Modo coche: tramos en audio». Cada tramo lleva su audio, su transcripción completa y su crédito.

La publicación exige que cada tramo vaya a una parada del recorrido y tenga transcripción, y avisa si falta el crédito.

Hoy ninguna ruta tiene tramos. Los candidatos naturales son los fragmentos de las entrevistas: por ejemplo, F24-F28 de Rojas sobre el hallazgo y la venta del tesoro, que encajan entre Toledo y Guadamur.

## Código

| Pieza | Archivo |
| --- | --- |
| Reglas: programa, llegada, qué suena después | `src/domain/drive.ts` (+ tests) |
| Reproductor | `src/components/drive/DriveMode.tsx` |
| Página | `src/app/rutas/[slug]/coche/page.tsx` |
| Tramos: tipo, esquema, validación y editor | `Route.legs` en `types.ts`, `schema.ts`, `validate.ts` y `RouteForm.tsx` |
