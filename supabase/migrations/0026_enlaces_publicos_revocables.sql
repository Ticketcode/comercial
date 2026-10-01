-- Enlaces públicos revocables y cierre de legalización.
--
-- Hasta ahora /firmar/[id] y /legalizar/[id] usaban el id de la fila como "contraseña" del
-- enlace, y no había forma de anularlo. Ahora cada fila tiene un `token` propio:
--   * Las filas existentes arrancan con token = id, así los enlaces que ya se enviaron
--     siguen funcionando hasta que Producción decida regenerarlos.
--   * "Generar enlace nuevo" asigna un token aleatorio y el anterior deja de servir.
--   * Las filas nuevas reciben un token aleatorio automáticamente.
-- Las páginas públicas buscan SIEMPRE por token (con el cliente admin, desde el servidor).

alter table cuentas_cobro add column if not exists token uuid;
update cuentas_cobro set token = id where token is null;
alter table cuentas_cobro alter column token set default gen_random_uuid();
alter table cuentas_cobro alter column token set not null;
create unique index if not exists cuentas_cobro_token_key on cuentas_cobro (token);

alter table event_staff add column if not exists token uuid;
update event_staff set token = id where token is null;
alter table event_staff alter column token set default gen_random_uuid();
alter table event_staff alter column token set not null;
create unique index if not exists event_staff_token_key on event_staff (token);

-- Cierre de la legalización por persona: cerrada = la persona ya no puede editar desde su
-- enlace (Producción sí puede, y puede reabrirla).
alter table event_staff add column if not exists legalizacion_cerrada boolean not null default false;
