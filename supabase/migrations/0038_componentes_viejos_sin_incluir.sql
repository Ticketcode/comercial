-- Los componentes básicos de streaming/mundo virtual ya se movieron a
-- Servicios personalizados (migración 0037). Las filas viejas de
-- Componentes básicos con estos mismos nombres se dejan en la base (no se
-- borran, para no afectar propuestas reales ya guardadas) pero se marcan
-- como NO incluidas por defecto, para que una propuesta nueva no las
-- muestre ya marcadas y duplicadas junto a la versión con precio.

update catalog_items set default_included = false
  where category = 'componente_basico'
  and modality in ('virtual', 'hibrido')
  and name in (
    'Visita Pre-producción (master en sitio)',
    'Preproducción remota',
    'Landing de transmisión',
    'Canal dedicado Streaming',
    'Salas de streaming simultáneas',
    'Master de transmisión',
    'Asesoria pre-producción',
    'Suministro de personal soporte audiovisual',
    'Cámaras',
    'Sonido',
    'Soporte técnico',
    'Entrega de material / grabaciones',
    'Informes'
  );

update catalog_items set default_included = false
  where category = 'componente_basico'
  and modality = 'mundo_virtual'
  and name in (
    'Alcance Global de espacios y aforo esperado',
    'Construcción mundo virtual',
    'Experiencia de Usuario',
    'Interactividad / Networking',
    'Desarrollos, implementaciones y personalizaciones',
    'Infraestructura (Cloud server)',
    'Landing de transmisión',
    'Tiempo de producción y entrega',
    'Material',
    'Notas y no incluidos'
  );
