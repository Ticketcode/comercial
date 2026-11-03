# Borrador de paquetes — Plataforma base, Logística 360 y Servicios personalizados

Estado: **borrador para revisión**, sacado del catálogo real (`catalog_items`, leído solo con SELECT). No está cargado en la base. Continúa [borrador-streaming-mundo-virtual.md](borrador-streaming-mundo-virtual.md).

Reglas: igual que en el primer borrador. El alcance es contractual, así que aquí solo se reorganiza el texto existente. Los nombres comerciales y las promesas son propuesta de redacción. Lo que no tiene texto en el catálogo queda marcado **"falta texto"** y no lo invento.

---

## 1. Plataforma base (componentes básicos)

Cómo se explica al cliente: **tu evento completo en línea, desde el registro hasta los datos**. Los cuatro bloques funcionan juntos: sin el diseño no hay landing, sin el registro no hay QR, sin el QR no hay acceso.

| Paquete | Promesa | Componentes que incluye (texto del catálogo) |
|---|---|---|
| **Tu evento en línea** | Una página propia, con la imagen de tu evento, lista para recibir registros | Landing page (presencial: herramientas de diseño y configuración robusta; híbrido/virtual: infraestructura con servidores y balanceadores de carga). Diseño (híbrido/virtual): banner, logos para redes y color acorde al look and feel. Formulario de registro: múltiples campos y tipos de pregunta. |
| **Entradas y acceso** | Tú defines quién entra y con qué condiciones | Tipos de entrada. Códigos de descuento (preventa y especiales). Invitados especiales (VIP, prensa, staff, aliados, patrocinadores, cortesías). Venta de boletería: cuenta recaudadora y medios de pago, con comisión. |
| **Comunicación con tus asistentes** | Cada persona recibe su entrada y toda la información | Envío a todos los registrados de la boleta digital con QR, y la información del evento (hora, fecha, lugar, recomendaciones) más agregar al calendario. |
| **Control y datos** | Ves lo que pasa en tiempo real y te quedas con la información | Módulo de colaboradores (equipo del evento con roles). Dashboard estándar (visitas web, registros, asistentes, flujo por mes, semana y día). Base de datos descargable en Excel y .csv. |

Variables: ninguna. Son componentes estándar.

**Cosas que no cuadran y hay que decidir:**

1. **Comisión de boletería distinta.** Presencial dice "10% + $1.200" y Virtual dice "9,9% + $950". **Decidido: 10% + $1.200 para todas las modalidades.** Falta corregir el texto de Virtual en el catálogo.
2. **Híbrido no tiene el módulo de venta de boletería.** Presencial y Virtual sí. ¿Es intencional?
3. **Texto de "Envío de correos"** distinto entre modalidades (presencial detalla más). Se puede unificar.

### Bloque extra solo en Virtual (hoy viene marcado como incluido)

Chroma key (tela verde, luces, kit de sonido, `{n_camaras}` cámaras), pregrabados (asistente audiovisual, grabación y acompañamiento), retransmisión a redes (configuración de canales Facebook, YouTube, Twitch), traducción simultánea inglés-español (equipos y personal bilingüe) y lenguaje de señas (equipos y personal).

**Decidido: todos los servicios de Virtual y Mundo virtual son opcionales.** Cada evento puede o no requerirlos, y se definen en el diagnóstico o se agregan después. Consecuencias:

- Chroma key, pregrabados, retransmisión, traducción y lenguaje de señas pasan a **no incluidos por defecto** (hoy vienen marcados como incluidos en Virtual).
- La IA los trata como preguntas del diagnóstico: "¿requiere traducción simultánea?", "¿requiere lenguaje de señas?", "¿retransmite a redes?", "¿hay contenido pregrabado o chroma key?". Solo se incluyen si la respuesta es sí.
- Se pueden agregar a una versión posterior (V2, V3…) sin rehacer la propuesta.

---

## 2. Logística 360

Cómo se explica al cliente: **personas y equipos en sitio para que el día del evento nadie haga fila ni se pierda**.

### Presencial

| Paquete | Promesa | Componentes |
|---|---|---|
| **Tu equipo en sitio** | Un equipo entrenado que opera el evento por ti | Acompañamiento durante el evento (`{n_productores}` productor, `{n_supervisores}` supervisores). Personal logístico `{n_logisticos}`, con su distribución y horario. Capacitación a logísticos (2 horas: plataforma, roles y contingencias). Soporte técnico permanente (mesa de ayuda remota y respaldo de operaciones). |
| **Acreditación y acceso** | Cada asistente entra rápido y con su credencial | Pre-acreditación (1 día antes): plataforma, equipos y personal. Equipos para acreditación, venta en sitio y casos especiales: `{n_portatiles}` portátiles, impresoras fast, `{n_smartphones}` smartphones de lectura. Manillas (biodegradables, branding según arte, QR de control). Escarapelas físicas (cartón, impresión, cordón, gancho, funda). Branding de marca principal y aliados. Labels de seguridad para protección de equipos (`{n_labels}`, alquiler de impresora especial). |
| **Venta en sitio y preparación** | Resolvemos antes y durante | Venta de boletería en sitio (portátiles, datáfonos, logísticos). Visita preoperativa (flujo de ingreso, internet, conexiones eléctricas, tiendas, centro de operaciones). |

### Híbrido

Misma lógica, con estos componentes propios: personal logístico `{n_logisticos}` para cubrir registro, acreditación, sesiones principales e internas; control de acceso a cada sesión interna (`{n_logisticos_sesiones}` personas y `{n_equipos_lectura}` equipos de lectura); equipos (portátiles, impresoras, smartphones); consumibles (`{n_rollos}` rollos de papel térmico para labels); escarapelas; soporte técnico; visita preoperativa; acompañamiento.

### El problema de los números fijos

Hoy los textos de Logística 360 presencial traen cifras escritas a mano: "(8-10) Logísticos", "4L acreditación, 1L venta de boletería…", "(6) Portátiles", "(20) smartphones", "(2) datáfonos", "(1) productor, (2) supervisores". Esas cifras **pueden no coincidir con lo que calcula el Tarifario** para el aforo del evento (tu tabla `aforo_scales`). En la presentación ya se reemplazan algunas, pero no todas.

En el nuevo modelo todas pasan a variables que se llenan desde el Tarifario (`{n_logisticos}`, `{n_supervisores}`, `{n_productores}`, `{n_portatiles}`, `{n_impresoras}`, `{n_smartphones}`, `{n_rollos}`). **Decidido:** la distribución por puesto ("4L acreditación, 1L…") se calcula con una regla según la cantidad, como está en la tabla de aforo. Falta que ustedes escriban esa regla de reparto.

### Modelo de personal: quién pone la gente

**Decidido:** hay eventos donde el organizador pone el personal logístico y paga sus honorarios. Entonces:

| Concepto | Ticketcode pone el personal | El organizador pone el personal |
|---|---|---|
| Cantidades de logísticos | Se calculan por aforo | Se **mantienen** (como referencia y para el texto) |
| Costo de logísticos | Se cobra | **No se cobra** |
| Productor y supervisores | Se cobran | **Se cobran siempre**, con costos según ciudad |
| Capacitación al staff de la organización (servicio personalizado) | Opcional | **Se incluye** |

Hoy el Tarifario **no tiene esta opción**. Se puede simular poniendo la cantidad en 0, pero eso borra las cantidades que el texto necesita. Hace falta un interruptor por propuesta ("personal logístico a cargo del organizador"), y el diagnóstico de la IA debe preguntarlo.

**Productor y supervisores: lo que varía es si hacen falta, no su valor.** Hay eventos donde no se cuenta el acompañamiento del productor y solo va el supervisor. Los valores unitarios siguen saliendo del catálogo por ciudad (la regla actual no cambia). Esto ya se puede representar con la cantidad (`qty_productor` o `qty_supervisor` en 0), así que no hace falta una función nueva. Lo que falta es que el **diagnóstico lo pregunte**:

- "¿El evento lleva productor de Ticketcode?"
- "¿Cuántos supervisores?" (la tabla de aforo propone un número; se confirma)

Si el productor no va, el texto del paquete "Tu equipo en sitio" no debe nombrarlo (la variable `{n_productores}` en 0 oculta esa línea).

Textos con hueco hoy: "Habilitación módulo para impresión de () labels", "(x) Productor, (x) Supervisores", "() Logísticos", "() personas de logística, () equipos de lectura", "(x) Portátiles", "(x) rollos de papel térmico".

---

## 3. Servicios personalizados generales (39)

Cómo se explica al cliente: **ajustes a la medida que se suman al paquete base**. Aunque se cobran por separado, se presentan agrupados por lo que resuelven.

| Paquete | Servicios que agrupa |
|---|---|
| **Comunicación personalizada** | Correos de confirmación personalizados · Correos de recordación (hasta 2 envíos) · Correos a bases segmentadas · Mensajes por WhatsApp o SMS · Correos de agradecimiento · Certificados de asistencia · Encuestas de satisfacción · Notificaciones push · Píxeles de seguimiento a campañas |
| **Registro y recaudo a la medida** | Formulario de registro personalizado · Importación de bases externas · Iframe de registro · Pasarela de pagos (módulo bypass: PayU o Mercado Pago) · Transferencia de tarifa al asistente · Protección de datos |
| **Acreditación y credenciales** | Pre acreditación · Escarapela digital · Escarapelas físicas · Manillas · Módulo de branding · Pre-impresión para invitados especiales, speakers y prensa · Labels de seguridad · Venta de boletería en sitio · Capacitación al staff de la organización |
| **Control y datos avanzados** | Dashboard personalizado (cifras en tiempo real) · Informes finales · Módulo + app para visitas a stands · Beneficios asociados al QR · Datos en sitios simultáneos · Control de suministro de alimentos o elementos |
| **Conexión e infraestructura** | Cloud server · Cloud server virtual · Internet dedicado (sitios principales) · Internet dedicado satelital |
| **Interacción en línea** | Chat completo (salas públicas y privadas) · Salas privadas de chat (búsqueda de asistentes y v-card) · Salas de transmisión · I-frame de transmisión |
| **Acompañamiento previo** | Asesoría pre-evento (dos reuniones de hasta 1 hora con el productor: onboarding y pre-producción) |

### Servicios sin texto en el catálogo (falta texto de ustedes)

Estos 17 aparecen en la presentación con descripción vacía. No los redacté para no inventar alcance:

Cloud server virtual · Internet dedicado (sitios principales) · Internet dedicado satelital · Módulo para obtención de datos en diferentes sitios simultáneos · Control de suministro de alimentos o elementos · Suministro de escarapelas físicas · Suministro de manillas · Módulo de branding · Labels de seguridad · Venta de boletería en sitio · Pre-impresión de escarapelas · Capacitación al staff (2 horas) · Salas privadas de chat · Chat completo · Notificaciones push · Salas de transmisión · I-frame de transmisión.

### Duplicados con Logística 360

**Decidido:** estos cinco servicios van **solo como servicios personalizados**, no en Logística 360: manillas, escarapelas físicas, módulo de branding, labels de seguridad y venta de boletería en sitio.

Consecuencias:

- Logística 360 presencial baja de 12 a 7 componentes. En híbrido sale también "Suministro de escarapelas físicas".
- Una propuesta nueva ya **no trae manillas ni escarapelas incluidas**. La IA debe preguntarlo en el diagnóstico: "¿manillas, escarapelas físicas o ambas?", "¿branding de aliados en la credencial?", "¿labels de seguridad para proteger equipos?".
- **"Pre-acreditación" NO es un duplicado.** Son dos cosas distintas, explicadas en la sección siguiente.

### Pre-acreditación: dos piezas distintas

**Decidido:**

| | Logística 360 | Servicio personalizado |
|---|---|---|
| Qué es | La operación de acreditar antes del evento | Habilitar el módulo en la plataforma |
| Qué calcula | Personas, equipos e insumos | Nada de logística |
| Cuánto personal | **La mitad de los logísticos** del evento (ej. 10 logísticos → 5 para pre-acreditación) | — |
| Cómo se cobra | Según personas, equipos, insumos, días y duración | **Un precio base por día** |
| Qué se pregunta | ¿Día completo o medio día? ¿Cuántos días de pre-acreditación? | Se habilita al decir que hay pre-acreditación |

La IA pregunta en el diagnóstico: **"¿Hay pre-acreditación? ¿Cuántos días? ¿Día completo o medio día?"** Con eso calcula el equipo (mitad de los logísticos, sus equipos y sus insumos) y habilita el servicio del módulo.

Cosas que no cuadran con lo que hace el código hoy:

- **Hoy el código suma los días de pre-acreditación a TODO el equipo** (honorarios, alimentación y transporte completos de todos los logísticos), no a la mitad (`tarifario-editor.tsx`, comentario de "Pre acreditación (servicio #25)"). Eso cobra de más frente a tu regla. Y tampoco distingue día completo de medio día, aunque ya existen tarifas de medio día en el catálogo de honorarios.
- **Precio del módulo — decidido: $120.000 por día.** Los $350.000 que tiene hoy el catálogo ya contemplaban la logística, y ahora la logística se calcula aparte en Logística 360. Hay que bajar el precio del servicio "Pre acreditación" de $350.000 a $120.000 para no cobrar dos veces.
- **Redondeo — decidido:** con un número impar de logísticos la mitad se **sube al entero siguiente** (7 → 3,5 → 4).
- **Día completo o medio día — decidido:** cambia el honorario del logístico. En el catálogo hoy: **día completo $70.000** y **medio día $60.000**. **Confirmado: el medio día es $60.000**, el catálogo está bien. El supervisor tiene medio día de $70.000 frente a $120.000 de día completo. La misma regla de medio día se aplica a toda la pre-acreditación.

### Venta de boletería en sitio: cómo se calcula

**Decidido:** el reparto sale de la tabla inicial y de lo que diga el diagnóstico.

1. El diagnóstico pregunta: **"¿cuántos puntos de venta de boletería necesita?"**
2. Cada punto necesita **un logístico**. Esos logísticos **ya están incluidos** en el esquema inicial de la tabla de aforo.
3. Si el cliente pide logísticos **adicionales** al esquema inicial, la cantidad se **suma** al número de la tabla.
4. Se habilita el servicio personalizado "Venta de boletería en sitio", que cubre **solo el alquiler del datáfono**. El personal ya tiene su rubro en Logística 360.

Por eso el texto del servicio "Venta de boletería en sitio" debe decir solo lo del datáfono. Hoy no tiene descripción (falta texto).

### Reparto de la tabla de aforo (confirmado en la base)

La tabla `aforo_scales` define por rango de aforo: logísticos, supervisores, productores, computadores, impresoras y rollos de labels. La **logística de acreditación es el valor `logistico`** de la tabla. Dos cosas que vi al leerla:

- En todos los rangos, **computadores e impresoras son iguales a logísticos**. Es decir, un equipo por logístico.
- El dato de **rollos de labels** para aforos de 15.000 a 19.999 es **7,692307692**, mientras el rango anterior tiene 51 y el siguiente 103. Era un error.

**Rollos de labels: se calcula con el aforo.** Decidido: cada rollo trae **195 etiquetas**. La cantidad es `aforo ÷ 195`, **subiendo al entero siguiente**. Ejemplo: 5.000 personas → 26 rollos; 10.000 → 52.

Con 195 la fórmula **coincide casi siempre con la columna de la tabla** (5.000 → 26, 6.000 → 31, 20.000 → 103, 30.000 → 154). Las diferencias son de uno: la tabla redondea al más cercano y la regla sube (10.000: tabla 51, regla 52). Y confirma el error de la tabla en 15.000 a 19.999: da **77** rollos, no 7,69 (parece un 1.950 escrito en vez de 195). Se reemplaza la columna `rollos_labels` por la fórmula, que se recalcula sola si el aforo cambia.

**Decidido: el aforo es el total que confirma el organizador, sin tasa de conversión.** Usar la tasa podría dejar al evento corto de rollos, así que se calcula siempre sobre el aforo confirmado, aunque asista menos gente. Y es el total del evento, sin importar los días. Si el organizador dice "3 días, aforo total 1.000", son 1.000 personas en total y los rollos se calculan sobre 1.000, no por día. **Esto no coincide con el código actual**, que multiplica el costo de los rollos por los días del evento (`qty × papel impresora × días`). Con la regla nueva, el costo de rollos no se multiplica por los días.

**Equipos al sumar puntos:** decidido que si hay puntos de venta adicionales a los del esquema inicial, **se suman también computadores e impresoras**, uno por logístico, como en la tabla.

---

## 4. Problema detectado en los datos (no es del borrador)

En la modalidad **Híbrido**, los 9 componentes de **Mundo virtual** (alcance global, construcción, UX, interactividad, desarrollos, infraestructura, tiempo de producción, material, notas) están marcados como **incluidos por defecto**. La migración 0038 solo los desmarcó para la modalidad Mundo virtual. Una propuesta híbrida nueva los mostraría ya marcados aunque el evento no tenga mundo virtual. Conviene confirmarlo y corregirlo antes de la V2.

## 5. Preguntas abiertas

1. Comisión de boletería: ¿10% + $1.200 o 9,9% + $950?
2. Híbrido sin módulo de venta de boletería: ¿intencional?
3. Chroma key, pregrabados, retransmisión, traducción y lenguaje de señas en Virtual: ¿incluidos siempre u opcionales?
4. Distribución del personal por puesto: ¿regla por cantidad o se quita del texto?
5. ¿Aprueban los nombres de paquete o los cambian?

Resueltas: comisión de boletería (10% + $1.200), servicios de Virtual y Mundo virtual opcionales, productor y supervisores según el evento, duplicados solo como servicios personalizados, pre-acreditación ($120.000 por día, mitad de logísticos hacia arriba, completo o medio día), rollos (aforo ÷ 195 hacia arriba), medio día del logístico ($60.000) y aforo de rollos (el que confirma el organizador, sin tasa de conversión).
