-- Firma digital de cuentas de cobro: el enlace público /firmar/[id] usa el
-- id (uuid, ya no adivinable) como token de acceso — se sirve SIEMPRE con
-- el cliente admin (service role) desde el servidor, nunca desde el
-- cliente ni vía RLS pública, así que no hace falta abrir políticas nuevas
-- ni exponer la tabla completa a usuarios anónimos.
alter table cuentas_cobro add column firma_nombre text;
