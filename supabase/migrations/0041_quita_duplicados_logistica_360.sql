-- Estos cinco servicios van SOLO como Servicios personalizados, no en
-- Logística 360. Se eliminan de Logística 360 (en todas las modalidades).
--
-- OJO: proposal_catalog_selections.catalog_item_id tiene ON DELETE CASCADE,
-- así que las propuestas ya guardadas que hubieran marcado estos ítems en
-- Logística 360 dejan de tenerlos en esa sección. No afecta a los servicios
-- personalizados con el mismo nombre (viven en otra categoría).
delete from catalog_items
  where category = 'logistica_360'
  and name in (
    'Suministro de manillas',
    'Suministro de escarapelas fisicas',
    'Módulo de branding (escarapela física y/o Digital)',
    'Habilitación módulo para impresión de () labels de seguridad (protección equipos)',
    'Venta de boletería en sitio'
  );
