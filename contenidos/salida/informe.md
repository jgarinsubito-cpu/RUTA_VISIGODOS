# Informe de importación

Generado el 2026-11-05 18:04 UTC desde `/home/claude/tour`.

## Resultado

| Qué | Cantidad |
| --- | --- |
| Recorridos | 5 |
| Paradas (lugares) | 35 |
| Afirmaciones | 0 |
| Historias | 0 |
| Paradas con imagen publicable | 0 |
| Registros para el gestor (en revisión) | 41 |

**Comprobación con las reglas del gestor:** sin errores; se puede importar.

## Errores que bloquean la publicación

- Nada.

## Advertencias del gestor

- Lugar visigodo sin fichas publicadas: el asistente no podrá contar su historia. (25: santa-justa, cuevas-hercules, el-salvador, san-bartolome, centro-guarrazar, guarrazar-1, guarrazar-2, guarrazar-3, guarrazar-4, guarrazar-5, guarrazar-6, vegabaja-1, vegabaja-2, vegabaja-3, vegabaja-4, vegabaja-5, concilios-1, concilios-2, concilios-3, concilios-4, concilios-5, concilios-6, territorio-1, territorio-2, territorio-6)
- Sin foto: se mostrará un fondo de color. (35: santa-justa, cuevas-hercules, el-salvador, santo-tome, san-bartolome, covarrubias, castillo-guadamur, centro-guarrazar, casa-munecas, guarrazar-1, guarrazar-2, guarrazar-3, guarrazar-4, guarrazar-5, guarrazar-6, vegabaja-1, vegabaja-2, vegabaja-3, vegabaja-4, vegabaja-5, concilios-1, concilios-2, concilios-3, concilios-4, concilios-5, concilios-6, territorio-1, territorio-2, territorio-3, territorio-4, territorio-5, territorio-6, territorio-7, territorio-8, territorio-9)

## Relatos que aún no entran como historias

El gestor exige que cada historia cite al menos una afirmación validada de su parada. Estas paradas tienen relato pero no afirmaciones en `afirmaciones.json`; su relato está completo en `extensiones.json` y en la ficha se ve el primer párrafo como descripción.

- santa-justa
- cuevas-hercules
- el-salvador
- santo-tome
- san-bartolome
- covarrubias
- castillo-guadamur
- centro-guarrazar
- casa-munecas
- guarrazar-1
- guarrazar-2
- guarrazar-3
- guarrazar-4
- guarrazar-5
- guarrazar-6
- vegabaja-1
- vegabaja-2
- vegabaja-3
- vegabaja-4
- vegabaja-5
- concilios-1
- concilios-2
- concilios-3
- concilios-4
- concilios-5
- concilios-6
- territorio-1
- territorio-2
- territorio-3
- territorio-4
- territorio-5
- territorio-6
- territorio-7
- territorio-8
- territorio-9

## Relatos divididos

- santa-justa (Calle Santa Justa): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- cuevas-hercules (Cuevas de Hércules): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- el-salvador (El Salvador): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- san-bartolome (San Bartolomé): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- castillo-guadamur (Castillo de Guadamur): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- centro-guarrazar (Centro de Interpretación de Guarrazar): el relato pasa de 1.500 caracteres y se divide en 3 historias.
- casa-munecas (Casa de Muñecas Salyperla): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- guarrazar-5 (La necrópolis y el lugar del hallazgo): el relato pasa de 1.500 caracteres y se divide en 2 historias.

## Imágenes sin créditos completos (no se publican)

Faltan autor, licencia o URL de origen en `creditos-imagenes.csv`. Plantilla con todas las imágenes: `creditos-imagenes.plantilla.csv`.

- CG01
- CH07
- CM01
- FC02
- LAS_PIEZAS_DE_LAS_VITRINAS
- MSS01
- PAISAJE3D
- SB09
- SJ04
- ST01
- VB01
- VB02
- VB03
- VB08
- VB09

## Coordenadas provisionales

- guarrazar-1 (Llegada): sin coordenada; se usa provisionalmente el centro de su recorrido (39.815837, -4.11898).
- guarrazar-4 (El edificio del manantial): sin coordenada; se usa provisionalmente el centro de su recorrido (39.815837, -4.11898).
- guarrazar-5 (La necrópolis y el lugar del hallazgo): sin coordenada; se usa provisionalmente el centro de su recorrido (39.815837, -4.11898).
- guarrazar-6 (Mirador): sin coordenada; se usa provisionalmente el centro de su recorrido (39.815837, -4.11898).
- vegabaja-2 (La gran avenida): sin coordenada; se usa provisionalmente el centro de su recorrido (39.862703, -4.035632).
- vegabaja-4 (El palacio y la iglesia de los concilios): sin coordenada; se usa provisionalmente el centro de su recorrido (39.862703, -4.035632).

## Decisiones a confirmar

- santo-tome (Santo Tomé): ¿Se presenta como patrimonio no visigodo (torre mudéjar)?
- covarrubias (Portada de Covarrubias): ¿Se presenta como patrimonio no visigodo?
- territorio-3 (El coto minero de Guadamur): ¿El coto minero se presenta como patrimonio no visigodo?
- territorio-7 (Minas de La Trinidad): ¿Las minas se presentan como patrimonio no visigodo?
- territorio-9 (Guadamur): Nombre provisional: el gestor no admite un lugar llamado igual que una localidad.

## Medios que faltan en el origen

- Nada.

## Otros avisos

- Las 6 paradas del Museo de los Concilios comparten la coordenada del museo: en interiores se eligen a mano (o por QR), no por geocerca.
- Los textos de portada y del asistente (preguntas de inicio, ejemplos, vocabulario) son provisionales: revísalos en «Portada y asistente».

## Pendiente de la entidad Parada

El modelo actual no tiene campos para la locución grabada, su transcripción, la galería, los modelos 3D ni el mapa ilustrado. Todo está en `extensiones.json`, enlazado a cada lugar por `siteId`, listo para cuando exista la entidad Parada.
