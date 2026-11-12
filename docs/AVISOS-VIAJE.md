# Avisos de tiempo y tráfico

Cuando el visitante tiene un viaje con fecha, el asistente se adelanta: avisa de la lluvia, las tormentas, el calor, las heladas, las rachas de viento y las incidencias de tráfico que afectan a sus paradas. Si cambiar el orden evita la lluvia, lo propone.

## Qué ve el visitante

- **Mi viaje, «Avisos del asistente».** Muestra cada aviso con el tipo, el día, a qué paradas afecta, la fuente y la hora de la consulta. Si un orden distinto deja los lugares al aire libre en las horas más secas, aparece «Ver el cambio propuesto». El cambio pasa por la revisión de siempre: nada cambia hasta que el visitante lo acepta.
- **Aviso al abrir la app.** Cada aviso importante se muestra una vez por dispositivo, en cualquier pantalla, con un enlace a Mi viaje. No aparece en Mi viaje, en los recorridos guiados, en el modo coche ni mientras haya un aviso de cercanía.
- **Sin fecha no hay avisos.** El apartado pide poner una. Si el viaje empieza dentro de más de una semana, dice desde qué día habrá previsión: AEMET da 7 días.

## Reglas (`src/domain/conditions.ts`)

| Aviso | Cuándo | Gravedad |
| --- | --- | --- |
| Lluvia | Probabilidad del 40 % o más en las horas que el viaje pasa al aire libre | Aviso desde el 60 % |
| Tormenta | Probabilidad del 30 % o más (previsión horaria) | Aviso |
| Calor | Máxima de 34 °C o más con paradas al aire libre entre las 13 y las 18 | Aviso |
| Helada | Mínima de 0 °C o menos con paradas antes de las 11 | A tener en cuenta |
| Viento | Rachas de 60 km/h o más | A tener en cuenta |
| Tráfico | Incidencia vigente ese día a menos de 2 km de una parada o, en coche, a menos de 1 km de la línea entre dos paradas | Aviso |

- **Interior y exterior.** Los museos cuentan como interior; el resto de lugares, como exterior.
- **Propuesta para la lluvia.** Prueba a poner primero los lugares al aire libre, o primero los museos, y en viajes de varios días a intercambiar días. Solo la ofrece si reduce el tiempo bajo la lluvia al menos un 25 % (o 20 minutos).
- **Avisos operativos.** No son afirmaciones sobre el patrimonio, así que funcionan en los dos modos del asistente, el estricto y el abierto. Siempre llevan su fuente y se presentan como previsión.

## Fuentes y privacidad

- **AEMET OpenData.** Predicción diaria (7 días) y horaria (los dos o tres primeros días, con probabilidad de tormenta) de cada municipio del viaje. El municipio se busca por nombre en la lista de AEMET, así que el contenido no necesita códigos. Requiere `AEMET_API_KEY` (gratuita) en el servidor; sin ella solo hay avisos de tráfico. Crédito en /creditos.
- **DGT.** Fichero de incidencias de la red de carreteras, en formato DATEX II v3.7, abierto (CC BY) y sin clave. Recoge obras, accidentes y cortes, pero no atascos al minuto: para eso, la app de mapas.
- **Qué se envía.** El navegador solo manda a `/api/conditions` los pueblos, las fechas y un rectángulo alrededor de las paradas, nunca la posición. El servidor guarda en memoria las respuestas (30 minutos el tiempo, 5 el tráfico) y no guarda las consultas. La página de privacidad lo explica.

## Código

| Pieza | Archivo |
| --- | --- |
| Lectura de AEMET y DATEX II, reglas y propuesta (+ tests) | `src/domain/conditions.ts` |
| Consultas a AEMET y DGT con caché | `src/lib/conditions-server.ts` |
| API | `src/app/api/conditions/route.ts` |
| Hook compartido (refresca cada 15 min) | `src/lib/useTripConditions.ts` |
| Apartado de Mi viaje y aviso global | `src/components/conditions/` |

## Pendiente

- Probarlo con una clave de AEMET real y con el fichero de la DGT en el servidor: desde el entorno de desarrollo no se llega a esas webs, así que la lectura se ha probado con muestras de su formato documentado.
- Confirmar que la DGT cubre las carreteras autonómicas de Toledo (CM-401 y similares).
