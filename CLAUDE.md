## Presentación de la propuesta (diseño aprobado)

- Antes de modificar cómo se genera la propuesta, lee `docs/propuesta-deck/spec.json` y las láminas de `docs/propuesta-deck/reference/slides/`.
- Respeta colores, tamaños y el motivo de ticket descritos en el spec. Tipografías (actualizado): Exo (títulos) + Poppins (texto) — reemplaza Bricolage Grotesque + DM Sans del spec original.
- Los datos salen de la propuesta guardada (Tarifario, Propuesta, Contrato). No escribas cifras ni textos fijos en el código.
- Si falta un dato, muestra `[Por definir]`. Revisa la lista `known_issues` del spec antes de dar algo por terminado.

## Diseño del módulo Comercial (aprobado)

- Antes de tocar la interfaz, lee `docs/diseno-comercial/spec.json` y los mockups de `docs/diseno-comercial/reference/`.
- Todo color sale de tokens con tema sistema/claro/oscuro; no uses colores fijos en componentes.
- Tipografías (actualizado): Exo (títulos) y Poppins (texto), con `next/font` — reemplaza Bricolage Grotesque + DM Sans del spec original.
- Los cambios de diseño no deben alterar la lógica ni los datos existentes.
- Verifica cada pantalla a 390, 768 y 1280 px y en ambos temas.
