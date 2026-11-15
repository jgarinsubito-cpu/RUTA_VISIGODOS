# Genera la tabla de validación (Excel) a partir de afirmaciones.json.
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

origen = sys.argv[1]; salida = sys.argv[2]
af = json.load(open("afirmaciones.json"))
data = json.load(open(f"{origen}/data.json"))
stops = {s["id"]: s for s in data["stops"]}
# Afirmaciones de las piezas de museo (piezas.json): cada pieza cuenta como una «parada» de la tabla.
import os
if os.path.exists("piezas.json"):
    pz = json.load(open("piezas.json"))
    for p in pz["piezas"]:
        stops[p["id"]] = {"route": "piezas:" + p["museo"], "name": p["nombre"]}
        for a in p["afirmaciones"]:
            af.append({"id": a["id"], "parada": p["id"], "texto": a["texto"], "nivel": a["nivel"], "atribucion": a.get("atribucion", ""),
                       "fuente": a.get("fuente") or pz.get("fuentes", {}).get(p["museo"], pz["fuente"]), "origen": "Bibliografía" if a.get("fuente") else "Cartela de sala", "revisar": p.get("revisar", ""), "estado": a.get("estado", "borrador")})
RUTAS = {"urbana": "Toledo y Guadamur", "guarrazar": "Yacimiento de Guarrazar", "vegabaja": "Vega Baja", "concilios": "Museo de los Concilios", "territorio": "Ruta 1 · Territorio de Guarrazar", "piezas:museo-santa-cruz": "Piezas del Museo de Santa Cruz", "piezas:museo-concilios": "Piezas del Museo de los Concilios"}
NIV = {"D": "D · Documentado", "I": "I · Interpretación", "H": "H · Hipótesis", "T": "T · Tradición"}

F = "Arial"
base = Font(name=F, size=10); bold = Font(name=F, size=10, bold=True); white = Font(name=F, size=10, bold=True, color="FFFFFF")
head_fill = PatternFill("solid", fgColor="665D27"); input_fill = PatternFill("solid", fgColor="FFF2B3"); grey = PatternFill("solid", fgColor="F2F0EA")
thin = Side(style="thin", color="D9D4C7"); border = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical="top")

wb = Workbook()
# ---------------- Instrucciones
ins = wb.active; ins.title = "Instrucciones"
lines = [
 ("Validación de afirmaciones · Ruta Visigoda de Toledo Plus", Font(name=F, size=14, bold=True)),
 ("Borrador del 05/11/2026 para J. M. Rojas y Urbs Regia.", base),
 ("", base),
 ("Qué es", bold),
 ("Cada fila es una afirmación mínima extraída de los relatos de la app y casada con su ficha maestra (FM-01 v0.3, FM-02 v0.3, FM-03 v0.1) o con las fichas de la Ruta 1. Solo lo que se valide aquí podrá usarlo el asistente de la app, y cada relato solo puede decir lo que sostienen sus afirmaciones.", base),
 ("", base),
 ("Cómo se rellena", bold),
 ("1. Solo se editan las columnas amarillas (de «Decisión» a «Comentario»). El resto es el borrador y no debe cambiarse.", base),
 ("2. «Decisión»: Validada · Corregir · Retirar · Pendiente de fuente. Si es «Corregir», escribir el texto, el nivel o la fuente correctos en las columnas siguientes.", base),
 ("3. «Qué revisar» señala las dudas concretas de cada fila; las filas con duda aparecen sombreadas. Empezar por ellas.", base),
 ("4. Ejemplo: si en la fila de las 20 bañeras la cifra correcta es «al menos dieciséis», Decisión = Corregir y Texto corregido = «Dentro hay al menos dieciséis fosas…».", base),
 ("", base),
 ("Niveles", bold),
 ("D · Documentado: dato comprobado en la fuente.", base),
 ("I · Interpretación: lectura de unos autores; se cita siempre quién lo dice (columna «Atribución»).", base),
 ("H · Hipótesis: posibilidad sin confirmar; se presenta como tal.", base),
 ("T · Tradición: leyenda o tradición; nunca como hecho.", base),
 ("", base),
 ("Qué no está en esta tanda", bold),
 ("Las 8 paradas urbanas de Toledo y Guadamur (Santa Justa, San Ginés, El Salvador, Santo Tomé, San Bartolomé, Portada de Covarrubias, Castillo de Guadamur y Casa de Muñecas) no tienen ficha maestra: FM-04 (Toledo intramuros) sigue en espera de materiales. Se completarán cuando haya fuentes.", base),
 ("", base),
 ("La hoja «Resumen» cuenta el avance por parada y se actualiza sola.", base),
]
for i, (t, f) in enumerate(lines, 1):
    c = ins.cell(row=i, column=1, value=t); c.font = f; c.alignment = Alignment(wrap_text=True, vertical="top")
ins.column_dimensions["A"].width = 120

# ---------------- Afirmaciones
ws = wb.create_sheet("Afirmaciones")
cols = [("ID", 22), ("Recorrido", 18), ("Parada", 24), ("Afirmación", 60), ("Nivel", 15), ("Atribución", 22), ("Fuente", 40), ("Página", 10), ("Origen en la ficha", 22), ("Qué revisar", 45),
        ("Decisión", 16), ("Nivel corregido", 15), ("Texto corregido", 45), ("Fuente o página corregida", 30), ("Comentario", 35)]
for j, (h, w) in enumerate(cols, 1):
    c = ws.cell(row=1, column=j, value=h); c.font = white; c.fill = head_fill; c.alignment = Alignment(wrap_text=True, vertical="center"); c.border = border
    ws.column_dimensions[c.column_letter].width = w
for i, a in enumerate(af, 2):
    s = stops[a["parada"]]
    vals = [a["id"], RUTAS[s["route"]], f'{s["name"]}', a["texto"], NIV[a["nivel"]], a.get("atribucion", ""), a["fuente"]["titulo"], a["fuente"].get("pagina", ""), a["origen"], a["revisar"], "", "", "", "", ""]
    for j, v in enumerate(vals, 1):
        c = ws.cell(row=i, column=j, value=v); c.font = base; c.alignment = wrap; c.border = border
        if j >= 11: c.fill = input_fill
n = len(af) + 1
dv = DataValidation(type="list", formula1='"Validada,Corregir,Retirar,Pendiente de fuente"', allow_blank=True); ws.add_data_validation(dv); dv.add(f"K2:K{n}")
dv2 = DataValidation(type="list", formula1='"D · Documentado,I · Interpretación,H · Hipótesis,T · Tradición"', allow_blank=True); ws.add_data_validation(dv2); dv2.add(f"L2:L{n}")
ws.conditional_formatting.add(f"A2:J{n}", FormulaRule(formula=[f'LEN($J2)>0'], fill=grey))
ws.freeze_panes = "E2"; ws.auto_filter.ref = f"A1:O{n}"

# ---------------- Resumen
rs = wb.create_sheet("Resumen")
hdr = ["Recorrido", "Parada", "Afirmaciones", "Con dudas", "Validadas", "Corregir", "Retirar", "Pendiente de fuente", "Sin decidir"]
for j, h in enumerate(hdr, 1):
    c = rs.cell(row=1, column=j, value=h); c.font = white; c.fill = head_fill; c.border = border; c.alignment = Alignment(wrap_text=True)
paradas = []
for a in af:
    if a["parada"] not in paradas: paradas.append(a["parada"])
R = f"Afirmaciones!$C$2:$C${n}"
for i, p in enumerate(paradas, 2):
    s = stops[p]
    rs.cell(row=i, column=1, value=RUTAS[s["route"]]); rs.cell(row=i, column=2, value=s["name"])
    rs.cell(row=i, column=3, value=f'=COUNTIF({R},B{i})')
    rs.cell(row=i, column=4, value=f'=COUNTIFS({R},B{i},Afirmaciones!$J$2:$J${n},"?*")')
    for col, lab in zip("EFGH", ["Validada", "Corregir", "Retirar", "Pendiente de fuente"]):
        rs[f"{col}{i}"] = f'=COUNTIFS({R},B{i},Afirmaciones!$K$2:$K${n},"{lab}")'
    rs[f"I{i}"] = f"=C{i}-SUM(E{i}:H{i})"
t = len(paradas) + 2
rs.cell(row=t, column=1, value="Total").font = bold
for col in "CDEFGHI":
    rs[f"{col}{t}"] = f"=SUM({col}2:{col}{t-1})"; rs[f"{col}{t}"].font = bold
for row in rs.iter_rows(min_row=2, max_row=t):
    for c in row:
        c.border = border
        if not c.font.bold: c.font = base
for col, w in zip("ABCDEFGHI", [30, 40, 13, 11, 11, 10, 9, 12, 11]): rs.column_dimensions[col].width = w
rs.freeze_panes = "A2"
wb.move_sheet("Resumen", offset=-1)
wb.save(salida); print("ok", salida, len(af), "filas,", len(paradas), "paradas")
