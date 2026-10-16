-- Datos que faltaban para generar la Presentación comercial (ver
-- docs/propuesta-deck/spec.json → known_issues): cargo del contacto del
-- cliente, datos de contacto del asesor comercial (en profiles, por
-- decisión del equipo) e impactos de marca estimados por evento.

alter table clients add column contact_cargo text;

alter table profiles add column cargo text;
alter table profiles add column correo text;
alter table profiles add column telefono text;

alter table proposals add column impactos_registro integer;
alter table proposals add column impactos_acreditacion integer;

-- Herramienta interna: cualquier usuario autenticado puede ver el
-- nombre/cargo/contacto de los demás (por ejemplo, para mostrar al asesor
-- comercial dueño de una propuesta en la Presentación), aunque solo puede
-- editar su propia fila (política "profiles: self update" ya existente).
create policy "profiles: read all internal" on profiles for select
  using (auth.uid() is not null);
