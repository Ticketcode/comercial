-- Firma a mano (trazo en canvas) además del nombre escrito — se guarda
-- como PNG en base64 (data URL) para mostrarla en el módulo interno y
-- embeberla en el paquete .docx.
alter table cuentas_cobro add column firma_imagen text;
