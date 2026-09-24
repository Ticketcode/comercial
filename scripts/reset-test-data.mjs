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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Borra las propuestas de prueba (cascada borra proposal_cost_items) y los
// catalog_items de servicio_personalizado mal sembrados (off-by-one).
const { error: e1 } = await supabase
  .from("proposals")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (e1) throw e1;
const { error: e2 } = await supabase
  .from("catalog_items")
  .delete()
  .eq("category", "servicio_personalizado");
if (e2) throw e2;
console.log("Limpio.");
