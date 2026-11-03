import { z } from "zod";
import { readCatalog } from "@/lib/supabase/catalog";
import { failure, json } from "@/lib/supabase/http";
export async function GET(request: Request) {
  try {
    return json(await readCatalog(new URL(request.url).searchParams));
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: "Check the catalog filters." }, 400);
    return failure(e);
  }
}
