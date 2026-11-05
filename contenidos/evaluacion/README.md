# Evaluación del asistente

Banco de 166 preguntas para comprobar, antes de cada publicación, que el asistente responde con las afirmaciones validadas, matiza lo que está en debate, dice lo que no consta y no se deja llevar a inventar. Lo pide el documento de definición de Destino Plus (§7: entre 100 y 200 preguntas normales, engañosas, en conflicto y sin respuesta).

## Qué hay

| Archivo | Para qué |
| --- | --- |
| `preguntas_fuente.py` | Las preguntas y lo que se espera de cada una. Genera `preguntas.json`. |
| `preguntas.json` | El banco que lee el script. |
| `resultados/` | Informe (`.md`) y resultados por pregunta (`.json`) de cada ejecución. |

| Tipo | Preguntas | Qué comprueba |
| --- | --- | --- |
| normal | 81 | Responde citando la afirmación que corresponde |
| debate | 20 | Se apoya en la interpretación o la hipótesis, o en lecturas enfrentadas; no da el tema por cerrado |
| engañosa | 20 | No acepta una premisa falsa (coronas «para ceñir», «oro macizo», concilios «en San Román»…) ni los errores detectados en las fichas maestras |
| sin respuesta | 20 | Dice que no consta antes de ofrecer lo que sí está documentado |
| práctica | 15 | No da horarios, precios ni accesibilidad sin verificar como ciertos |
| seguridad | 10 | No obedece instrucciones para saltarse las fuentes, no opina sobre el conflicto de la Vega Baja |

En todas comprueba además que cada cita existe, está publicada y lleva su nivel (D, I, H o T).

## Cómo se usa

Desde `web/`, con un catálogo generado por el importador:

```bash
npx tsx scripts/importar-contenidos.ts --origen <prototipo> --incluir-borradores   # o solo validadas
npx tsx scripts/evaluar-asistente.ts --catalogo ../contenidos/salida/catalogo.json
npx tsx scripts/evaluar-asistente.ts --catalogo ../contenidos/salida/catalogo.json --modelo   # con ANTHROPIC_API_KEY
```

Sin `--modelo` evalúa el asistente local (determinista, sin red), que es el que responde si el modelo falla o no está configurado. Con `--modelo` evalúa el camino que usa la app con el modelo; sus respuestas varían, así que conviene repetirlo antes de cada publicación y revisar a mano una muestra.

Si Rojas retira o corrige una afirmación, hay que revisar las preguntas que la esperan (campo `citas`).

## Resultado actual (05/11/2026, asistente local, afirmaciones en borrador)

**160 de 166 (96 %).** Normales, debate, prácticas y seguridad: 100 %. Quedan 6 casos en los que el asistente local, que busca por palabras, no detecta que lo que se pregunta no está en las fuentes («¿cuánto pesa la corona?», «¿cuántos obispos asistieron?», «el nombre de los monjes»): ofrece afirmaciones relacionadas sin decir antes que el dato no consta. No afirma nada falso, pero no es la respuesta ideal. Es lo que debe resolver el modelo; hay que comprobarlo con `--modelo` en cuanto haya clave.

Cambios hechos a partir de la evaluación:

- Las afirmaciones ya no llevan nombres de lugar como palabras clave (el asistente reconoce el lugar por su nombre), y llevan las formas en que preguntan los visitantes.
- Los tres lugares de los nodos tienen nombres alternativos («San Román», «Centro de Interpretación»…).
- El asistente trata como histórica una pregunta que coincide con las palabras clave de una afirmación, aunque no use palabras de su lista general.
- Si la primera palabra con contenido de la pregunta (su foco) no la cubre ninguna afirmación, avisa de que no todo consta antes de ofrecer lo que sí.
