# Contenidos de la Ruta Visigoda

Esta carpeta lleva los contenidos definitivos (recorridos, paradas, relatos, locuciones, fotos, ilustraciones y modelos 3D) al gestor de contenidos de la app. El script nunca publica: todo entra **en revisión**, y solo un validador lo publica desde `/admin`.

## Qué hay aquí

| Archivo | Quién lo edita | Para qué |
| --- | --- | --- |
| `config-importacion.json` | Contenidos | Datos de cada recorrido (nombre, resumen, transporte, temas) y ajustes por parada (visigoda o no, tipo, localidad). Lo marcado con «revisar» está por confirmar. |
| `creditos-imagenes.csv` | Contenidos | Autor, licencia y URL de origen de cada imagen. Sin estos tres datos, la imagen no se publica. Se crea a partir de `salida/creditos-imagenes.plantilla.csv`. |
| `afirmaciones.json` | Se genera con `afirmaciones_fuente.py`; lo actualiza `aplicar_validacion.py` | Afirmaciones de cada parada con nivel D/I/H/T, fuente y estado (`borrador`, `validada`, `pendiente-fuente`). Solo las validadas entran en el gestor. Sin ellas, el relato no entra como historia (el gestor exige que cada historia cite al menos una). |
| `afirmaciones_fuente.py` | Contenidos | Borrador de las afirmaciones, casadas con las fichas maestras (FM-01, FM-02, FM-03) y las fichas de la Ruta 1. |
| `tabla_validacion.py`, `aplicar_validacion.py` | Contenidos | Generan la tabla de validación en Excel para Rojas / Urbs Regia y aplican sus decisiones a `afirmaciones.json`. |
| `salida/` | El script | `catalogo.json` (versión completa), `registros.json` (filas para el gestor), `extensiones.json` (audio, galería y 3D, para la futura entidad Parada), `informe.md` y la plantilla de créditos. |

Formato de `afirmaciones.json`:

```json
[
  {
    "id": "claim-guarrazar-basilica-tres-naves",
    "parada": "guarrazar-2",
    "texto": "La basílica tenía tres naves.",
    "nivel": "D",
    "fuente": { "titulo": "Autor, título", "pagina": "12" },
    "palabrasClave": ["basilica", "naves"]
  }
]
```

`nivel` es D (documentado), I (interpretación, con `atribucion`), H (hipótesis) o T (tradición). `parada` es el identificador de la parada en el prototipo (`guarrazar-2`, `vegabaja-4`…). Las palabras clave van en minúsculas y sin tildes.

## Circuito de validación de afirmaciones

```bash
python3 afirmaciones_fuente.py                          # borrador → afirmaciones.json
python3 tabla_validacion.py <carpeta del prototipo> Validacion.xlsx   # tabla para Rojas
# … Rojas y Urbs Regia rellenan las columnas amarillas …
python3 aplicar_validacion.py Validacion.xlsx --validador "J. M. Rojas"
```

Después se vuelve a ejecutar el importador. Para ver cómo quedaría todo con los borradores, `--incluir-borradores` (nunca junto con `--subir`).

## Cómo se usa

Desde `web/`:

```bash
# 1. Comprobar y generar la salida (no toca nada más)
npx tsx scripts/importar-contenidos.ts --origen <carpeta del prototipo con data.json, img/, audio/, 3d/>

# 2. Leer contenidos/salida/informe.md y corregir lo que haga falta

# 3. Copiar fotos, audios y modelos a web/public
npx tsx scripts/importar-contenidos.ts --origen <carpeta> --copiar-medios

# 4. Subir al gestor, en revisión (cuenta de editor o validador)
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… GESTOR_EMAIL=… GESTOR_PASSWORD=… \
  npx tsx scripts/importar-contenidos.ts --origen <carpeta> --subir
```

`--subir` solo crea los registros que no existen. Con `--actualizar` también reemplaza los existentes, que vuelven a revisión. Si el informe tiene errores, no se sube nada.

## Cómo se convierte cada cosa

- Cada recorrido es una ruta; cada parada es un lugar (`site-parada-…`). Cuando exista la entidad Parada, `extensiones.json` tiene lo que falta.
- El primer párrafo del relato es la descripción del lugar. El relato completo entra como historia cuando la parada tiene afirmaciones; si pasa de 1.500 caracteres, se divide en varias historias.
- El tiempo de visita es la duración de la locución más 5 minutos.
- Horarios y accesibilidad quedan «sin verificar» hasta que producción los compruebe.
- Las coordenadas son aproximadas salvo las de «toma de campo». Las paradas sin coordenada usan el centro de su recorrido y salen en el informe.
