import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const [, , email, password, fullName, role] = process.argv;
if (!email || !password) {
  console.error("Uso: node scripts/create-user.mjs <email> <password> [nombre] [comercial|produccion|admin]");
  process.exit(1);
}
if (role && !["comercial", "produccion", "admin"].includes(role)) {
  console.error("Rol inválido. Usa: comercial, produccion o admin.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: fullName ? { full_name: fullName } : undefined,
});

if (error) {
  console.error(error);
  process.exit(1);
}
console.log("Usuario creado:", data.user.id, data.user.email);

if (role && role !== "comercial") {
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", data.user.id);
  if (roleError) {
    console.error("Usuario creado pero falló al asignar el rol:", roleError);
    process.exit(1);
  }
  console.log("Rol asignado:", role);
}
