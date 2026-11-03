# Borrador de paquetes — Streaming y Mundo virtual

Estado: **borrador para revisión**. No está cargado en la base de datos.

Reglas con las que se escribió:

- El alcance es contractual. Este borrador **solo reorganiza y reescribe** el texto que ya existe en el catálogo (migraciones 0036 y 0037). No agrega entregables nuevos.
- Los nombres comerciales y los beneficios son propuesta de redacción: **los decide el equipo**.
- Donde el texto actual tiene un hueco (`(x)`, `()`), aquí es una **variable** con su pregunta. Si la variable no se responde, el paquete queda en revisión y no sale a la presentación.
- Los valores por defecto marcados "del texto actual" ya estaban escritos en el catálogo. Los demás se dejan **sin valor por defecto**: no sé cuál es el estándar de ustedes.
- "Cuándo aplica" es una **sugerencia por confirmar**; sale de la modalidad y del sentido del servicio, no de una regla que ustedes hayan escrito.

---

## A. Streaming (modalidades Virtual e Híbrido)

Cómo se explica al cliente: **una transmisión completa, de la preparación al informe final**. Los cuatro paquetes se venden juntos.

### A1. Tu plataforma de transmisión

- **Promesa:** tus asistentes entran a un solo lugar, sin caídas, aunque sean muchos.
- **Incluye** (componentes que se discriminan):
  - Landing de transmisión — interfaz optimizada (hosting, infraestructura, componentes de seguridad) para la transmisión del contenido.
  - Canal dedicado — hosting e infraestructura para soportar el aforo esperado.
  - Salas de streaming simultáneas — configuración de `{n_salas}` salas simultáneas, con chat, salas privadas y v-card.
- **Preguntas:**
  - `{n_salas}`: ¿cuántas salas se transmiten al mismo tiempo? (sin valor por defecto)
- **Cuándo aplica (por confirmar):** modalidad virtual o híbrida con transmisión.

### A2. Producción en vivo

- **Promesa:** tu evento se ve y se escucha como una producción profesional.
- **Incluye:**
  - Master de transmisión — capturadora, switch, canal, servidores, portátil, `{n_camaras}` cámaras, `{n_microfonos}` micrófonos.
  - Cámaras — suministro de `{n_camaras}` cámaras profesionales.
  - Sonido — consola de sonido, `{n_microfonos}` micrófonos.
  - Personal de soporte audiovisual — `{n_productores}` productores, `{n_asist_camara}` asistentes de cámara, `{n_asist_emision}` asistente de emisión y sonido.
- **Preguntas:**
  - `{n_camaras}`: ¿cuántas cámaras en total?
  - `{n_microfonos}`: ¿cuántos micrófonos?
  - `{n_productores}`, `{n_asist_camara}`, `{n_asist_emision}`: ¿cuánto personal audiovisual?
  - (todas sin valor por defecto)
- **Nota de revisión:** hoy "Master de transmisión" y "Cámaras" repiten las cámaras y "Master" y "Sonido" repiten los micrófonos. Aquí comparten la misma variable para que no se contradigan.
- **Cuándo aplica (por confirmar):** transmisión con producción de ustedes. No aplica si el cliente trae su propia producción.

### A3. Preparación y pruebas

- **Promesa:** lo probamos todo antes del día del evento.
- **Incluye:**
  - Visita de pre-producción (master en sitio) — revisión de los componentes del plan logístico: flujo de ingreso, prueba de internet, conexiones eléctricas, sesiones internas, centro de operaciones.
  - Preproducción remota — asesoría en buenas prácticas y validación de componentes de la transmisión: agenda, status de speakers, piezas de diseño.
  - Asesoría de pre-producción — formatos de minutograma y formatos estándar de piezas: cortinillas, tituladores, aperturas, cierres, overlays.
- **Preguntas:** ninguna.
- **Cuándo aplica (por confirmar):** la visita en sitio aplica a híbrido o con sede física; la preproducción remota aplica siempre.

### A4. Acompañamiento y entregables

- **Promesa:** no estás solo durante el evento y te quedas con todo el material.
- **Incluye:**
  - Soporte técnico — mesa de ayuda remota, atención y solución de problemas técnicos, respaldo de operaciones.
  - Entrega de material y grabaciones — material completo o cortado en formato h.264 (calidad streaming).
  - Informes — informe detallado de asistentes a nivel general, por sala y por franja.
- **Preguntas:** ninguna.
- **Cuándo aplica (por confirmar):** siempre que haya streaming.

---

## B. Mundo virtual (modalidad Mundo virtual)

Cómo se explica al cliente: **un evento en un entorno 3D propio, con espacios para el contenido, la interacción y los patrocinadores**.

### B1. Tu mundo virtual

- **Promesa:** un espacio 3D con la identidad de tu evento, listo para miles de personas.
- **Incluye:**
  - Alcance de espacios y aforo: 2 mundos virtuales paralelos, Premium y Básico.
    - Premium: 1 lobby, un auditorio y muestra comercial de hasta `{n_stands}` stands.
    - Básico: 1 lobby, auditorio y transición para pago y acceso a Premium.
    - Aforo esperado: 30.000 a 35.000 personas por día.
  - Construcción del mundo virtual — 2 propuestas de línea arquitectónica, modelado y diseño 3D, renderizaciones, producción final de máxima calidad.
  - Experiencia de usuario — diseño de interfaz UX, de navegabilidad y de interactividad.
- **Preguntas:**
  - `{n_stands}`: ¿cuántos stands tendrá la muestra comercial? (por defecto 10, del texto actual)
- **Cuándo aplica (por confirmar):** siempre en modalidad Mundo virtual.

### B2. Interacción y patrocinadores

- **Promesa:** tus asistentes se conocen entre sí y tus aliados tienen dónde mostrarse.
- **Incluye:**
  - Interactividad y networking — 1 sala global de chat, `{n_salas_tematicas}` salas temáticas de chat, tarjetas virtuales de negocios.
  - Desarrollos y personalizaciones — menú y mapa de navegación, múltiples espacios de branding del organizador y/o aliados o patrocinadores, muestra comercial con chat y videollamada para asesores comerciales, métricas de ingreso y participación por espacio.
- **Preguntas:**
  - `{n_salas_tematicas}`: ¿cuántas salas temáticas de chat? (por defecto 7, del texto actual)
- **Cuándo aplica (por confirmar):** siempre en Mundo virtual. Las preguntas sobre patrocinadores del diagnóstico ayudan a dimensionar el branding.

### B3. Infraestructura y transmisión

- **Promesa:** funciona el día del evento, con la carga real.
- **Incluye:**
  - Infraestructura (cloud server) — alojamiento de AssetBundle para fondos, imágenes y gifs; entornos y repositorios para pruebas y producción; cloud server para backend webVR.
  - Landing de transmisión — interfaz robusta y elástica, optimizada para el tráfico de los días de transmisión, internet de la transmisión acoplada, protocolos de seguridad y privacidad.
- **Preguntas:** ninguna.
- **Cuándo aplica (por confirmar):** siempre en Mundo virtual.

### B4. Condiciones (no es un servicio con precio)

Hoy estas tres filas están guardadas como servicios con precio. Propongo que sean **condiciones** que acompañan al paquete, sin precio:

- **Tiempo de producción y entrega:** `{dias_habiles}` días hábiles, que incluyen propuestas, ajustes, pre-renders, renders y versión de producción en máxima calidad. (por defecto 30, del texto actual)
- **Material a cargo del organizador:** imágenes, logos, videos, textos y documentos propios o de sus aliados, según corresponda para los espacios de los mundos virtuales.
- **No incluido y notas:**
  - Todo el contenido de la transmisión debe entregarse listo y marcado (tituladores, créditos, cortinillas, etc.).
  - Se puede retransmitir a redes sociales con la autorización y los permisos en los canales (Facebook, YouTube).
  - No incluye diseño de piezas del streaming, pre-producción, producción ni postproducción audiovisual.

---

## Cómo se combinan (Híbrido + Mundo virtual)

Cuando una propuesta tiene los dos, el cliente ve los paquetes de A y de B, y una sola lista de condiciones. El caso de la landing de transmisión aparece en A1 y en B3: **hay que decidir** si en ese caso es una sola o se cobra una por modalidad.

## Preguntas abiertas para el equipo

1. ¿Los nombres comerciales y las promesas les representan? Cámbienlos libremente.
2. ¿Hay valores estándar para cámaras, micrófonos y personal audiovisual? Si existen, se ponen como valor por defecto.
3. En un evento híbrido + mundo virtual, ¿la landing de transmisión se cobra una vez o por modalidad?
4. ¿Prefieren mantener el precio por servicio individual dentro del paquete (como hoy) o un precio por paquete?
