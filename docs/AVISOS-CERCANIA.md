# Avisos de cercanía

Con la app abierta, el asistente avisa al visitante cuando pasa cerca de un lugar de la ruta. Puede ser un lugar visigodo u otro patrimonio, que se marca como «Patrimonio no visigodo».

## Cómo funciona

- **Se activan a mano.** Hay un botón de ubicación en la cabecera del asistente y un botón «Avisarme cerca» en el mapa. Al activarlos, el navegador pide permiso de ubicación; antes no se pide nunca.
  - Si los avisos se activaron en una visita anterior, solo se reanudan solos cuando el navegador ya tiene concedido el permiso.
  - Si no lo tiene, el control los muestra «en pausa» y ofrece reanudarlos.
- **Qué se avisa.** Solo lugares de la ruta, nunca servicios: un aviso no es publicidad.
  - El visitante elige si quiere avisos de lugares visigodos, de otro patrimonio o de ambos.
  - Cada lugar se puede silenciar desde su aviso («No avisar de este lugar»).
  - Los silenciados se recuperan desde el control.
- **Zona de cada lugar** (`domain/nearby.ts`):
  - unos 250 m en la ciudad (museos y monumentos);
  - 1,5 km en el campo (yacimientos y paisajes), para decidir a tiempo el desvío;
  - si la coordenada es aproximada, la zona se amplía 100 m.
- **Mesura:**
  - un aviso cada vez;
  - al menos 90 s entre dos avisos;
  - el mismo lugar no se repite antes de 6 horas;
  - no se avisa del lugar que ya se está mirando ni del que se está recorriendo.
  - Las posiciones menos precisas que la propia zona se ignoran.
- **El aviso:**
  - qué es el lugar, a qué distancia está y su lema;
  - si sus piezas están en un museo de la ruta, dónde se exponen;
  - si hay más lugares cerca, un enlace al mapa;
  - tres acciones: «Cuéntame qué hay», que abre el asistente con la pregunta; «Ver la ficha»; y «No avisar de este lugar».
  - Se quita al cerrarlo o cuando el visitante se aleja más de 1,5 veces el radio.
- **Recorridos guiados.** Los avisos se pausan en las pantallas de recorrido, porque el recorrido ya detecta la llegada a cada parada (`domain/geo.ts`).

## Privacidad

- La posición se queda en memoria en el dispositivo y no se envía a ningún servidor.
- Al preguntar al asistente solo viaja el nombre del lugar.
- En el dispositivo solo se guardan las opciones del visitante, los lugares silenciados y cuándo se avisó de cada lugar en las últimas 6 horas. Nunca se guarda por dónde ha pasado.
- La política de privacidad y el aviso legal lo explican.

## Límites

Es una web, así que solo hay avisos con la app abierta y en pantalla. Con el móvil bloqueado o la app cerrada, el navegador no da la ubicación. Para avisos en segundo plano haría falta una app nativa con permiso de ubicación «siempre» y su propia revisión de privacidad.

## Código

| Pieza | Archivo |
| --- | --- |
| Reglas (zonas, mesura, cuándo se quita un aviso) | `src/domain/nearby.ts` (+ tests) |
| Estado: opciones guardadas en el dispositivo; aviso visible y estado de la ubicación sin guardar | `src/state/store.ts`, `src/state/persisted.ts` |
| Vigilancia de la posición (montada una vez en `AppShell`) | `src/components/nearby/NearbyWatcher.tsx` |
| Tarjeta del aviso | `src/components/nearby/NearbyAlertCard.tsx` |
| Botón y panel de ajustes | `src/components/nearby/NearbyControl.tsx` |
