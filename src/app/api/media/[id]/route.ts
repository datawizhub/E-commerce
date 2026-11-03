import { z } from "zod";
import { createSupabase } from "@/lib/supabase/server";
import { failure, json } from "@/lib/supabase/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      return json({ error: "Image not found." }, 404);
    const client = await createSupabase();
    const access = await client.rpc("media_access", { asset_id: id });
    const asset = access.data as {
      bucket: string;
      path: string;
      admin: boolean;
    } | null;
    if (access.error) throw access.error;
    if (!asset) return json({ error: "Image not found." }, 404);
    const signed = await client.functions.invoke("catalog-media-url", {
      body: { assetId: id },
    });
    if (signed.error || typeof signed.data?.url !== "string")
      throw signed.error ?? new Error("Image signing failed");
    return new Response(null, {
      status: 307,
      headers: {
        Location: signed.data.url,
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
