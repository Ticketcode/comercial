-- Correcciones de cálculos y catálogo acordadas para la V2 del módulo
-- Comercial. No borra filas (para no afectar propuestas reales ya
-- guardadas): solo cambia valores por defecto y textos del catálogo.
-- Las propuestas que ya tienen filas en proposal_cost_items conservan lo
-- que tienen guardado.

-- 1) Pre-acreditación de medio día (cambia el honorario del logístico).
alter table proposals
  add column preacreditacion_medio_dia boolean not null default false;

-- 2) El servicio "Pre acreditación" solo habilita el módulo: $120.000 por
--    día. Los $350.000 anteriores incluían la logística, que ahora se
--    calcula aparte en Logística 360.
update catalog_items set default_unit_price = 120000
  where category = 'servicio_personalizado'
  and name = 'Pre acreditación';

-- 3) Híbrido traía los 9 componentes de Mundo virtual marcados como
--    incluidos por defecto (0038 solo los desmarcó en Mundo virtual).
update catalog_items set default_included = false
  where category = 'componente_basico'
  and modality = 'hibrido'
  and name in (
    'Alcance Global de espacios y aforo esperado',
    'Construcción mundo virtual',
    'Experiencia de Usuario',
    'Interactividad / Networking',
    'Desarrollos, implementaciones y personalizaciones',
    'Infraestructura (Cloud server)',
    'Tiempo de producción y entrega',
    'Material',
    'Notas y no incluidos'
  );

-- 4) Servicios de Virtual opcionales: cada evento puede o no requerirlos.
update catalog_items set default_included = false
  where category = 'componente_basico'
  and modality = 'virtual'
  and name in (
    'Chroma Key',
    'Pregrabados',
    'Retransmisión a redes sociales',
    'Servicio traducción simultánea (Inglés - Español)',
    'Servicio lenguaje de señas'
  );

-- 5) Comisión de boletería única: 10% + $1.200 en todas las modalidades.
update catalog_items
  set description = replace(description, '9,9% + $950', '10% + $1.200')
  where category = 'componente_basico'
  and name = 'Módulo para venta de Boletería'
  and description like '%9,9% + $950%';

-- 6) Estos servicios van solo como Servicios personalizados, no en
--    Logística 360 (se desmarcan por defecto en vez de borrarse).
update catalog_items set default_included = false
  where category = 'logistica_360'
  and name in (
    'Suministro de manillas',
    'Suministro de escarapelas fisicas',
    'Módulo de branding (escarapela física y/o Digital)',
    'Habilitación módulo para impresión de () labels de seguridad (protección equipos)',
    'Venta de boletería en sitio'
  );
