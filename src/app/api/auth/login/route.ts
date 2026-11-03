import { z } from "zod";
import { createSupabase } from "@/lib/supabase/server";
import { failure, json, readJson, sameOrigin } from "@/lib/supabase/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({ email: z.email(), password: z.string().min(1).max(256) })
      .parse(await readJson(request, 4096));
    const client = await createSupabase();
    const { error } = await client.auth.signInWithPassword(input);
    if (error)
      return json(
        {
          error: "Sign-in failed. Check your email and password and try again.",
        },
        401,
      );
    const check = await client.rpc("is_store_admin");
    if (check.error || check.data !== true) {
      await client.auth.signOut();
      return json(
        { error: "This account does not have store administrator access." },
        403,
      );
    }
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: "Enter a valid email and password." }, 400);
    return failure(e);
  }
}
