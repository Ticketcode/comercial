-- Renombra el servicio personalizado "Iframe" a "Iframe de registro" para
-- distinguirlo de "I-frame de transmisión" (streaming). El nombre exacto en
-- producción puede variar ligeramente en guion/mayúsculas según cómo se
-- cargó desde el Excel, así que se cubren las variantes más probables.
update catalog_items
set name = 'Iframe de registro'
where name in ('Iframe', 'I-frame', 'iframe', 'I-Frame')
  and name <> 'I-frame de transmisión';
