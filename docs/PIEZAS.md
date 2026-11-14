# Piezas de museo

Una pieza de museo une un lugar de la ruta con el museo que guarda lo que salió de él. La definición funcional lo llama «esta pieza viene de…».

- En la ficha del **lugar de origen** aparece «Lo que se halló aquí: hoy está en…». Si la pieza está vinculada a una parada, aparece también en esa parada del recorrido guiado.
- En la ficha del **museo** aparece «Piezas de la ruta en este museo».
- Cada pieza lleva:
  - material, datación, inventario y titular;
  - una descripción;
  - la **cartela transcrita tal cual**;
  - sus **afirmaciones**, con nivel y fuente, que también usa el asistente;
  - sus fotos.
- **Las fotos solo se muestran con permiso del museo** (`permission: "granted"`) y, si lo exige, también del titular de la pieza (Ministerio de Cultura, JCCM…). Sin permiso, la pieza se publica sin foto y el gestor avisa.

Código:

- tipo `Piece` en `domain/types.ts`;
- `components/shared/PieceCard.tsx`;
- gestor en `/admin/piezas`;
- reglas en `validateCatalog`;
- migración `20261111120000_pieces.sql`.

## Contenido: `contenidos/piezas.json`

- `museos`: museos que aún no son lugares de la ruta. El importador los crea como lugares. Hoy solo está el Museo de Santa Cruz. Las piezas pueden estar también en un lugar que ya existe (el Museo de los Concilios es `museo-concilios`, de la configuración).
- `piezas`: cada pieza con su museo, su origen (`lugar` y, si procede, `parada`), los datos de la cartela, sus fotos (en `contenidos/piezas/`) y sus afirmaciones.
- `fuente` es la fuente general de las afirmaciones; `fuentes` da la de cada museo (las cartelas del Museo de los Concilios).
- Las afirmaciones entran en la tabla de validación (`tabla_validacion.py`), en un grupo por museo («Piezas del Museo de Santa Cruz», «Piezas del Museo de los Concilios»). Cuando Rojas o Urbs Regia las validan, `aplicar_validacion.py` guarda la decisión en `piezas.json`. Solo las validadas llegan al gestor.

## Estado (14/11/2026)

### Museo de Santa Cruz

| Pieza | Origen | Pendiente |
| --- | --- | --- |
| Trientes de Ervigio, Égica y Witiza | Vega Baja, parada 4 | Validar; permiso de foto |
| Placa decorativa | Finca «El Mono», El Carpio de Tajo (no es lugar de la ruta) | Validar; permiso de foto |
| Fragmento de sarcófago con orantes | Desconocido (siglos IV-V) | Validar; permiso de foto |
| Hebilla de cinturón y fíbula trilaminar | **Cartela ilegible en la foto** | Confirmar datación, procedencia e inventario; validar; permiso |

### Museo de los Concilios

18 piezas de las fotos de Inma Guiu (SNEO), tomadas en sala en noviembre de 2026. Crédito: «Foto: Inma Guiu (SNEO) · Museo de los Concilios». Todas con el permiso de foto pendiente y las afirmaciones en borrador.

| Pieza | Origen | Pendiente |
| --- | --- | --- |
| Pilastra de San Salvador (reproducción) | Sin vincular: es reproducción; el original sigue en El Salvador | Validar |
| Relieve de San Lucas | Miradero, Toledo (no es lugar de la ruta) | Validar |
| Inscripción rítmica | «Los Hitos», Arisgotas, Orgaz (no es lugar de la ruta) | Confirmar lectura de la cartela; validar |
| Inscripción «TI DOMINI» | Vega Baja | Validar |
| Inscripción «QUI CREDIT IN EUM…» | Vega Baja | Capítulo omitido en la cartela; validar |
| Capitel con ciervo | Escalona (no es lugar de la ruta) | Validar |
| Placa nicho | Cigarral del Aserradero, Toledo | Validar |
| Fragmentos de credo epigráfico | Vega Baja | Validar |
| Imposta | Vega Baja | **Sin foto de la pieza**; validar |
| Friso con hojas de acanto | Vega Baja | Validar |
| Friso con flores octopétalas | Vega Baja | **Material ilegible**; validar |
| Friso con cruz patada | Procedencia desconocida | Validar |
| Arqueta de hueso | Vega Baja | **Falta la descripción de la cartela**; validar |
| Llave de bronce (DO2010/3/3) | Vega Baja | Validar |
| Capitel con pencas y volutas | Vega Baja | Validar |
| Columnilla de mármol | Vega Baja | Confirmar que la cartela es de esta pieza; validar |
| Basa prismática | Vega Baja | Validar |
| Fuste octogonal | Vega Baja | Validar |

No se han incluido, por falta de cartela legible o por no ser de época visigoda: las piezas romanas de Carranque (inscripción de Teodosio, atalaje de carro, aplique de mobiliario, plato), el cuenco de Pantoja, los ladrillos de los siglos IV-V, las placas con crismón y aves y con decoración geométrica, la cruz, los trientes, las réplicas de las coronas de Guarrazar, la pila, el colgante, el pendeloque, el osculatorio, la placa de cinturón liriforme, la otra columnilla y la basa de molduras escalonadas.

### Fotos

**Santa Cruz.** Son provisionales, sacadas de las enviadas por WhatsApp. Para sustituirlas por las de alta calidad, se guardan con el mismo nombre en `contenidos/piezas/`. La autoría va en el crédito de cada foto.

**Museo de Santa Cruz.**

- Es un museo general: entra en la ruta por sus piezas visigodas.
- Su coordenada es estimada y su horario está sin verificar.
- Hay que confirmar la sala en la que están las piezas.
