# -*- coding: utf-8 -*-
"""
Aplica a afirmaciones.json las decisiones de la tabla de validación (Excel) devuelta por Rojas
o Urbs Regia.

Uso:  python3 aplicar_validacion.py <tabla.xlsx> [--validador "J. M. Rojas"]

  Validada             estado → validada
  Corregir             aplica texto, nivel y fuente corregidos; estado → validada
  Retirar              la afirmación sale del archivo (queda en afirmaciones.retiradas.json)
  Pendiente de fuente  estado → pendiente-fuente
  (vacío)              sin cambios

Escribe un resumen de lo aplicado. Hay que volver a ejecutar el importador después.
"""
import json, sys, datetime
from openpyxl import load_workbook

if len(sys.argv) < 2:
    sys.exit(__doc__)
tabla = sys.argv[1]
validador = sys.argv[sys.argv.index("--validador") + 1] if "--validador" in sys.argv else ""
hoy = datetime.date.today().isoformat()

af = json.load(open("afirmaciones.json"))
por_id = {a["id"]: a for a in af}
ws = load_workbook(tabla, data_only=True)["Afirmaciones"]
head = [c.value for c in ws[1]]
col = {h: i for i, h in enumerate(head)}

cambios = {"Validada": 0, "Corregir": 0, "Retirar": 0, "Pendiente de fuente": 0}
retiradas, avisos = [], []
for row in ws.iter_rows(min_row=2, values_only=True):
    cid, decision = row[col["ID"]], (row[col["Decisión"]] or "").strip()
    if not cid or not decision:
        continue
    a = por_id.get(cid)
    if not a:
        avisos.append(f"{cid}: no está en afirmaciones.json")
        continue
    comentario = (row[col["Comentario"]] or "").strip()
    if comentario:
        a["comentarioValidacion"] = comentario
    if decision == "Validada":
        a["estado"] = "validada"
    elif decision == "Corregir":
        texto = (row[col["Texto corregido"]] or "").strip()
        nivel = (row[col["Nivel corregido"]] or "").strip()[:1]
        fuente = (row[col["Fuente o página corregida"]] or "").strip()
        if not (texto or nivel or fuente):
            avisos.append(f"{cid}: marcada «Corregir» sin corrección; queda como estaba")
            continue
        if texto:
            a["texto"] = texto
        if nivel in ("D", "I", "H", "T"):
            a["nivel"] = nivel
            if nivel == "I" and not a.get("atribucion"):
                avisos.append(f"{cid}: pasa a Interpretación y necesita atribución")
        if fuente:
            a["fuenteCorregida"] = fuente
            avisos.append(f"{cid}: revisar la fuente corregida («{fuente}») y pasarla a fuente.titulo/pagina")
        a["estado"] = "validada"
    elif decision == "Retirar":
        retiradas.append(a)
    elif decision == "Pendiente de fuente":
        a["estado"] = "pendiente-fuente"
    else:
        avisos.append(f"{cid}: decisión desconocida «{decision}»")
        continue
    if decision != "Retirar":
        a["validacion"] = {"fecha": hoy, "validador": validador, "decision": decision}
    cambios[decision] += 1

ids_retirados = {a["id"] for a in retiradas}
json.dump([a for a in af if a["id"] not in ids_retirados], open("afirmaciones.json", "w"), ensure_ascii=False, indent=2)
if retiradas:
    previas = json.load(open("afirmaciones.retiradas.json")) if __import__("os").path.exists("afirmaciones.retiradas.json") else []
    json.dump(previas + retiradas, open("afirmaciones.retiradas.json", "w"), ensure_ascii=False, indent=2)

print("Aplicado:", ", ".join(f"{k}: {v}" for k, v in cambios.items()))
for x in avisos:
    print(" -", x)
