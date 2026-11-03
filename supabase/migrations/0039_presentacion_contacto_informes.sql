-- Permite editar desde la Presentación la lámina de Contacto (datos del
-- asesor, solo para esta propuesta, sin tocar su perfil) y la lista de
-- Informes y entregables. NULL = usar los datos del perfil / la lista por
-- defecto de la plantilla.
alter table proposals add column presentacion_contacto jsonb;
alter table proposals add column presentacion_informes text[];
