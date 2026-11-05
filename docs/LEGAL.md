# Textos legales y créditos

Páginas: `/aviso-legal`, `/privacidad`, `/cookies`, `/accesibilidad` y `/creditos`. Se enlazan desde el pie del menú lateral (escritorio), el pie de la portada (móvil), el pie de cada página legal y el formulario de alta.

## De dónde salen

- `web/src/data/legal.ts`: datos del titular, servicios que reciben datos, plazos, créditos del equipo y texto de la ayuda. Un solo sitio, para que las páginas no se contradigan.
- `web/src/domain/credits.ts`: créditos de cada imagen, locución, modelo 3D y mapa, y las fuentes de las afirmaciones publicadas. Se calculan del catálogo publicado: al publicar una foto o una fuente nueva, aparece en `/creditos`.
- La página de privacidad nombra el proveedor del asistente que está configurado en el servidor: Claude con `ANTHROPIC_API_KEY`; si no, DeepSeek con `DEEPSEEK_API_KEY`; si no, ninguno.

## Antes de publicar la versión 1.0

Los valores entre corchetes (`[…]`) aparecen resaltados en las páginas. `pendingLegalFields()` los lista. Faltan:

1. **Titular**: razón social, NIF, domicilio, Registro Mercantil, correo de contacto y de protección de datos. Hay que decidir si es Súbito Red Desarrollos o SNEO Mestizaje Projects.
2. **Dominio** de la app.
3. **Alojamiento**: proveedor, ubicación de los servidores y plazo de conservación de sus registros.
4. **Supabase**: región del proyecto (mejor en la UE).
5. **Asistente**: usar Claude (Anthropic) en producción. DeepSeek trata los datos en China, sin decisión de adecuación. Hay que confirmar las garantías del contrato (cláusulas tipo) y el plazo de conservación del proveedor. El asistente recibe las necesidades de accesibilidad marcadas, que pueden ser datos de salud.
6. **Mapa base**: proveedor de teselas para producción. Los servidores de OpenStreetMap no admiten uso intensivo.
7. **Cuentas inactivas**: confirmar el plazo (se propone 24 meses) y poner en marcha el aviso y el borrado.
8. **Créditos**: confirmar las funciones del equipo y los colaboradores. Faltan los créditos de voz, guion y producción de las locuciones (campo `credit` de cada audio) y los de las fotos.
9. **Ayuda del Ministerio**: texto y logotipo exactos que exija la resolución de concesión.
10. **Accesibilidad**: fecha de la auditoría externa (WCAG 2.2 AA).
11. **Revisión jurídica**: cuando un abogado revise los textos, poner `reviewedByLawyer: true`. Así desaparece el aviso de borrador.

Si se añade analítica o cualquier almacenamiento que no sea estrictamente necesario, hay que añadir un aviso de consentimiento y actualizar `/cookies`. La tabla de esa página debe seguir las claves de almacenamiento del código.
