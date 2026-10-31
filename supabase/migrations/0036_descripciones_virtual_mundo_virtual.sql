-- Completa las descripciones de los componentes básicos de modalidad
-- "virtual" (streaming) y "mundo_virtual" que venían sin texto — las
-- mismas filas para modalidad "hibrido" ya tenían esta descripción
-- cargada, pero cada modalidad guarda su propia fila en catalog_items.
-- Se filtra también por categoría para no tocar un ítem del mismo nombre
-- en otra categoría (ej. "Soporte técnico" también existe en logística 360).

-- Virtual - Streaming (pre-producción, producción, postproducción)
update catalog_items set description =
  'Incluye: Revisión de todos los componentes del plan logístico (Flujo de ingreso, Prueba de Internet, revisión de conexiones eléctricas, sesiones internas, centro de operaciones)'
  where name = 'Visita Pre-producción (master en sitio)' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: asesoria en buenas prácticas, validación de componentes de la transmisión (agenda, status speakers, piezas de diseño de la transmisión)'
  where name = 'Preproducción remota' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Interface optimizada (hosting, infraestructura, componentes de seguridad) para la transmisión del contenido'
  where name = 'Landing de transmisión' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Hosting e infraestructura para soportar el aforo esperado'
  where name = 'Canal dedicado Streaming' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Configuración de (x) salas simultáneas, habilitación de utilidades (chat, salas privadas, v-card)'
  where name = 'Salas de streaming simultáneas' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Capturadora, switch, canal, servidores, portatil, () camaras, () micrófonos'
  where name = 'Master de transmisión' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: entrega de formatos para minutograma, formato de piezas standar para la transmisión (cortinillas, tituladores, aperturas, cierres, overlays)'
  where name = 'Asesoria pre-producción' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: () Productores, (x) asistentes de cámaras, (x) asistente emisión y sonido'
  where name = 'Suministro de personal soporte audiovisual' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: suministro de (x) cámaras profesionales'
  where name = 'Cámaras' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: consola de sonido, (x) microfonos'
  where name = 'Sonido' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: mesa de ayuda remota, atención y solución a problemas técnicos, respaldo de operaciones'
  where name = 'Soporte técnico' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Material completo o cortado en formato h.264 (calidad streaming)'
  where name = 'Entrega de material / grabaciones' and modality = 'virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Informe detallado de asistentes a nivel general, por sala, por franja'
  where name = 'Informes' and modality = 'virtual' and category = 'componente_basico';

-- Virtual - Mundo Virtual
update catalog_items set description =
  E'Incluye: 2 mundos virtuales paralelos (Premium y básico)\nPremium: Contiene 1 Lobby, un auditorio y muestra comercial de hasta 10 stands\nBásico: Contiene 1 Lobby, auditorio + transición para pago y acceso a Premium\nAforo esperado/recurrencia: 30.000 a 35.000 personas por día'
  where name = 'Alcance Global de espacios y aforo esperado' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: 2 propuestas de línea arquitectónica, modelado y diseño 3D, renderizaciónes, producción final (máxima calidad)'
  where name = 'Construcción mundo virtual' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Diseño de interfaz UX, Diseño de navegabilidad e interactividad'
  where name = 'Experiencia de Usuario' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: 1 sala global de chat, 7 salas temáticas de chat, tarjetas virtuales de negocios'
  where name = 'Interactividad / Networking' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Menú de navegación, mapa de navegación, múltiples espacios de branding del organizador y/o aliados o patrocinadores, muestra comercial con chat y video llamada para asesores comerciales, métricas de ingreso y participación para cada espacio'
  where name = 'Desarrollos, implementaciones y personalizaciones' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Alojamiento de AssetBundle para backgrounds, imagenes y gifs, creación de entornos y repositorios para pruebas y producción, Cloudserver para Backend webVR'
  where name = 'Infraestructura (Cloud server)' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'Incluye: Interfaz robusta, elástica y optimizada para el tráfico durante los días de la transmisión, internet de la transmisión acoplada, protocolos de seguridad y privacidad'
  where name = 'Landing de transmisión' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  '30 días hábiles, incluye (propuestas, ajustes, pre-renders, renders, versión producción (máxima calidad)'
  where name = 'Tiempo de producción y entrega' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  'El organizador debe suministrar: Imágenes, logos, videos, textos, documentos, propios y/o de sus aliados según corresponda para los espacios de los mundos virtuales'
  where name = 'Material' and modality = 'mundo_virtual' and category = 'componente_basico';

update catalog_items set description =
  E'- Todo el contenido de la transmisión debe ser entregado listo y marcado (con tituladores, créditos, cortinillas...etc)\n- Podemos realizar la retransmisión a redes sociales con la autorización y permisos en los canales (Facebook, Youtube)\n- La propuesta no incluye: Diseño de piezas del streaming, pre-producción, producción, postproducción audiovisual'
  where name = 'Notas y no incluidos' and modality = 'mundo_virtual' and category = 'componente_basico';
