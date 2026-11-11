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

- `museos`: museos que aún no son lugares de la ruta. El importador los crea como lugares. Hoy solo está el Museo de Santa Cruz.
- `piezas`: cada pieza con su museo, su origen (`lugar` y, si procede, `parada`), los datos de la cartela, sus fotos (en `contenidos/piezas/`) y sus afirmaciones.
- Las afirmaciones entran en la tabla de validación (`tabla_validacion.py`), en el grupo «Piezas del Museo de Santa Cruz». Cuando Rojas o Urbs Regia las validan, `aplicar_validacion.py` guarda la decisión en `piezas.json`. Solo las validadas llegan al gestor.

## Estado (11/11/2026)

| Pieza | Origen | Pendiente |
| --- | --- | --- |
| Trientes de Ervigio, Égica y Witiza | Vega Baja, parada 4 | Validar; permiso de foto |
| Placa decorativa | Finca «El Mono», El Carpio de Tajo (no es lugar de la ruta) | Validar; permiso de foto |
| Fragmento de sarcófago con orantes | Desconocido (siglos IV-V) | Validar; permiso de foto |
| Hebilla de cinturón y fíbula trilaminar | **Cartela ilegible en la foto** | Confirmar datación, procedencia e inventario; validar; permiso |

**Fotos.** Son provisionales, sacadas de las enviadas por WhatsApp. Para sustituirlas por las de alta calidad, se guardan con el mismo nombre en `contenidos/piezas/`. La autoría va en el crédito de cada foto.

**Museo de Santa Cruz.**

- Es un museo general: entra en la ruta por sus piezas visigodas.
- Su coordenada es estimada y su horario está sin verificar.
- Hay que confirmar la sala en la que están las piezas.
