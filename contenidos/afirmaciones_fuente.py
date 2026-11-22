# -*- coding: utf-8 -*-
"""
Borrador de afirmaciones validables por parada (5/11/2026), extraídas de los relatos de la app
y casadas con las fichas maestras (FM-01 v0.3, FM-02 v0.3, FM-03 v0.1 en Drive) y con las fichas
de la Ruta 1. Genera afirmaciones.json (para el script de importación) y la tabla de validación.

Cada afirmación lleva:
  nivel    D documentado · I interpretación (con atribución) · H hipótesis · T tradición
  fuente   la publicación de la que procede, con página cuando la ficha la da
  origen   la línea de la ficha maestra donde está
  revisar  lo que Rojas o Urbs Regia deben mirar (vacío si la ficha lo respalda sin matices)

No inventa fuentes: cuando un dato del relato no está en las fichas, la fuente es la que el
documento del nodo declara (panel, entrevista, jornadas) y «revisar» pide la referencia publicada.
"""
import json, os, unicodedata, re

S = {
    "RVE": "Rojas, Vicente y Eger (2022), «La basílica de Guarrazar (Guadamur, Toledo) en el contexto de un santuario hispanovisigodo», en Salido y Gómez (eds.), Iglesias tardoantiguas en el centro peninsular, La Ergástula",
    "ROJ": "Rojas (2025), «Indicios de un edificio monástico-palacial en el santuario hispanovisigodo de Sorbaces/Guarrazar», Urbs Regia 9",
    "MAR": "Martin (2025), «Guarrazar y su tesoro: una revisión», Hispania Antiqva XLIX",
    "MAN": "Mesa redonda «Una nueva mirada sobre el Tesoro de Guarrazar», Museo Arqueológico Nacional (2025), transcripción",
    "PCI": "Paneles del Centro de Interpretación de Guarrazar (Ayuntamiento de Guadamur)",
    "ENTG": "Entrevistas a J. M. Rojas en el yacimiento de Guarrazar (agosto de 2026)",
    "PTER": "Panel «El territorio de Guarrazar», yacimiento de Guarrazar (Ayuntamiento de Guadamur / Actividades Arqueológicas)",
    "JOR7": "Rojas Rodríguez-Malo, «El primer año de trabajos en Guarrazar», VII Jornadas de Cultura Visigoda",
    "OLMO": "Olmo Enciso, en Gallego et al. (2009), La Vega Baja de Toledo, Toletum Visigodo",
    "VP": "Villa y Peris, en Gallego et al. (2009), La Vega Baja de Toledo, Toletum Visigodo",
    "PER": "Peris, en Gallego et al. (2009), La Vega Baja de Toledo, Toletum Visigodo",
    "CM": "Cultura material, en Gallego et al. (2009), La Vega Baja de Toledo, Toletum Visigodo",
    "IZQ": "Izquierdo, en Gallego et al. (2009), La Vega Baja de Toledo, Toletum Visigodo",
    "GD": "Gurt y Diarte (2012), Zephyrus LXIX",
    "GRP": "Gómez Laguna et al., prospección con georradar de 2020 (publicada por la JCCM en 2023)",
    "TV": "«Historia de la Vega Baja», web de Toletum Visigodo (copia de 2020)",
    "ENTV": "Entrevistas a J. M. Rojas en la Vega Baja (2026)",
    "JUL": "Julián de Toledo, Historia Wambae regis",
    "CKG": "Caballero Klink y Gómez García (2017), «El Museo de los Concilios y de la Cultura Visigoda», Boletín del Museo Arqueológico Nacional 35",
    "FOLL": "Folleto «Museo de los Concilios y la Cultura Visigoda» (sin fecha ni autoría)",
    "CART": "Cartelas y paneles del Museo de los Concilios (textos de S. Cortés Hernández)",
    "ENTC": "Entrevistas a J. M. Rojas en el Museo de los Concilios (2026)",
    "SOFIA": "Ponencia inaugural del Seminario SOFIA (Urbs Regia)",
    "MBCS": "Morín, Barroso, Carrobles y Sánchez (2015), «Los palacios visigodos de la corte de Toledo», en Morín, Ribera y Sánchez (eds.), Jornadas sobre Pla de Nadal y los palacios y espacios de representación en época visigoda. Preactas",
    "LQMT": "López Quiroga y Martínez Tejera (2006), «El destino de los templos paganos en Hispania durante la Antigüedad tardía», Archivo Español de Arqueología 79",
}

def strip(t):
    t = unicodedata.normalize("NFD", t)
    return "".join(c for c in t if unicodedata.category(c) != "Mn").lower()

A = []  # (parada, nivel, texto, fuente, pagina, atribucion, origen, revisar, claves)
def a(parada, nivel, texto, fuente, pagina="", atrib="", origen="", revisar="", claves=()):
    A.append(dict(parada=parada, nivel=nivel, texto=texto, fuente=fuente, pagina=pagina, atrib=atrib,
                  origen=origen, revisar=revisar, claves=list(claves)))

# ---------------------------------------------------------------- Guarrazar · 1 Llegada
p = "guarrazar-1"
a(p, "D", "Guarrazar está a unos 10 km al suroeste de Toledo, en el término de Guadamur, junto a la Fuente de Guarrazar.", "RVE", "217", origen="FM-01 §1", claves=["guarrazar", "situacion", "guadamur", "toledo"])
a(p, "D", "El manantial de Guarrazar es permanente.", "RVE", "225, n. 8", origen="FM-01 §1", claves=["manantial", "agua", "fuente"])
a(p, "D", "El trazado más corto entre Mérida y Toledo pasaba por Cervatos, a poco más de 1 km al sur de Guarrazar (mapa de Coello, 1889).", "RVE", "217", origen="FM-01 §1", claves=["camino", "merida", "cervatos", "calzada"])
a(p, "D", "El lugar estuvo ocupado desde la prehistoria reciente hasta inicios de la Baja Edad Media: épocas carpetana, romana, hispanovisigoda, emiral y califal.", "RVE", "217, n. 2", origen="FM-01 §1", claves=["ocupacion", "prehistoria", "romana", "epocas"])
a(p, "I", "El apogeo del santuario fue el siglo VII, y su final llegó en el segundo decenio del siglo VIII.", "RVE", "241-247", atrib="Rojas, Vicente y Eger (2022)", origen="FM-01 §4", claves=["siglo vii", "apogeo", "cronologia"])
a(p, "D", "El Tesoro de Guarrazar apareció en agosto de 1858, en días de tormenta.", "MAR", "116", origen="FM-01 §2", claves=["tesoro", "1858", "hallazgo"])
a(p, "D", "Los descubridores vendieron piezas del tesoro por partes, y una parte importante salió hacia Francia.", "MAN", "", origen="FM-01 §2 [PISTA]",
  revisar="En FM-01 es una PISTA de la mesa redonda del MAN (validación n.º 7). Contrastar con Balmaseda y el Archivo de Palacio antes de publicar. El relato dice además «la mayoría acabó en Francia»: ¿es correcto?", claves=["tesoro", "venta", "francia", "dispersion"])
a(p, "D", "La mayor parte del tesoro se expone hoy en el Museo Arqueológico Nacional, en Madrid; otras piezas están en el Musée de Cluny, en París.", "MAR", "", origen="FM-01 §3 (ver FM-10)",
  revisar="La ficha no da página para el reparto actual. Añadir referencia.", claves=["tesoro", "man", "cluny", "museo", "donde esta"])
a(p, "D", "Camps (1963) calificó de «insignificantes» los restos de Guarrazar y defendió que el tesoro procedía de Toledo.", "RVE", "218-219", origen="FM-01 §2", claves=["camps", "investigacion", "toledo"])
a(p, "D", "Desde 2013 se desarrolla el proyecto «Guarrazar: Arqueología y Nuevos Recursos», del Ayuntamiento de Guadamur, dirigido por J. M. Rojas.", "RVE", "219", origen="FM-01 §2", claves=["excavaciones", "2013", "rojas", "proyecto"])
a(p, "H", "Guarrazar fue un santuario hispanovisigodo formado por el edificio del manantial con su necrópolis, un edificio en L, un posible complejo monástico-palacial y una basílica.", "RVE", "239", origen="FM-01 §4",
  revisar="FM-01 lo marca como hipótesis [H]; el relato lo presenta como hecho («las excavaciones han demostrado»). ¿Se puede afirmar como interpretación de los excavadores [I]?", claves=["santuario", "conjunto", "basilica", "hospital"])
a(p, "D", "Una de las cruces del tesoro, la de Sonnica, lleva la inscripción «+IN DI NOMINE OFFERET SONNICA SCE MARIE IN SORBACES».", "MAR", "136, 139, 147", origen="FM-01 §3", claves=["sonnica", "sorbaces", "inscripcion", "cruz"])
a(p, "H", "El santuario pudo llamarse Santa María de Sorbaces, el nombre que aparece en la cruz de Sonnica.", "ROJ", "", origen="FM-01 §4 ⚖",
  revisar="Hay otra hipótesis en la ficha: «San Félix in Tatanesio» (Martin 2025). ¿Se menciona?", claves=["sorbaces", "nombre", "santa maria"])
a(p, "D", "Hay restos en más de 40 hectáreas, con un núcleo de unas 7 hectáreas.", "MAN", "", origen="FM-01 §1",
  revisar="En FM-01 la cifra de las 7 ha y el vallado proceden de la mesa redonda del MAN (PISTA). Falta la referencia publicada de las 40 ha.", claves=["extension", "hectareas"])
a(p, "D", "Se ha excavado menos del 3 % del núcleo del yacimiento.", "ROJ", "n. 66", origen="FM-01 §1", claves=["excavado", "porcentaje"])

# ---------------------------------------------------------------- Guarrazar · 2 Basílica
p = "guarrazar-2"
a(p, "D", "La basílica está a unos 160 m del manantial y se excavó en extensión entre 2014 y 2018, en 320 m².", "RVE", "227", origen="FM-01 §5.2", claves=["basilica", "excavacion", "2014", "2018"])
a(p, "D", "De la basílica se conservan las zanjas de cimentación excavadas en el gneis y una plataforma de nivelación sobre una ladera con más de 2 m de desnivel.", "RVE", "229-231", origen="FM-01 §5.2", claves=["basilica", "cimientos", "zanjas", "nivelacion"])
a(p, "D", "Se conservan in situ cinco basas de mármol de morfologías distintas, reaprovechadas de edificios anteriores (spolia).", "RVE", "234", origen="FM-01 §5.2", claves=["basas", "marmol", "spolia", "columnas"])
a(p, "H", "Los materiales reaprovechados de la basílica procederían probablemente de templos paganos romanos.", "ROJ", "", origen="FM-01 §5.2",
  revisar="El relato dice «son piezas romanas reaprovechadas» como hecho; la ficha da como hipótesis su procedencia de templos romanos. Ajustar el relato o confirmar.", claves=["basas", "romanas", "reaprovechamiento"])
a(p, "D", "La solería tenía pavimento de mármol gris biselado sobre un statumen de cantos de cuarzo y un rudus de teja y cal, según la técnica que describe Vitruvio.", "RVE", "231-232", origen="FM-01 §5.2", claves=["suelo", "pavimento", "vitruvio", "marmol"])
a(p, "D", "La nave central medía 6,20 m entre ejes y la nave norte 4,25 m; el intercolumnio era de 2,85-2,88 m.", "RVE", "234", origen="FM-01 §5.2", claves=["naves", "medidas", "nave central"])
a(p, "I", "La basílica tenía tres naves y una anchura interior de 14,70 m.", "RVE", "234", atrib="Rojas, Vicente y Eger (2022)", origen="FM-01 §5.2", claves=["basilica", "tres naves", "anchura"])
a(p, "H", "La basílica pudo medir unos 29,40 m de longitud, con una nave central de 14-15 m de altura; la cabecera no se ha excavado.", "RVE", "238", origen="FM-01 §5.2",
  revisar="Validación n.º 1 del nodo. El relato añade «nueve columnas por fila», que no está en la ficha.", claves=["longitud", "altura", "cabecera", "estimacion"])
a(p, "D", "Hay una tumba infantil de lajas de toba entre la capilla lateral y la cabecera de la basílica.", "RVE", "234-235", origen="FM-01 §5.2",
  revisar="El relato habla de una capilla añadida en el lado norte, que no está en la ficha v0.3. Confirmar.", claves=["capilla", "tumba infantil"])
a(p, "I", "Las coronas eran ofrendas votivas para colgar sobre el altar, dedicadas a los mártires, y no coronas para ser llevadas por los reyes.", "MAR", "131-136", atrib="Martin (2025), siguiendo a Arce y Valverde", origen="FM-01 §3", claves=["coronas", "coronas de guarrazar", "votivas", "ofrenda", "altar", "funcion", "para que servian", "servian", "uso de las coronas"])
a(p, "D", "La corona de Suintila lleva la inscripción «+SU[IN]T[H]IL[A]NUS REX OFFE[RE]T» y la de Recesvinto «RECCESVINTHVS REX OFFERET».", "MAR", "136, 139, 147", origen="FM-01 §3", claves=["suintila", "recesvinto", "inscripcion", "corona"])
a(p, "D", "Entre los donantes de las ofrendas hay reyes y también eclesiásticos, como el abad Teodosio.", "MAR", "", origen="FM-01 §3", claves=["donantes", "teodosio", "abad"])
a(p, "I", "Si las coronas se donaron a esta basílica, el arco cronológico de las donaciones va de 621 a 672.", "RVE", "241-247", atrib="Rojas, Vicente y Eger (2022)", origen="FM-01 §4",
  revisar="El relato dice «Aquí, o en una iglesia muy parecida, colgaban las coronas». ¿Es correcto ese matiz?", claves=["coronas", "basilica", "cronologia"])
a(p, "D", "Tras su abandono, la basílica pasó por seis fases, hasta el expolio final hacia el siglo XI.", "RVE", "228-229", origen="FM-01 §5.2",
  revisar="El relato menciona casas construidas en su interior; fecharlas (finales del VIII-IX, según el Centro de Interpretación).", claves=["abandono", "expolio", "fases"])
a(p, "H", "Podría haber desaparecido más del 95 % de las estructuras de la basílica.", "RVE", "228", origen="FM-01 §5.2", claves=["expolio", "95"])

# ---------------------------------------------------------------- Guarrazar · 3 Hospital
p = "guarrazar-3"
a(p, "D", "El edificio en L tiene dos naves con dos estancias adosadas, un porche y un patio, y mide unos 20 × 20 m.", "RVE", "221", origen="FM-01 §5.3", claves=["edificio en l", "hospital", "xenodochium", "medidas"])
a(p, "D", "Las dos salas del edificio en L miden 15 × 5,5 m y 12,5 × 5 m, y sus muros, de piedra trabada con barro, tienen unos 70-80 cm de grosor.", "ENTG", "", origen="Documento del nodo (no está en FM-01 v0.3)",
  revisar="Datos del relato que no están en la ficha. Validación n.º 12: las cifras de muros se toman de las publicaciones (70-80 cm). Dar la referencia publicada.", claves=["salas", "muros", "medidas"])
a(p, "D", "Una escalera de cuatro escalones prueba que el edificio tenía una planta alta.", "RVE", "221", origen="FM-01 §5.3",
  revisar="Validación n.º 4: ICAC 2025 sitúa la escalera adosada a un espacio anexo.", claves=["escalera", "planta alta"])
a(p, "D", "El edificio tenía unos 290 m² útiles repartidos en dos pisos y casi 6 m de altura, y en una habitación aparecieron esquirlas de caliza de un taller de cantero.", "ENTG", "", origen="Documento del nodo (no está en FM-01 v0.3)",
  revisar="Datos del relato sin referencia en la ficha. Dar la fuente publicada o retirarlos.", claves=["superficie", "altura", "cantero"])
a(p, "I", "El edificio se construyó hacia mediados del siglo VII; se abandonó y expolió desde 711, se reocupó en la primera mitad del siglo VIII y la ocupación terminó con el derrumbe de la cubierta.", "ROJ", "", atrib="Rojas (2025)", origen="FM-01 §5.3", claves=["cronologia", "construccion", "reocupacion", "711"])
a(p, "D", "Bajo el muro medianero del edificio hay una tumba fundacional.", "MAR", "125", origen="FM-01 §5.3", revisar="Validación n.º 5: confirmar que puede contarse así.", claves=["tumba fundacional", "enterramiento"])
a(p, "D", "En el derrumbe del edificio apareció media cruz de piedra calada dentro de una corona de laurel, con una pata para fijarla en lo alto del tejado; se conserva en el Centro de Interpretación de Guadamur.", "PCI", "", origen="Documento del nodo (no está en FM-01 v0.3)",
  revisar="Fuente institucional (panel). Dar la referencia publicada; la orientación «mirando al este» del relato no tiene fuente.", claves=["cruz calada", "tejado", "laurel"])
a(p, "I", "Los excavadores interpretan el edificio como un xenodochium, un albergue u hospital de peregrinos, por sus salas diáfanas y su cercanía a la cabecera de la basílica.", "RVE", "239", atrib="Rojas, Vicente y Eger (2022); Rojas (2025)", origen="FM-01 §5.3 ⚖", claves=["xenodochium", "hospital", "peregrinos", "funcion", "para que servia", "hospital de peregrinos"])
a(p, "I", "Otra interpretación lo considera parte de un monasterio, porque la Regla de Isidoro pide que los monjes duerman en un dormitorio común junto a la iglesia.", "MAR", "125-126", atrib="Martin (2025)", origen="FM-01 §5.3 ⚖", claves=["monasterio", "monjes", "regla de isidoro", "debate"])
a(p, "D", "En el edificio en L apareció un relicario de óleos de piedra con tres compartimentos, entre restos expoliados en el siglo VIII.", "RVE", "244, n. 28", origen="FM-01 §5.3",
  revisar="FM-01: no es prueba de la función del edificio. No está en el relato; se incluye para el asistente.", claves=["relicario", "oleos"])

# ---------------------------------------------------------------- Guarrazar · 4 Manantial
p = "guarrazar-4"
a(p, "D", "El edificio del manantial es rectangular y mide unos 30 × 7 m (33 × 7 m según Martin).", "RVE", "222-225", origen="FM-01 §5.1", claves=["edificio del manantial", "delubrum", "medidas"])
a(p, "D", "Dentro hay al menos veinte fosas talladas en la roca, dispuestas por parejas a ambos lados de un pasillo central de 1 m; miden 55-62 cm de ancho por 2,15 m de largo y el agua brota dentro de ellas.", "ROJ", "", origen="FM-01 §5.1",
  revisar="Validación n.º 3: las Jornadas de 2026 dicen «al menos dieciséis». ¿Fosas o bañeras? ¿Cuántas?", claves=["banera", "baneras", "fosas", "agua"])
a(p, "D", "Se ha excavado alrededor de un tercio del edificio del manantial, y las bañeras se usaron hasta bien entrado el siglo VIII.", "MAR", "121-123", origen="FM-01 §5.1", claves=["excavado", "tercio", "siglo viii"])
a(p, "H", "Si todo el edificio tuvo el mismo uso, pudo haber más de cuarenta bañeras.", "ENTG", "", origen="Documento del nodo (deducción a partir de FM-01)",
  revisar="Deducción del relato, no está en la ficha. ¿Se mantiene?", claves=["mas de cuarenta"])
a(p, "D", "En 2025 se restauraron dos de las bañeras.", "PCI", "", origen="Documento del nodo (no está en FM-01 v0.3)", revisar="Dar la fuente (Jornadas o memoria de la intervención).", claves=["restauracion", "baneras"])
a(p, "I", "Los excavadores identifican el edificio con un delubrum, un recinto de agua para la purificación y la regeneración que describe San Isidoro (Etimologías XV, 4), y proponen baños buscando curación, como hoy en Lourdes.", "RVE", "225", atrib="Rojas, Vicente y Eger (2022); Rojas (2025)", origen="FM-01 §5.1 ⚖",
  revisar="Validación n.º 2: cita exacta de Isidoro e Ildefonso (escalones).", claves=["delubrum", "isidoro", "purificacion", "curacion", "lourdes", "que era", "para que servia", "edificio del manantial"])
a(p, "I", "Otra interpretación sostiene que el delubrum de Isidoro sería un baptisterio y que estas bañeras serían un anexo purificador o curativo de una iglesia cercana.", "MAR", "121-124", atrib="Martin (2025)", origen="FM-01 §5.1 ⚖", claves=["baptisterio", "debate", "delubrum", "edificio del manantial", "para que servia"])
a(p, "D", "Según los análisis de 2014, el agua del manantial carece de propiedades mineromedicinales.", "RVE", "225, n. 8", origen="FM-01 §1", claves=["agua", "analisis", "medicinal"])
a(p, "D", "Algunas fosas se reutilizaron después como tumbas.", "RVE", "225", origen="FM-01 §5.1", claves=["tumbas", "reutilizacion"])

# ---------------------------------------------------------------- Guarrazar · 5 Necrópolis
p = "guarrazar-5"
a(p, "H", "La necrópolis está alineada con el edificio del manantial, sobre un terraplén, y al final de ella hay una pequeña capilla funeraria; el conjunto forma un eje de unos 70 m.", "MAN", "", origen="FM-01 §4 [PISTA]",
  revisar="En FM-01 es una PISTA de la mesa redonda del MAN, pendiente de publicación. La cifra de 70 m no está en la ficha.", claves=["necropolis", "cementerio", "capilla", "eje"])
a(p, "D", "El epitafio del presbítero Crispín, fechado en 693, dice que eligió para enterrarse un «locum sacrum».", "RVE", "243", origen="FM-01 §4", claves=["crispin", "epitafio", "693", "lugar santo"])
a(p, "D", "El epitafio de Crispín adapta en parte el de la reina Reciberga, compuesto por Eugenio de Toledo.", "MAR", "140", origen="FM-01 §4 (Velázquez 2001)", claves=["crispin", "reciberga", "eugenio"])
a(p, "D", "José Amador de los Ríos excavó en abril de 1859 una capilla funeraria y una necrópolis en las «Huertas de Guarrazar».", "RVE", "218-219", origen="FM-01 §2",
  revisar="El panel del Museo de los Concilios habla de excavaciones en 1861 (validación de Concilios n.º 9).", claves=["amador de los rios", "1859", "capilla"])
a(p, "D", "Un dibujo de 1879 muestra la planta de la capilla, que parecía una cruz; en 2025 los arqueólogos la volvieron a localizar.", "ENTG", "", origen="FM-01 §9 (pendiente de publicación)",
  revisar="FM-01 lista como pendiente la publicación de la iglesia cruciforme. Dar la fuente antes de publicar.", claves=["capilla", "cruz", "1879", "2025"])
a(p, "D", "El tesoro estaba en dos escondites preparados en el extremo suroeste del cementerio, entre las tumbas y con su misma apariencia exterior, pero revestidos por dentro de opus signinum.", "MAR", "119", origen="FM-01 §2 (Balmaseda 2001)", claves=["escondites", "hallazgo", "tesoro", "cementerio"])
a(p, "D", "Junto a las coronas había cálices, una paloma de oro y una cruz procesional.", "ROJ", "n. 8", origen="FM-01 §2", claves=["calices", "paloma", "cruz procesional"])
a(p, "H", "Los escondites del tesoro pudieron ser pequeños depósitos de agua del manantial, reutilizados.", "ENTG", "", atrib="J. M. Rojas", origen="Documento del nodo (no está en FM-01 v0.3)",
  revisar="Propuesta de Rojas en entrevista. ¿Está publicada?", claves=["escondites", "depositos"])
a(p, "I", "La explicación más aceptada es que el tesoro se ocultó tras 711; es plausible, pero no demostrable (Arce, 2001).", "RVE", "245-246", atrib="La mayoría de los investigadores (Arce 2001)", origen="FM-01 §4 ⚖",
  revisar="Validación n.º 8: confirmar el matiz. La ficha recoge también otras hipótesis (escondites preparados con antelación; séquito de Rodrigo).", claves=["ocultacion", "711", "quien escondio"])
a(p, "D", "Los zafiros del tesoro proceden de Sri Lanka.", "MAR", "137", origen="FM-01 §3 (Cózar y Sapalski 2001)", claves=["zafiros", "sri lanka"])
a(p, "D", "En 2014 se halló un zafiro junto a la fuente, custodiado hoy en el Museo de Santa Cruz.", "ENTG", "", origen="FM-01 §3 [P]",
  revisar="FM-01 lo marca [P]: su vínculo con el tesoro procede de declaraciones públicas y falta el informe técnico. El relato afirma su origen en Sri Lanka: no publicar hasta tener el informe.", claves=["zafiro", "2014"])

# ---------------------------------------------------------------- Guarrazar · 6 Mirador
p = "guarrazar-6"
a(p, "D", "La prospección geofísica del cerro muestra un edificio de unos 35 × 50 m (1.750 m²) con estancias en torno a un patio; se han excavado unos 150 m², con muros de los siglos VII a X.", "RVE", "222, 239-240", origen="FM-01 §5.4",
  revisar="Método: geomagnético según Rojas, georradar según Martin (verificar en Eger 2007). El relato fecha la prospección en 2002 y un sondeo en 2015.", claves=["area 5", "cerro", "edificio", "prospeccion", "magnetometro"])
a(p, "D", "Christoph Eger hizo prospección y sondeos en Guarrazar entre 2002 y 2005.", "RVE", "219", origen="FM-01 §2", claves=["eger", "prospeccion"])
a(p, "H", "El gran edificio del cerro pudo ser un complejo monástico-palacial, e incluso una residencia regia; sus autores lo presentan como «tan sólo indicios».", "ROJ", "", origen="FM-01 §5.4 ⚖",
  revisar="La comparación con El Escorial del relato procede de la entrevista; ¿se mantiene?", claves=["palacio", "monasterio", "residencia regia", "area 5"])
a(p, "H", "Otra hipótesis propone que el edificio del cerro fuera un palacio o praetorium tardorromano de finales del siglo IV, con paralelo en Carranque.", "MAR", "128-129", origen="FM-01 §5.4 ⚖", claves=["praetorium", "romano", "carranque", "debate"])
a(p, "D", "El cerro estuvo habitado en la Edad del Cobre, hace más de cuatro mil años.", "PCI", "", origen="Documento del nodo (FM-01 dice «prehistoria reciente»)",
  revisar="Dar la referencia publicada de la ocupación calcolítica.", claves=["edad del cobre", "prehistoria", "cerro"])
a(p, "D", "En el Área 5 hay una mina de galena explotada en época andalusí y en el siglo XVII.", "ROJ", "", origen="FM-01 §1", claves=["mina", "galena", "plomo"])
a(p, "H", "El nombre de Guarrazar procedería del árabe wadi + rasas, «valle del plomo», según Amador de los Ríos.", "ROJ", "n. 37", origen="FM-01 §1",
  revisar="Las VII Jornadas lo dan por seguro; el panel, como posibilidad. ¿Hay fuente filológica?", claves=["nombre", "etimologia", "valle del plomo", "arabe"])
a(p, "H", "Cerca del cerro se han excavado entre 2022 y 2026 unos baños con una pila de agua y dos pequeñas pilas para lavarse los pies; por sus paralelos podrían ser romanos, de los siglos III o IV, reformados en época visigoda.", "ENTG", "", origen="Documento del nodo (campañas 2021-2026, pendientes en FM-01)",
  revisar="FM-01 lista las campañas de 2021-2026 como pendientes. Dar la fuente.", claves=["banos", "pilas", "romano"])
a(p, "D", "Un georradar de 2021 ha detectado otro gran edificio al este de la basílica.", "ENTG", "", origen="Documento del nodo",
  revisar="Validación n.º 9. Dar la fuente; la idea de «otros hospitales» solo está en un vídeo y no se usa.", claves=["georradar", "2021", "edificio"])

# ---------------------------------------------------------------- Centro de Interpretación (Guadamur)
p = "centro-guarrazar"
a(p, "D", "En el cerro al norte del manantial han aparecido un hacha pulimentada, un punzón de hueso y un fragmento de vaso campaniforme de la Edad del Cobre.", "PCI", "", origen="Paneles del Centro", revisar="Fuente institucional; dar la referencia publicada.", claves=["edad del cobre", "campaniforme", "vitrina"])
a(p, "D", "En Guarrazar apareció cerámica de lujo fabricada cerca de Nápoles, de al menos el siglo IV a. C.", "PCI", "", origen="Paneles del Centro", revisar="Fuente institucional; dar la referencia publicada.", claves=["ceramica", "napoles", "siglo iv"])
a(p, "H", "La cerámica de lujo del siglo IV a. C. quizá se ofrecía en un santuario junto a la fuente; en época romana hubo un posible santuario precristiano sin estructuras asignables.", "RVE", "240-241", origen="FM-01 §1", claves=["santuario precristiano", "romano"])
a(p, "D", "De época romana se conservan los dedos del pie de una gran estatua de mármol, un fragmento de cerámica de barniz rojo traída de Italia y una figurita de barro con rostro de mujer.", "PCI", "", origen="Paneles del Centro", revisar="Fuente institucional; dar la referencia publicada.", claves=["romano", "estatua", "sigillata"])
a(p, "D", "De la basílica se exponen el cancel de mármol, la barrotera que lo sujetaba, una columna de mármol veteado, una columnilla y el salmer de una ventana con arcos de herradura gemelos.", "PCI", "", origen="Paneles del Centro; FM-01 §5.2 (materiales en posición secundaria)", claves=["cancel", "salmer", "basilica", "piezas"])
a(p, "D", "Un fragmento de friso lleva grabado el número XIX para indicar su posición, con la V escrita al revés.", "PCI", "", origen="Paneles del Centro", revisar="Fuente institucional; dar la referencia publicada.", claves=["friso", "numero", "cantero"])
a(p, "D", "Del edificio en L proceden una llave, un fragmento de anillo de plata y unas varillas de bronce.", "PCI", "", origen="Paneles del Centro",
  revisar="El relato añade que las varillas «quizá» pertenecieron a un laboratorio farmacéutico: ¿se mantiene como hipótesis?", claves=["llave", "anillo", "varillas", "hospital"])
a(p, "D", "Tras 711 el santuario se abandonó, pero el lugar siguió habitado: entre finales del siglo VIII y el IX se construyeron casas dentro de la basílica.", "PCI", "", origen="Paneles del Centro; FM-01 §5.2", revisar="Dar la referencia publicada de la cronología de las casas.", claves=["711", "casas", "basilica", "andalusi"])
a(p, "D", "Entre las monedas expuestas hay un felús de los primeros gobernadores andalusíes y un fragmento de dírham de plata de la taifa de Toledo, del siglo XI, recortado; un triente de Chindasvinto acuñado en Toledo se muestra como referencia.", "PCI", "", origen="Paneles del Centro", revisar="Fuente institucional; dar la referencia publicada.", claves=["monedas", "felus", "dirham", "chindasvinto"])
a(p, "D", "La escultura de Guarrazar es de caliza micrítica, probablemente de la cantera del arroyo de La Rosa, con predominio de motivos vegetales.", "RVE", "237-238", origen="FM-01 §6 (Balmaseda 2006)", claves=["escultura", "caliza", "motivos vegetales"])
a(p, "I", "Las coronas, la cruz y la escultura comparten motivos (racimos, capullos, trifolias, rosetas y lirios), lo que apunta a talleres de orfebrería y cantería con diseños análogos.", "RVE", "241-245", atrib="Rojas, Vicente y Eger (2022); Balmaseda (2001)", origen="FM-01 §6", claves=["motivos", "talleres", "orfebreria", "escultura"])

# ---------------------------------------------------------------- Vega Baja · 1 Cristo de la Vega
p = "vegabaja-1"
a(p, "D", "La basílica de Santa Leocadia estaba en el suburbio, junto a la tumba de la mártir, y en ella se celebraron los concilios IV (633), V (636), VI (638) y XVII (694).", "OLMO", "", origen="FM-02 §3.1", claves=["santa leocadia", "basilica", "concilios", "martir"])
a(p, "T", "Según la tradición, la ermita del Cristo de la Vega ocupa el lugar de la tumba de Leocadia, la mártir patrona de Toledo.", "TV", "", origen="Documento del nodo", revisar="Comprobar que la identificación del lugar se presenta como tradición.", claves=["leocadia", "tumba", "cristo de la vega", "patrona"])
a(p, "D", "El rey Sisebuto hizo obras en la basílica de Santa Leocadia en 618, según Eulogio.", "OLMO", "", origen="FM-02 §3.1", claves=["sisebuto", "618", "eulogio"])
a(p, "D", "Junto a la basílica hubo un monasterio, con el abad Valderedo, y en ella se enterraron los obispos Eugenio II, Ildefonso y Julián.", "OLMO", "", origen="FM-02 §3.1", claves=["monasterio", "obispos", "ildefonso", "julian", "eugenio"])
a(p, "D", "Entre 1972 y 1975 Palol excavó un edificio sobre suelo virgen, con muros de unos 2 m y contrafuertes de 1,50 × 1,20 m separados entre 3,50 y 4 m.", "GD", "150-155", origen="FM-02 §3.1", claves=["palol", "excavacion", "contrafuertes"])
a(p, "I", "Ese edificio se construyó con sillares reutilizados del circo romano.", "GD", "155-156", atrib="Gurt y Diarte (2012)", origen="FM-02 §3.1", claves=["circo", "sillares", "reutilizacion"])
a(p, "H", "El edificio excavado por Palol sería el martyrium original de Leocadia, anterior a la basílica de Sisebuto.", "GD", "157-161", origen="FM-02 §3.1", revisar="Validación n.º 5: comprobar que no hay revisión posterior.", claves=["martyrium", "mausoleo", "leocadia"])
a(p, "D", "En 1956 se halló cerca un credo epigráfico, hoy en el Museo de los Concilios.", "OLMO", "", origen="FM-02 §3.1", claves=["credo", "1956", "museo de los concilios"])
a(p, "D", "El santuario estaba en ruina en 1121, se restauró con un convento agustino en 1162 y la ermita fue destruida por las tropas francesas.", "VP", "", origen="FM-02 §3.1", claves=["ermita", "1121", "1162", "franceses"])
a(p, "T", "La leyenda «A buen juez, mejor testigo», recogida por Zorrilla, explica el brazo desclavado del Cristo de la Vega.", "TV", "", origen="FM-02 §3.1 [T]",
  revisar="En FM-02 procede de una transcripción de documental (PISTA). Dar una fuente publicada.", claves=["leyenda", "zorrilla", "buen juez", "brazo"])

a(p, "I", "Junto al Cristo de la Vega pudo haber un panteón o mausoleo para sepulturas privilegiadas, un edificio con contrafuertes exteriores como el panteón-palacio de Los Hitos.", "MBCS", "17", atrib="Morín, Barroso, Carrobles y Sánchez (2015)", origen="Material de Urbs Regia (P. Tormo, 22/11/2026).",
  revisar="Relacionar con el edificio de contrafuertes excavado por Palol y con la hipótesis del martyrium (validación n.º 5).", claves=["mausoleo", "panteon", "contrafuertes", "los hitos", "sepulturas"])
# ---------------------------------------------------------------- Vega Baja · 2 Gran avenida
p = "vegabaja-2"
a(p, "I", "El suburbio se organizó según un plan jerarquizado y regular, con su máximo desarrollo entre la segunda mitad del siglo VI y mediados del VII.", "OLMO", "", atrib="Olmo Enciso (2009)", origen="FM-02 §4", claves=["urbanismo", "plan", "calles", "siglo vi"])
a(p, "D", "Una de las calzadas excavadas mide 6 m de ancho y discurre junto a un edificio de más de 50 × 25 m.", "OLMO", "", origen="FM-02 §4", claves=["calzada", "6 metros", "edificio"])
a(p, "D", "El georradar de 2020 detectó una calzada de hasta 8,40 m de ancho, con piedras de borde y posibles rodadas de carro.", "GRP", "", origen="Documento del nodo (georradar, pendiente de lectura en FM-02)",
  revisar="Validación n.º 7: es una anomalía sin excavar. Confirmar que puede contarse así.", claves=["georradar", "calzada", "8,40", "rodadas"])
a(p, "H", "La gran vía uniría la parte alta de la ciudad, por la Puerta del Cambrón, con la basílica de Santa Leocadia y el entorno donde se cree que estuvo el palacio.", "ENTV", "", origen="Documento del nodo",
  revisar="Hipótesis de los investigadores; dar la fuente publicada.", claves=["puerta del cambron", "trazado", "palacio"])
a(p, "D", "Las calzadas documentadas tienen piedras de borde y un firme de cantos; los encachados de piedra documentados son de los patios, no de las calles.", "OLMO", "", origen="FM-02 §8 (errores: «calles enlosadas»)", claves=["calzadas", "firme", "enlosadas"])

# ---------------------------------------------------------------- Vega Baja · 3 Casas con patio
p = "vegabaja-3"
a(p, "D", "El barrio tenía manzanas con patios y viviendas de hasta unos 400 m².", "OLMO", "", origen="FM-02 §4", claves=["casas", "patio", "400"])
a(p, "D", "Algunos edificios eran mucho mayores: uno de unos 700 m² con cuatro alas en torno a un patio con cisterna y otro de unos 900 m².", "OLMO", "", origen="Documento del nodo",
  revisar="Validación n.º 8: confirmar las cifras en Gallego et al. 2009.", claves=["edificios", "700", "900", "cisterna"])
a(p, "D", "Se construía nivelando el terreno y levantando zócalos de mampostería de gneis, granito o cantos trabados con barro, de 0,60-0,80 m, con alzados de tapial o adobe, tejas curvas con marcas serpentiformes y suelos de arcilla o cal.", "OLMO", "", origen="FM-02 §4 (RGL 2009: 64-66)",
  revisar="En FM-02 la fuente es el informe inédito RGL 2009, que no puede citarse sin permiso. El relato dice 60-90 cm. Buscar fuente publicada o pedir autorización.", claves=["construccion", "zocalo", "tapial", "adobe", "tejas"])
a(p, "D", "En el barrio se han hallado ánforas y spatheia norteafricanos, vidrio, ponderales y objetos de hueso.", "OLMO", "", origen="FM-02 §4", claves=["anforas", "vidrio", "hueso", "comercio"])
a(p, "H", "El suburbio pudo tener una zona comercial y artesanal.", "OLMO", "", origen="FM-02 §4",
  revisar="El relato menciona pesas, un gancho de balanza y un posible taller de vidrio (PISTA de documental en FM-02). Dar la fuente.", claves=["comercio", "artesania", "taller"])
a(p, "D", "En las excavaciones anteriores a 2009 apareció un tesorillo de 30 tremises, de Leovigildo a Chintila, con un contenido de oro decreciente.", "OLMO", "", origen="FM-02 §4", claves=["tesorillo", "tremises", "monedas", "leovigildo", "chintila"])
a(p, "D", "El entramado del suburbio siguió habitado tras 711.", "IZQ", "", origen="FM-02 §6", claves=["711", "andalusi", "continuidad"])
a(p, "D", "Hubo áreas de extracción de áridos reutilizadas como basureros.", "OLMO", "", origen="FM-02 §4 (RGL 2009)",
  revisar="Fuente inédita (RGL 2009) en la ficha. El relato añade que algunas casas se abandonaron a finales del siglo VII: dar la fuente.", claves=["basureros", "graveras", "abandono"])

# ---------------------------------------------------------------- Vega Baja · 4 Palacio
p = "vegabaja-4"
a(p, "D", "Leovigildo adoptó trono y vestiduras reales (Isidoro, Historia Gothorum 51), acuñó moneda propia y fundó Recópolis.", "OLMO", "", origen="FM-02 §2", claves=["leovigildo", "trono", "moneda", "recopolis"])
a(p, "I", "Los reyes visigodos practicaron una aemulatio imperii, la imitación del ceremonial de los emperadores.", "OLMO", "", atrib="Olmo Enciso (2009)", origen="FM-02 §2", claves=["ceremonial", "emperadores", "imitacion"])
a(p, "D", "El praetorium se cita en el VI Concilio de Toledo (638), y la iglesia pretoriense de los Santos Apóstoles acogió los concilios VIII, XII, XIII, XV y XVI.", "OLMO", "", origen="FM-02 §3.2", claves=["praetorium", "pretoriense", "palacio", "concilios"])
a(p, "D", "Según Julián de Toledo, el rey Wamba fue ungido en la iglesia pretoriense en 672.", "JUL", "", origen="Documento del nodo", revisar="Validación n.º 3: comprobar el pasaje.", claves=["wamba", "uncion", "672"])
a(p, "I", "La localización del palacio sigue en debate: unos lo sitúan en la Vega Baja y otros en la parte alta de la ciudad.", "GD", "", atrib="Olmo Enciso (2009); Barroso et al. (2011); Gurt y Diarte (2012)", origen="FM-02 §3.2 ⚖", claves=["palacio", "palacio de los reyes", "palacio real", "donde estaba el palacio", "debate", "localizacion"])
a(p, "D", "En la calle San Pedro el Verde, 25, se documentó en 2001 y 2003 un gran edificio.", "OLMO", "", origen="FM-02 §3.2",
  revisar="El relato da más de 900 m², muros de 1,50 m y cimientos de más de 2 m: no están en la ficha. Dar la fuente.", claves=["san pedro el verde", "edificio"])
a(p, "I", "Sus excavadores propusieron que el edificio de San Pedro el Verde fuera la iglesia pretoriense; otros autores consideran la identificación «algo forzada» o la aceptan «con muchas reservas».", "GD", "", atrib="Rojas y Gómez (2009); Olmo Enciso (2009); Gurt y Diarte (2012)", origen="FM-02 §3.2 ⚖", claves=["iglesia pretoriense", "identificacion", "debate"])
a(p, "D", "En la Fábrica de Armas se halló en 1923 una villa romana del siglo IV con mosaicos.", "VP", "", origen="FM-02 §1", claves=["villa", "fabrica de armas", "mosaicos", "1923"])

a(p, "I", "Otros autores proponen situar el palacio y la iglesia de los Santos Apóstoles dentro de la muralla, donde después estuvo el alcázar islámico y medieval, por la escultura recuperada en la puerta-puente de Alcántara y por criterios topográficos.", "MBCS", "17", atrib="Morín, Barroso, Carrobles y Sánchez (2015)", origen="Material de Urbs Regia (P. Tormo, 22/11/2026).",
  revisar="Contradice la propuesta de Rojas de un pretorio en la Vega Baja (entrevista F19): presentar ambas como hipótesis. Decisión de criterio para Urbs Regia.", claves=["palacio", "pretorio", "alcazar", "intramuros", "puerta de alcantara", "donde estaba el palacio"])
# ---------------------------------------------------------------- Vega Baja · 5 Mirador
p = "vegabaja-5"
a(p, "D", "La Vega Baja es la llanura aluvial al norte y noroeste del peñón de Toledo, de más de 50 ha.", "TV", "", origen="FM-02 §1", revisar="Validación n.º 2: Rojas da más de 70 o 100 ha. Buscar cifra publicada.", claves=["vega baja", "llanura", "hectareas"])
a(p, "D", "El circo romano se construyó entre los años 50-60 d. C. y la época de Vespasiano, y mide 423,10 × 100,80 m.", "GD", "151", origen="FM-02 §1",
  revisar="El relato dice «en el siglo I»: correcto, pero conviene precisarlo.", claves=["circo", "romano", "carreras"])
a(p, "I", "El circo tenía capacidad para unos 13.000 espectadores.", "VP", "", atrib="Villa y Peris (2009)", origen="FM-02 §1", claves=["circo", "espectadores"])
a(p, "D", "El circo seguía en uso hacia el año 400, según el marfil de Hipólito.", "OLMO", "", origen="FM-02 §1", claves=["circo", "400", "marfil"])
a(p, "D", "La Vega fue después cementerio musulmán (maqbara), zona de ventas y de recreo en el siglo XVI, descansadero de ganado de la Mesta y sede de la Fábrica de Armas, cerrada en 1996.", "VP", "", origen="FM-02 §6", claves=["maqbara", "mesta", "fabrica de armas", "1996"])
a(p, "D", "La Vega Baja fue declarada definitivamente Bien de Interés Cultural el 18 de junio de 2008.", "PER", "", origen="FM-02 §7", claves=["bic", "2008", "proteccion"])
a(p, "D", "En 2020 se prospectó con georradar parte de la Vega Baja; el estudio lo publicó la JCCM en 2023.", "GRP", "", origen="FM-02 §5",
  revisar="El relato da «más de 8 hectáreas»: dar la cifra publicada.", claves=["georradar", "2020", "prospeccion"])

# ---------------------------------------------------------------- Concilios · 1
p = "concilios-1"
a(p, "D", "La iglesia de San Román está en una de las partes más altas de Toledo.", "CKG", "983", origen="FM-03 §1", claves=["san roman", "situacion"])
a(p, "D", "La torre de San Román, inspirada en los alminares califales, se construyó exenta a finales del siglo XIII o principios del XIV y se unió a la cabecera en el XVI.", "CKG", "985", origen="FM-03 §2", claves=["torre", "alminar", "san roman"])
a(p, "D", "San Román aparece como parroquia a principios del siglo XII, y la fábrica actual es la consagrada por el arzobispo Jiménez de Rada en 1221.", "CKG", "983", origen="FM-03 §2", claves=["1221", "jimenez de rada", "parroquia"])
a(p, "H", "El edificio pudo tener un origen visigodo, y pudo usarse como mezquita.", "CKG", "983", origen="FM-03 §2", claves=["origen visigodo", "mezquita", "hipotesis"])
a(p, "D", "El museo se creó en 1969 como filial del Museo de Santa Cruz y abrió al público en 1971; su creadora y primera directora fue Matilde Revuelta Tubino.", "CKG", "983-985", origen="FM-03 §3", claves=["museo", "1971", "matilde revuelta"])
a(p, "D", "El museo se renovó en 2014, a cargo de la JCCM y del Museo de Santa Cruz.", "CKG", "985-987", origen="FM-03 §3", claves=["renovacion", "2014"])
a(p, "D", "Ningún concilio de Toledo se celebró en San Román: se reunieron en otras iglesias, como Santa Leocadia o la iglesia pretoriense.", "OLMO", "", origen="Documento del nodo; FM-02 §3",
  revisar="Validación n.º 2 del nodo: confirmar la cifra (dieciocho concilios) y la redacción.", claves=["concilios", "donde", "santa leocadia", "pretoriense"])
a(p, "D", "El museo reúne piezas de la Vega Baja, Guarrazar, Carranque, Carpio de Tajo, Malpica de Tajo y otros lugares de la provincia.", "CKG", "985", origen="FM-03 §3 y §5", claves=["coleccion", "procedencia", "provincia"])

# ---------------------------------------------------------------- Concilios · 2
p = "concilios-2"
a(p, "D", "San Román tiene planta basilical de tres naves, con arcos de herradura califal de dovelas alternas enmarcadas por alfiz, sobre columnas de fuste romano adosadas a pilares de ladrillo, y una galería encima.", "CKG", "983", origen="FM-03 §2", claves=["naves", "arcos de herradura", "alfiz", "arquitectura"])
a(p, "D", "Hay doce capiteles reutilizados de tamaños distintos, algunos de ellos visigodos.", "FOLL", "", origen="FM-03 §2", revisar="Validación n.º 5: identificar cuáles son visigodos.", claves=["capiteles", "visigodos", "reutilizados"])
a(p, "D", "Las pinturas murales son del siglo XIII, se descubrieron en la restauración de los años cuarenta del siglo XX y son románicas con motivos de raíz islámica.", "CKG", "985", origen="FM-03 §2",
  revisar="Validación n.º 6: unificar la lista de temas con el museo.", claves=["pinturas", "siglo xiii", "romanico"])
a(p, "D", "Alonso de Covarrubias reformó la capilla mayor a partir de 1552, con una cúpula sobre pechinas.", "CKG", "983", origen="FM-03 §2", claves=["covarrubias", "1552", "cupula"])
a(p, "H", "La cripta descubierta en 1968 bajo la capilla mayor se ha identificado como un ábside visigodo; otras fuentes la atribuyen a época romana.", "CKG", "983", origen="FM-03 §2",
  revisar="Validación n.º 4: pedir el informe de la restauración de 1968.", claves=["cripta", "1968", "absido", "hipotesis"])

# ---------------------------------------------------------------- Concilios · 3
p = "concilios-3"
a(p, "D", "En el III Concilio de Toledo (589), el rey Recaredo y los obispos de su Iglesia abandonaron el cristianismo homoiano, llamado habitualmente «arriano», y aceptaron la fe católica.", "SOFIA", "", origen="Documento del nodo",
  revisar="Validación n.º 3: dato general; confirmar la terminología con Urbs Regia y dar una referencia bibliográfica.", claves=["iii concilio", "589", "recaredo", "arrianismo", "conversion"])
a(p, "D", "Se conservan dos fragmentos de un tablero de piedra con un credo, hallados cerca de la basílica de Santa Leocadia, orlados con una greca de palmas.", "CKG", "987", origen="FM-03 §4.2",
  revisar="El relato describe «una orla con escamas y una franja con veneras y palmas»; contrastar con la pieza.", claves=["credo", "fragmentos", "piedra", "santa leocadia"])
a(p, "D", "El folleto del museo data el credo epigráfico en el siglo VII; se publicó en Jorge Aragoneses (1957).", "FOLL", "", origen="FM-03 §4.2", claves=["credo", "siglo vii", "1957"])
a(p, "D", "La cartela del museo identifica el texto como el «símbolo de los apóstoles»; otras publicaciones hablan del credo de Nicea en versión hispana.", "CART", "", origen="Documento del nodo; FM-03 §4.2",
  revisar="Validación n.º 1, urgente: consultar Jorge Aragoneses (1957) o al museo. Bloquea esta parada.", claves=["credo", "nicea", "simbolo de los apostoles", "debate"])

a(p, "D", "El canon XVI del III Concilio de Toledo (589) ordena que los obispos, junto con los jueces, destruyan los ídolos y que los señores prohíban la idolatría a sus siervos.", "LQMT", "128", origen="Material de Urbs Regia (P. Tormo, 22/11/2026).", claves=["idolos", "idolatria", "paganismo", "canon", "iii concilio"])
a(p, "D", "El XII Concilio de Toledo (681) dedica su canon XI a los adoradores de ídolos.", "LQMT", "128", origen="Material de Urbs Regia (P. Tormo, 22/11/2026).", claves=["idolos", "paganismo", "xii concilio", "681", "canon"])
a(p, "D", "El canon II del XVI Concilio de Toledo (693) condena también a quienes veneran las piedras, encienden antorchas y adoran las fuentes y los árboles.", "LQMT", "128", origen="Material de Urbs Regia (P. Tormo, 22/11/2026).",
  revisar="Puede enlazarse con el culto al manantial de Guarrazar (edificio del manantial / delubrum), pero el artículo no lo hace: decisión de criterio para Urbs Regia.", claves=["fuentes", "arboles", "piedras", "paganismo", "xvi concilio", "693", "culto"])
# ---------------------------------------------------------------- Concilios · 4
p = "concilios-4"
a(p, "D", "En la villa de El Saucedo (Talavera la Nueva), una sala se transformó en iglesia con baptisterio en el siglo VI.", "CKG", "987", origen="FM-03 §4.1", claves=["el saucedo", "villa", "baptisterio"])
a(p, "D", "En Carranque apareció en 2009 una tapa de sarcófago con el ciclo de Jonás, reutilizada como cubierta de una tumba de la necrópolis visigoda.", "CKG", "988", origen="FM-03 §4.4", claves=["carranque", "sarcofago", "jonas"])
a(p, "D", "La placa de Las Tamujas (Malpica de Tajo) es uno de los escasos relieves figurados visigodos.", "CKG", "987", origen="FM-03 §4.2", claves=["tamujas", "placa", "relieve", "figura"])
a(p, "H", "Para la figura de la placa de Las Tamujas se han propuesto varias identificaciones, entre ellas un eclesiástico que bendice o predica y Cristo en su bautismo.", "FOLL", "", origen="FM-03 §4.2",
  revisar="El relato sigue la cartela (divinidad pagana, santo predicando, Cristo en el bautismo); el folleto da otra lista. Unificar.", claves=["tamujas", "iconografia", "hipotesis"])
a(p, "D", "Las piezas litúrgicas (canceles, tenantes de altar con hueco para reliquias y placas-nicho) proceden sobre todo de Toledo capital.", "CKG", "987-988", origen="FM-03 §4.3", claves=["canceles", "altar", "reliquias", "placas-nicho"])
a(p, "D", "Abundan los fragmentos escultóricos reutilizados en fachadas, murallas y viviendas, con motivos geométricos y vegetales tallados a bisel.", "CKG", "988", origen="FM-03 §4.3", claves=["escultura", "bisel", "reutilizacion"])
a(p, "D", "El museo expone una reproducción exacta de la pilastra de El Salvador, con escenas de la vida de Cristo.", "CKG", "988", origen="FM-03 §4.3", claves=["pilastra", "el salvador", "reproduccion"])
a(p, "D", "La pileta de alabastro procede del Cristo de la Luz: era un capitel visigodo del siglo VII con hojas de acanto, transformado después en recipiente.", "CART", "", origen="Documento del nodo", revisar="Fuente institucional (cartela). Dar la referencia publicada.", claves=["pileta", "cristo de la luz", "capitel"])
a(p, "D", "El museo se organiza en ocho ámbitos temáticos, de la Hispania tardorromana a la liturgia, con una sala final dedicada a la Vega Baja.", "CKG", "987-990", origen="FM-03 §4",
  revisar="El relato de esta parada dice «cuatro escenas» pero solo nombra tres: regrabar o completar (pendiente con Rojas).", claves=["ambitos", "recorrido", "museo"])

# ---------------------------------------------------------------- Concilios · 5
p = "concilios-5"
a(p, "D", "La sala de la Vega Baja reúne frisos, cimacios, capiteles y columnas de pórfido, y en hueso una píxide, dados, fichas de juego, cajitas y placas.", "CKG", "990", origen="FM-03 §4.6", claves=["vega baja", "sala", "hueso", "dados"])
a(p, "D", "Se expone un fragmento de bote de hueso con dos figuras junto a un pozo.", "FOLL", "", origen="FM-03 §4.6", claves=["bote", "hueso", "pozo"])
a(p, "H", "La escena del bote de hueso se ha identificado con Jesús y la samaritana.", "FOLL", "", origen="FM-03 §4.6", claves=["samaritana", "iconografia"])
a(p, "D", "En la vitrina hay una cruz de bronce dorado del siglo VII, un adorno de oro y vidrio, una hebilla en forma de lira, una llave y un objeto de bronce de uso discutido (quizá un osculatorio).", "CART", "", origen="Documento del nodo (cartelas fotografiadas en 2026)", revisar="Fuente institucional (cartela).", claves=["cruz", "hebilla", "llave", "osculatorio"])
a(p, "D", "Las monedas de oro de Suintila y Sisenando de la vitrina se hallaron, según su cartela, «cerca de Toledo», no necesariamente en la Vega Baja.", "CART", "", origen="Documento del nodo", claves=["monedas", "suintila", "sisenando"])

# ---------------------------------------------------------------- Concilios · 6
p = "concilios-6"
a(p, "D", "El museo expone reproducciones de las coronas del tesoro de Guarrazar.", "CKG", "990", origen="FM-03 §4.5", claves=["coronas", "reproducciones", "guarrazar"])
a(p, "I", "Las coronas de Guarrazar eran ofrendas votivas para colgar sobre el altar, no coronas para ceñir.", "MAR", "131-136", atrib="Martin (2025), siguiendo a Arce y Valverde", origen="FM-01 §3", claves=["coronas", "coronas de guarrazar", "votivas", "ofrenda", "para que servian", "servian", "funcion"])
a(p, "D", "La corona de Suintila, conservada en la Real Armería, fue robada en 1921 y no se ha recuperado.", "MAR", "", origen="FM-01 §2 (Balmaseda 1995)", claves=["suintila", "robo", "1921"])
a(p, "D", "Francia devolvió parte del tesoro: seis coronas, cuatro cruces y colgantes.", "RVE", "219", origen="FM-01 §2",
  revisar="El relato da 1941 (llegada) y 1943 (MAN), que en FM-01 son PISTA de la mesa redonda del MAN.", claves=["devolucion", "francia", "1941"])
a(p, "D", "Entre las ofrendas del tesoro hay una corona ofrecida por el abad Teodosio y la cruz de Lucecio.", "MAR", "136, 139, 147", origen="FM-01 §3", claves=["teodosio", "lucecio", "ofrendas"])
a(p, "I", "Las coronas regias cuelgan con una cruz: para J. M. Rojas expresa que el rey reina porque hay un rey por encima de él, Cristo.", "ENTC", "", atrib="J. M. Rojas", origen="Documento del nodo (entrevista)",
  revisar="Interpretación expresada en entrevista. ¿Está publicada? ¿Se mantiene?", claves=["cruz", "simbolo", "realeza"])

# ---------------------------------------------------------------- Ruta 1 · Territorio
p = "territorio-1"
a(p, "D", "Guarrazar está en una vaguada con manantiales permanentes, junto a dos vaguadas con buena tierra de huerta.", "PTER", "", origen="Ficha de la parada", claves=["agua", "manantiales", "huertas"])
a(p, "D", "En un perímetro de más de 40 hectáreas hay restos desde la Edad del Cobre hasta la Edad Media.", "PTER", "", origen="Ficha de la parada", claves=["perimetro", "40 hectareas", "restos"])
a(p, "I", "El agua, la tierra fértil y la cercanía de filones de mineral explican la concentración de restos en Guarrazar.", "JOR7", "", atrib="J. M. Rojas", origen="Ficha de la parada", claves=["agua", "ocupacion", "por que aqui"])
a(p, "D", "El acueducto y el pozo de la Huerta Larga regaron huertas hasta hace unas tres décadas, y la Casa de Higinio fue una explotación familiar de huerta hasta la segunda mitad del siglo XX.", "JOR7", "", origen="Ficha de la parada",
  revisar="Cronología del acueducto por confirmar.", claves=["huerta larga", "acueducto", "casa de higinio"])

p = "territorio-2"
a(p, "D", "El subsuelo de Guadamur tiene filones de galena argentífera, de la que se obtienen plomo y plata, y de grafito.", "PTER", "", origen="Ficha de la parada", claves=["galena", "plomo", "plata", "grafito"])
a(p, "D", "A finales del siglo XIX se registraron en Guadamur 16 concesiones para explotar minas de plomo.", "PTER", "", origen="Ficha de la parada", claves=["concesiones", "plomo", "siglo xix"])
a(p, "H", "El nombre de Guarrazar derivaría de un nombre árabe que significa «valle del plomo».", "ROJ", "n. 37", origen="FM-01 §1",
  revisar="Las VII Jornadas lo dan por seguro; el panel, como posibilidad. ¿Hay fuente filológica?", claves=["valle del plomo", "etimologia", "nombre"])
a(p, "H", "La minería pudo ser la actividad principal de la zona en época andalusí, lo que explicaría la continuidad de la ocupación.", "JOR7", "", origen="Ficha de la parada", claves=["mineria", "andalusi"])

p = "territorio-3"
a(p, "D", "Al noreste del yacimiento estaba el coto minero de Guadamur, dedicado a la explotación de grafito.", "PTER", "", origen="Ficha de la parada", claves=["coto minero", "grafito"])
a(p, "D", "A principios del siglo XX se habían registrado en Guadamur 19 concesiones para explotar grafito.", "PTER", "", origen="Ficha de la parada", claves=["concesiones", "grafito", "siglo xx"])

p = "territorio-4"
a(p, "D", "Los molinos de La Casquilla y de Alegre, en el arroyo Guajaraz, son testigos de la actividad «industrial» de la zona en la Edad Moderna y parte de la Contemporánea.", "PTER", "", origen="Ficha de la parada",
  revisar="Cronología de construcción por confirmar.", claves=["molinos", "guajaraz", "casquilla"])
a(p, "D", "Guarrazar está en la vaguada donde confluyen el camino de Toledo y el del Molino de la Casquilla.", "RVE", "217", origen="FM-01 §1", claves=["caminos", "casquilla", "toledo"])

p = "territorio-5"
a(p, "D", "El molino de Alegre está en el arroyo Guajaraz, en término de Argés.", "PTER", "", origen="Ficha de la parada", claves=["molino de alegre", "arges"])

p = "territorio-6"
a(p, "D", "La Torre de Cervatos y los castillos de Guadamur y Polán son las tres fortalezas del territorio; según el panel, controlaban sobre todo las vías de comunicación.", "PTER", "", origen="Ficha de la parada",
  revisar="Falta fuente científica para la cronología de Cervatos.", claves=["cervatos", "fortalezas", "caminos"])
a(p, "I", "El camino de Toledo al puerto Marchés se identifica con la calzada romana de Toledo a Mérida.", "PTER", "", atrib="Panel del yacimiento", origen="Ficha de la parada", claves=["calzada", "merida", "puerto marches"])
a(p, "D", "El trazado más corto entre Mérida y Toledo pasaba por Cervatos (mapa de Coello, 1889).", "RVE", "217", origen="FM-01 §1", claves=["cervatos", "coello", "merida"])

p = "territorio-7"
a(p, "D", "Al sur de Guadamur estaban las minas de galena argentífera de La Trinidad, entre las explotaciones más importantes del término.", "PTER", "", origen="Ficha de la parada",
  revisar="Fechas de actividad por confirmar.", claves=["la trinidad", "minas", "galena"])

p = "territorio-8"
a(p, "D", "Junto a Polán pasaba uno de los caminos que salían del paso de Portusa hacia Noez, Cuerva, Las Ventas y el puerto del Milagro.", "JOR7", "", origen="Ficha de la parada",
  revisar="Falta fuente científica para la cronología del castillo.", claves=["polan", "castillo", "caminos", "portusa"])

p = "territorio-9"
a(p, "D", "En Portusa, a unos 7,5 km al noroeste de Guadamur, había un importante paso del Tajo en barcas donde confluían varios caminos.", "JOR7", "", origen="Ficha de la parada", claves=["portusa", "tajo", "barcas", "caminos"])
a(p, "H", "El topónimo Portusa podría ser de origen romano.", "JOR7", "", origen="Ficha de la parada", claves=["portusa", "toponimo", "romano"])
a(p, "I", "La ruta de Portusa por Guadamur hacia Consabura (Consuegra) y Laminium (Alhambra) fue una vía romana.", "ROJ", "", atrib="J. M. Rojas", origen="Ficha de la parada", claves=["via romana", "consabura", "laminium"])
a(p, "D", "Desde el siglo XIX han desaparecido más del 80 % de las huertas y viñas de Guadamur, y el olivar quizá haya triplicado su extensión.", "JOR7", "", origen="Ficha de la parada", claves=["olivar", "vinas", "cultivos", "paisaje"])

# ---------------------------------------------------------------- Palabras clave adicionales
# Formas en que los visitantes preguntan (banco de evaluación del asistente, 05/11/2026).
EXTRA = {
    "guarrazar-2-11": ["reyes", "rey", "nombre del rey"],
    "guarrazar-5-07": ["junto a las coronas", "encontraron", "objetos del tesoro"],
    "guarrazar-2-12": ["ofrecieron", "ofrecio", "donaron", "abad"],
    "guarrazar-2-05": ["suelo", "solado", "suelo de la basilica"],
    "guarrazar-1-01": ["donde esta", "situacion", "ubicacion"],
    "territorio-3-01": ["se sacaba", "sacaba", "extraia"],
    "guarrazar-2-02": ["conserva", "queda", "restos"],
    "guarrazar-2-03": ["conserva", "queda", "restos", "basas de columna"],
    "guarrazar-2-09": ["tumba", "enterramiento"],
    "guarrazar-3-03": ["dos plantas", "planta alta", "piso"],
    "guarrazar-4-02": ["cuantas baneras", "fosas por parejas"],
    "guarrazar-4-03": ["hasta cuando", "usaron", "uso de las baneras"],
    "guarrazar-6-06": ["minas", "mina de plomo"],
    "vegabaja-1-04": ["enterrado", "enterrados", "sepultura", "obispos enterrados", "quien esta enterrado"],
    "vegabaja-2-02": ["calles", "calle"],
    "vegabaja-2-05": ["calles", "como eran las calles"],
    "vegabaja-3-03": ["casas", "construian", "muros"],
    "vegabaja-3-04": ["objetos", "encontrado", "hallazgos"],
    "concilios-1-03": ["consagro", "consagracion", "consagrada"],
    "concilios-1-07": ["concilio en san roman", "concilios en san roman"],
    "territorio-1-03": ["por que", "junto al agua"],
    "guarrazar-6-03": ["gran edificio", "cerro", "palacio en guarrazar"],
    "guarrazar-6-04": ["gran edificio", "cerro", "palacio"],
    "guarrazar-5-09": ["escondio", "escondido", "esconder", "ocultacion", "por que se escondio"],
    "guarrazar-1-13": ["como se llamaba", "nombre del santuario"],
    "concilios-1-04": ["iglesia visigoda", "origen"],
    "concilios-2-05": ["iglesia visigoda", "cripta"],
    "guarrazar-2-08": ["largo", "longitud", "media"],
    "guarrazar-3-08": ["hospital", "era un hospital"],
    "guarrazar-3-09": ["hospital", "monasterio"],
    "guarrazar-4-08": ["curan", "enfermedades", "cura"],
    "guarrazar-1-15": ["excavar", "excavado", "terminado"],
    "centro-guarrazar-05": ["que se ve", "piezas", "vitrinas"],
}
# El lugar ya lo reconoce el asistente por su nombre: como palabra clave, un nombre de lugar haría
# ganar a cualquier afirmación de ese lugar en cualquier pregunta que lo mencione.
NOMBRES_DE_LUGAR = {"guarrazar", "guadamur", "toledo", "vega baja", "san roman", "coronas de guarrazar",
                    "museo", "museo de los concilios", "yacimiento", "centro de interpretacion"}

# ---------------------------------------------------------------- Salida
def kw(t):
    t = strip(t).replace(",", " ")
    return re.sub(r"\s+", " ", t).strip()

out, rows = [], []
count = {}
for x in A:
    count[x["parada"]] = count.get(x["parada"], 0) + 1
    cid = f"claim-{x['parada']}-{count[x['parada']]:02d}"
    base_id = f"{x['parada']}-{count[x['parada']]:02d}"
    claves = sorted({kw(k) for k in [*x["claves"], *EXTRA.get(base_id, [])] if k} - NOMBRES_DE_LUGAR)[:30]
    item = {
        "id": cid,
        "parada": x["parada"],
        "texto": x["texto"],
        "nivel": x["nivel"],
        **({"atribucion": x["atrib"]} if x["atrib"] else {}),
        "fuente": {"titulo": S[x["fuente"]], **({"pagina": x["pagina"]} if x["pagina"] else {})},
        "palabrasClave": claves,
        "origen": x["origen"],
        "revisar": x["revisar"],
        "estado": "borrador",
    }
    assert x["nivel"] in "DIHT"
    assert x["nivel"] != "I" or x["atrib"], cid
    assert len(item["texto"]) <= 800 and len(item["fuente"]["titulo"]) <= 300, cid
    out.append(item)

here = os.path.dirname(os.path.abspath(__file__))
json.dump(out, open(os.path.join(here, "afirmaciones.json"), "w"), ensure_ascii=False, indent=2)
print(len(out), "afirmaciones en", len(count), "paradas;", sum(1 for o in out if o["revisar"]), "con algo que revisar")
