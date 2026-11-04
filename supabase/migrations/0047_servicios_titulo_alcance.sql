-- Título comercial y alcance de los 39 servicios personalizados.
-- titulo_comercial: cómo se llama el servicio de cara al cliente (Propuesta y Presentación). Si es null se usa el nombre técnico.
-- description: el alcance, en lenguaje comercial y sin "Incluye:" interno.
-- Cada servicio se identifica por su nombre dentro del catálogo general; se verificó que cada patrón coincide con una sola fila.
alter table catalog_items
  add column if not exists titulo_comercial text;

update catalog_items set titulo_comercial = 'Asesoría previa con tu productor', description = 'Dos reuniones de hasta 1 hora con tu productor: arranque y preproducción, para dejar definidos tiempos, responsables y configuración.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Asesor%pre-evento%';
update catalog_items set titulo_comercial = 'Servidores dedicados para tu evento', description = 'Infraestructura en la nube dimensionada al aforo y a los días del evento: servidores, bases de datos, seguridad y respaldo de datos.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Cloud server';
update catalog_items set titulo_comercial = 'Servidores para tu audiencia virtual', description = 'Infraestructura en la nube dimensionada al aforo virtual y a los días de transmisión, con seguridad informática y respaldo de datos.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Cloud server virtual';
update catalog_items set titulo_comercial = 'Internet dedicado en los sitios principales', description = 'Conexión dedicada de alta capacidad en los puntos clave del evento, para que la operación no dependa de la red del recinto.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Internet dedicado (sitios%';
update catalog_items set titulo_comercial = 'Internet satelital', description = 'Conexión satelital para sitios sin cobertura de red confiable, para poder operar el registro y el control de acceso.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Internet dedicado satelital';
update catalog_items set titulo_comercial = 'Carga de tus bases de datos', description = 'Validación de campos, importación de tus asistentes a la plataforma y envío de la confirmación con código QR.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Importaci%bases de datos externas%';
update catalog_items set titulo_comercial = 'Formularios por tipo de entrada', description = 'Varios formularios de registro, uno por tipo de entrada, con campos y preguntas propios para segmentar tu base de asistentes.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Formulario de registro personalizado';
update catalog_items set titulo_comercial = 'Recaudo directo en tu cuenta', description = 'Integración (módulo bypass) para que el dinero de la venta de boletas llegue directamente a la cuenta del organizador, con PayU o Mercado Pago.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%Pasarela de pagos%';
update catalog_items set titulo_comercial = 'Costo del servicio a cargo del asistente', description = 'En la boleta se discrimina el valor de la entrada y el costo del servicio de la plataforma, para que lo asuma el asistente.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Transferencia de tarifa%';
update catalog_items set titulo_comercial = 'Correo de confirmación con tu marca', description = 'Remitente personalizado, boleta digital con código QR, textos e imágenes del organizador y opción de agregar el evento al calendario.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%correos%confirmaci%personalizados%';
update catalog_items set titulo_comercial = 'Recordatorios automáticos por correo', description = 'Motor de envío automático de hasta 2 recordatorios, con configuración y programación incluidas.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%recordaci%hasta 2 env%';
update catalog_items set titulo_comercial = 'Correos a bases segmentadas', description = 'Segmentación de tus bases de datos y envío de 1 a 3 correos a cada grupo.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%bases de datos segmentadas%';
update catalog_items set titulo_comercial = 'Seguimiento de tus campañas', description = 'Implementación de píxeles de Facebook, Twitter, Google e Instagram para medir tus campañas; se coordina con el webmaster del organizador.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'P_xeles de seguimiento%';
update catalog_items set titulo_comercial = 'Dashboard en tiempo real a tu medida', description = 'El dashboard estándar más datos por sesión e información demográfica de los asistentes, en tiempo real.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Dashboard personalizado%';
update catalog_items set titulo_comercial = 'Medición de visitas a stands', description = 'App para registrar visitas, capacitación a los expositores y entrega de bases de datos segmentadas de los visitantes de cada stand.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%visitas a stands%';
update catalog_items set titulo_comercial = 'Beneficios en el código QR', description = 'Cargamos los beneficios de cada tipo de entrada (VIP, alimentos, etc.) en el QR de cada asistente para validarlos al instante.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'M_dulo de beneficios asociados al QR%';
update catalog_items set titulo_comercial = 'Control en varios salones a la vez', description = 'Módulo para obtener datos de asistencia en diferentes salones o actividades simultáneas del evento; se habilita por cada salón.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%sitios simult%';
update catalog_items set titulo_comercial = 'Escarapela digital', description = 'Escarapela en el celular del asistente: video e instrucciones por correo, imagen del evento, logos con enlace, agenda y personal de apoyo.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Escarapela Digital';
update catalog_items set titulo_comercial = 'Recordatorios por WhatsApp o SMS', description = 'Mensajes de recordación en formato estándar de 200 caracteres, con automatización y envío por lotes.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%WhatsApp%';
update catalog_items set titulo_comercial = 'Encuestas de satisfacción', description = 'Motor de envío por correo; el organizador suministra las preguntas.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%encuestas de satisfacci%';
update catalog_items set titulo_comercial = 'Correo de agradecimiento', description = 'Motor de envío por correo; el organizador suministra el texto.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%agradecimiento%';
update catalog_items set titulo_comercial = 'Certificados de asistencia', description = 'Envío automático por correo; el organizador suministra textos, logos e imágenes.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%certificados de asistencia%';
update catalog_items set titulo_comercial = 'Informes finales de asistencia', description = 'Datos generales y segmentados de asistencia y flujo de información en cada espacio o sesión del evento.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Informes finales';
update catalog_items set titulo_comercial = 'Política de protección de datos propia', description = 'Espacio para personalizar el texto de protección de datos según las condiciones del organizador.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Protecci_n de datos';
update catalog_items set titulo_comercial = 'Pre-acreditación', description = 'Acreditación anticipada antes del evento, con personal, equipos y suministros, para que lleguen con su credencial lista. Se cobra por día.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Pre acreditaci_n';
update catalog_items set titulo_comercial = 'Control de alimentos y elementos', description = 'Control de las cantidades de alimentos o elementos que se entregan a los asistentes.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Control suministro%';
update catalog_items set titulo_comercial = 'Escarapelas físicas', description = 'Escarapelas impresas con el diseño del evento, una por asistente.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Suministro de escarapelas%';
update catalog_items set titulo_comercial = 'Manillas de acceso', description = 'Manillas de acceso con el diseño del evento, una por asistente.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Suministro de manillas';
update catalog_items set titulo_comercial = 'Branding en las credenciales', description = 'Personalización de la escarapela, física o digital, con la marca del evento y de sus aliados.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%dulo de branding%';
update catalog_items set titulo_comercial = 'Labels de seguridad para equipos', description = 'Habilitación del módulo para imprimir labels de seguridad que protegen los equipos de los asistentes.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike '%labels de seguridad%';
update catalog_items set titulo_comercial = 'Venta de boletería en el lugar del evento', description = 'Puntos de venta en el evento, con personal y datáfono, para vender y emitir entradas en sitio.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Venta de boleter_a en sitio';
update catalog_items set titulo_comercial = 'Escarapelas pre-impresas para invitados especiales', description = 'Escarapelas impresas con anticipación para invitados especiales, speakers y prensa.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Pre-impresi%';
update catalog_items set titulo_comercial = 'Capacitación a tu equipo (2 horas)', description = 'Capacitación de 2 horas al personal del organizador, o al que él suministre, en el manejo de la plataforma, los roles y las contingencias.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Capacitaci_n al Staff%';
update catalog_items set titulo_comercial = 'Chat privado entre asistentes', description = 'Salas privadas con búsqueda de asistentes y tarjeta virtual (v-card).'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Salas privadas de chats%';
update catalog_items set titulo_comercial = 'Chat completo del evento', description = 'Salas de chat públicas y privadas para que los asistentes conversen durante el evento.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Chat completo%';
update catalog_items set titulo_comercial = 'Avisos a tus asistentes', description = 'Notificaciones push para avisar a los asistentes durante el evento.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Notificaciones push';
update catalog_items set titulo_comercial = 'Salas de transmisión', description = 'Salas para transmitir el contenido del evento a tu audiencia virtual.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Salas de transmisi_n';
update catalog_items set titulo_comercial = 'Transmisión en tu propio sitio', description = 'Componente de transmisión incrustable (i-frame) en el sitio web del organizador.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'I-frame de transmisi_n';
update catalog_items set titulo_comercial = 'Registro dentro de tu sitio web', description = 'Entrega del componente de registro (iframe), adecuación de colores y tipografía, y pruebas.'
  where category = 'servicio_personalizado' and modality = 'general' and name ilike 'Iframe de registro';
