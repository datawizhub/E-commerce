import { createSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { failure, json } from "@/lib/supabase/http";
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("admin") === "1";
    const client = admin ? await requireAdmin() : await createSupabase();
    const { data, error } = await client.rpc(
      admin ? "admin_snapshot" : "store_snapshot",
    );
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
