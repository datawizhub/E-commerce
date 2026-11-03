import { createSupabase } from "@/lib/supabase/server";
import { failure, json, sameOrigin } from "@/lib/supabase/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { error } = await (await createSupabase()).auth.signOut();
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
