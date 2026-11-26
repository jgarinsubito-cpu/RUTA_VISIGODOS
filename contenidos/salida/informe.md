# Informe de importación

Generado el 2026-11-26 13:06 UTC con los textos de `contenidos/ruta.json` y los medios de `/home/claude/tour`.

## Resultado

| Qué | Cantidad |
| --- | --- |
| Rutas | 2 |
| Lugares | 20 |
| Paradas | 35 (28 con audio) |
| Afirmaciones | 277 (incluye borradores: solo previsualización) |
| Historias | 44 |
| Imágenes publicables (con créditos) | 0 |
| Registros para el gestor (en revisión) | 406 |

**Comprobación con las reglas del gestor:** sin errores; se puede importar.

## Errores que bloquean la publicación

- Nada.

## Advertencias del gestor

- Sin foto: se mostrará un fondo de color. (20: yacimiento-guarrazar, vega-baja, museo-concilios, museo-santa-cruz, santa-justa, cuevas-hercules, el-salvador, santo-tome, san-bartolome, covarrubias, castillo-guadamur, centro-guarrazar, casa-munecas, territorio-2, territorio-3, territorio-4, territorio-5, territorio-6, territorio-7, territorio-8)
- «suburbio» también es una palabra que el asistente usa para entender la pregunta («suburbio»). (1: vega-baja)
- Coordenadas aproximadas: tómalas en campo antes de publicar. (18: santa-justa, cuevas-hercules, el-salvador, santo-tome, san-bartolome, covarrubias, castillo-guadamur, centro-guarrazar, casa-munecas, vegabaja-3, vegabaja-5, territorio-2, territorio-3, territorio-4, territorio-5, territorio-6, territorio-7, territorio-8)
- Sin locución: se podrá leer el relato, pero no escucharlo grabado. (7: santa-justa, cuevas-hercules, el-salvador, santo-tome, san-bartolome, covarrubias, castillo-guadamur)
- Sin coordenadas: la llegada no se detectará sola; el visitante avanzará a mano. (6: guarrazar-1, guarrazar-4, guarrazar-5, guarrazar-6, vegabaja-2, vegabaja-4)
- Una foto sin permiso del museo: no se muestran hasta que conste. (26: piece-trientes-ervigio-egica-witiza, piece-placa-el-carpio-de-tajo, piece-sarcofago-orantes, piece-hebilla-fibula-trilaminar, piece-concilios-pilastra-san-salvador, piece-concilios-relieve-san-lucas, piece-concilios-inscripcion-ritmica, piece-concilios-inscripcion-ti-domini, piece-concilios-inscripcion-qui-credit, piece-concilios-capitel-escalona, piece-concilios-placa-nicho, piece-concilios-credo-epigrafico, piece-concilios-imposta, piece-concilios-friso-acanto, piece-concilios-friso-octopetalas, piece-concilios-friso-cruz-patada, piece-concilios-arqueta, piece-concilios-llave, piece-concilios-capitel-pencas, piece-concilios-columnilla, piece-concilios-basa, piece-concilios-fuste, piece-concilios-coronas-guarrazar, piece-concilios-placa-tamujas, piece-concilios-lapida-imma-frita, piece-concilios-lapida-sagenis)

## Locuciones por regrabar

Su relato se ha corregido en `ruta.json` y la locución antigua ya no coincide: no se importan hasta que se regraben.

- santa-justa (santajusta.mp3)
- cuevas-hercules (hercules.mp3)
- el-salvador (salvador2.mp3)
- santo-tome (santotome.mp3)
- san-bartolome (bartolome.mp3)
- covarrubias (covarrubias.mp3)
- castillo-guadamur (castillo2.mp3)

## Relatos que aún no entran como historias

El gestor exige que cada historia cite al menos una afirmación validada de su parada. Estas paradas tienen relato pero ninguna afirmación validada en `afirmaciones.json`; su relato está completo en `extensiones.json` y en la ficha se ve el primer párrafo como descripción.

- Nada.

## Relatos divididos

- santa-justa (Calle Santa Justa): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- cuevas-hercules (Cuevas de Hércules): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- el-salvador (El Salvador): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- covarrubias (Portada de San Clemente): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- castillo-guadamur (Castillo de Guadamur): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- centro-guarrazar (Centro de Interpretación de Guarrazar): el relato pasa de 1.500 caracteres y se divide en 3 historias.
- casa-munecas (Casa de Muñecas Salyperla): el relato pasa de 1.500 caracteres y se divide en 2 historias.
- guarrazar-5 (La necrópolis y el lugar del hallazgo): el relato pasa de 1.500 caracteres y se divide en 2 historias.

## Imágenes sin créditos completos (no se publican)

Faltan autor, licencia o URL de origen en `creditos-imagenes.csv`. Plantilla con todas las imágenes: `creditos-imagenes.plantilla.csv`.

- CG01
- CG05
- CG06
- CG11
- CG13
- CG14
- CG18
- CG19
- CG21
- CH01
- CH02
- CH06
- CH07
- CH08
- CI01
- CI02
- CI03
- CI04
- CI05
- CM01
- CM02
- DSC00947
- DSC00950
- DSC00952
- DSC00955
- DSC00956
- FC02
- FC03
- LAS_PIEZAS_DE_LAS_VITRINAS
- MSS01
- MSS02
- PAISAJE3D
- SB01
- SB02
- SB07
- SB08
- SB09
- SB10
- SJ01
- SJ04
- SJ05
- ST01
- ST02
- VB01
- VB02
- VB03
- VB04
- VB07
- VB08
- VB09

## Coordenadas provisionales

- Yacimiento de Guarrazar: coordenada del lugar calculada como centro de sus paradas; conviene fijar la de la entrada.
- Vega Baja de Toledo: coordenada del lugar calculada como centro de sus paradas; conviene fijar la de la entrada.
- guarrazar-1 (Llegada): sin coordenada propia; la llegada no se detectará sola hasta tomarla en campo.
- guarrazar-4 (El edificio del manantial): sin coordenada propia; la llegada no se detectará sola hasta tomarla en campo.
- guarrazar-5 (La necrópolis y el lugar del hallazgo): sin coordenada propia; la llegada no se detectará sola hasta tomarla en campo.
- guarrazar-6 (Mirador): sin coordenada propia; la llegada no se detectará sola hasta tomarla en campo.
- vegabaja-2 (La gran avenida): sin coordenada propia; la llegada no se detectará sola hasta tomarla en campo.
- vegabaja-4 (El palacio y la iglesia de los concilios): sin coordenada propia; la llegada no se detectará sola hasta tomarla en campo.

## Decisiones a confirmar

- Museo de Santa Cruz: Museo general, no visigodo: se incluye por sus piezas visigodas. Coordenada estimada: fijar la entrada en campo. Horario sin verificar.
- santo-tome (Santo Tomé): ¿Se presenta como patrimonio no visigodo (torre mudéjar)?
- covarrubias (Portada de San Clemente): ¿Se presenta como patrimonio no visigodo?
- centro-guarrazar (Centro de Interpretación de Guarrazar): 6 modelo(s) 3D pendientes de validar por Rojas (sello de certeza y explicación).
- guarrazar-1 (Llegada): 1 modelo(s) 3D pendientes de validar por Rojas (sello de certeza y explicación).
- guarrazar-3 (El hospital de peregrinos): 2 modelo(s) 3D pendientes de validar por Rojas (sello de certeza y explicación).
- guarrazar-3 (El hospital de peregrinos) · yacimiento guarrazar hostel.mp4: ¿El archivo «hostel» es el hospital de peregrinos (parada 3)?
- guarrazar-4 (El edificio del manantial): 2 modelo(s) 3D pendientes de validar por Rojas (sello de certeza y explicación).
- guarrazar-6 (Mirador): 1 modelo(s) 3D pendientes de validar por Rojas (sello de certeza y explicación).
- concilios-2 (La nave) · museo concilios.mp4: ¿En qué parada del museo se grabó? Propuesta: la nave (parada 2).
- territorio-3 (El coto minero de Guadamur): ¿El coto minero se presenta como patrimonio no visigodo?
- territorio-7 (Minas de La Trinidad): ¿Las minas se presentan como patrimonio no visigodo?
- Hebilla de cinturón y fíbula trilaminar: La cartela no se lee: confirmar datación, procedencia e inventario con el museo antes de publicar.
- Pilastra de la iglesia de San Salvador (reproducción): Es una reproducción: no se vincula como pieza hallada en El Salvador. El panel no da datación del original.
- Inscripción rítmica: Fotografiada de nuevo con su cartela el 23/11: confirmar en esas fotos la lectura «Los Hitos». La cartela dice que «conmemoraría» una construcción: no se recoge como dato.
- Inscripción litúrgica «QUI CREDIT IN EUM NON IUDICABITUR»: La cartela omite el número de capítulo («del cap ·»): la cita es Juan 3, 18; pendiente de respuesta del museo (preguntado el 23/11).
- Llave de bronce: El museo confirma que todas las piezas de la vitrina (pendeloque, colgante en forma de bellota, osculatorio y placa de cinturón liriforme) proceden de la Vega Baja. Faltan sus dataciones: no se incluyen hasta tenerlas.
- Columnilla de mármol: Foto nueva del 23/11 (columnilla 5). Confirmar que la cartela «3/12» es de esta columnilla.
- Reproducciones de las coronas de Guarrazar: Transcribir la cartela a partir de las fotos del 23/11 (carpeta fotos/NUEVO CONCILIOS/coronas) y confirmar cuántas coronas hay y cuáles.
- Placa de las Tamujas: La cartela data la placa en el siglo VII y la guía de 1973 en los siglos V-VI: se recogen las dos fechas con su fuente.
- Lápida funeraria de Imma Frita: Discrepancia: la cartela actual dice «Año 549 d.C.» y «Procedencia desconocida»; la guía de 1973 (n.º 56, p. 60) la fecha en la era 617 (año 579) y la sitúa en la Vega Baja, camino de San Pedro el Verde. Preguntar al museo antes de validar la afirmación con la fecha.
- Lápida funeraria de Sagenis: La cartela coincide en el año (562) y la edad (50 años), pero dice «Procedencia desconocida» y trata a Sagenis en masculino («fallecido»); la guía de 1973 la sitúa en la Vega Baja y la descripción la llama «sierva de Dios». Preguntar al museo la procedencia y la lectura.
- Capiteles visigodos de la nave de San Román: En las fotos del 23/11 no hay una toma clara de los capiteles de la nave: el capitel de «resto museo/rm capitel» es otra pieza (cartela: Iglesia de Santiago el Mayor). Usar el 360° de la nave o hacer una foto nueva.

## Vídeos 360°

- mezquita de las tornerias 2.mp4: La Mezquita de las Tornerías no es parada de ningún recorrido: decidir si se añade a la ruta urbana (como patrimonio no visigodo) o se deja fuera.
- castillo-guadamur (Castillo de Guadamur) · castillo patio.mp4: sin preparar (no está en el manifiesto).
- castillo-guadamur (Castillo de Guadamur) · castillo dentro puerta.mp4: sin preparar (no está en el manifiesto).
- guarrazar-3 (El hospital de peregrinos) · yacimiento guarrazar hostel.mp4: sin preparar (no está en el manifiesto).
- concilios-2 (La nave) · museo concilios.mp4: sin preparar (no está en el manifiesto).

## Piezas de museo

- Trientes de los reyes Ervigio, Égica y Witiza: la foto trientes-vega-baja.jpg no tiene permiso del museo; no se mostrará.
- Placa decorativa de El Carpio de Tajo: la foto placa-el-carpio-de-tajo.jpg no tiene permiso del museo; no se mostrará.
- Fragmento de sarcófago con orantes e imposición de manos: la foto sarcofago-orantes.jpg no tiene permiso del museo; no se mostrará.
- Hebilla de cinturón y fíbula trilaminar: la foto hebilla-y-fibula.jpg no tiene permiso del museo; no se mostrará.
- Pilastra de la iglesia de San Salvador (reproducción): la foto concilios-pilastra-san-salvador.jpg no tiene permiso del museo; no se mostrará.
- Relieve con representación del evangelista San Lucas: la foto concilios-relieve-san-lucas.jpg no tiene permiso del museo; no se mostrará.
- Inscripción rítmica: la foto concilios-inscripcion-ritmica.jpg no tiene permiso del museo; no se mostrará.
- Inscripción litúrgica «TI DOMINI»: la foto concilios-inscripcion-ti-domini.jpg no tiene permiso del museo; no se mostrará.
- Inscripción litúrgica «QUI CREDIT IN EUM NON IUDICABITUR»: la foto concilios-inscripcion-qui-credit.jpg no tiene permiso del museo; no se mostrará.
- Capitel con ciervo corriendo: la foto concilios-capitel-escalona.jpg no tiene permiso del museo; no se mostrará.
- Placa nicho: la foto concilios-placa-nicho.jpg no tiene permiso del museo; no se mostrará.
- Fragmentos de credo epigráfico: la foto concilios-credo-epigrafico.jpg no tiene permiso del museo; no se mostrará.
- Imposta con semicírculos imbricados: la foto concilios-imposta.jpg no tiene permiso del museo; no se mostrará.
- Friso con hojas de acanto: la foto concilios-friso-acanto.jpg no tiene permiso del museo; no se mostrará.
- Friso con flores octopétalas: la foto concilios-friso-octopetalas.jpg no tiene permiso del museo; no se mostrará.
- Friso con cruz patada: la foto concilios-friso-cruz-patada.jpg no tiene permiso del museo; no se mostrará.
- Arqueta (píxide) de hueso: la foto concilios-arqueta.jpg no tiene permiso del museo; no se mostrará.
- Llave de bronce: la foto concilios-llave.jpg no tiene permiso del museo; no se mostrará.
- Capitel con pencas y volutas: la foto concilios-capitel-pencas.jpg no tiene permiso del museo; no se mostrará.
- Columnilla de mármol: la foto concilios-columnilla.jpg no tiene permiso del museo; no se mostrará.
- Basa prismática: la foto concilios-basa.jpg no tiene permiso del museo; no se mostrará.
- Fuste octogonal: la foto concilios-fuste.jpg no tiene permiso del museo; no se mostrará.
- Reproducciones de las coronas de Guarrazar: la foto concilios-coronas-guarrazar.jpg no tiene permiso del museo; no se mostrará.
- Placa de las Tamujas: la foto concilios-placa-tamujas.jpg no tiene permiso del museo; no se mostrará.
- Lápida funeraria de Imma Frita: la foto concilios-lapida-imma-frita.jpg no tiene permiso del museo; no se mostrará.
- Lápida funeraria de Sagenis: la foto concilios-lapida-sagenis.jpg no tiene permiso del museo; no se mostrará.

## Medios que faltan en el origen

- Nada.

## Otros avisos

- centro-guarrazar: tiene 11 afirmaciones; cada historia cita solo las 10 primeras.
- guarrazar-1: tiene 15 afirmaciones; cada historia cita solo las 10 primeras.
- guarrazar-2: tiene 15 afirmaciones; cada historia cita solo las 10 primeras.
- guarrazar-5: tiene 11 afirmaciones; cada historia cita solo las 10 primeras.
- vegabaja-1: tiene 11 afirmaciones; cada historia cita solo las 10 primeras.
- Los textos de portada y del asistente (preguntas de inicio, ejemplos, vocabulario) son provisionales: revísalos en «Portada y asistente».

## Pendiente del modelo

Las paradas llevan su locución con transcripción, su galería y sus modelos 3D; las rutas, su mapa ilustrado. Solo las figuras (imagen aérea de la reconstrucción) quedan en `extensiones.json`.
