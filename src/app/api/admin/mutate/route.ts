import { z } from "zod";
import { requireAdmin, StoreError } from "@/lib/supabase/auth";
import { failure, json, readJson, sameOrigin } from "@/lib/supabase/http";
import { parseMutation } from "@/lib/mutation-validation";
import { validateProduct, validatePromotion } from "@/lib/catalog";
import type { DemoState, Product, Promotion } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const client = await requireAdmin();
    const input = parseMutation(await readJson(request));
    if (input.kind === "product" || input.kind === "promotion") {
      const current = await client.rpc("admin_snapshot");
      if (current.error) throw current.error;
      const state = (current.data as unknown as { data: DemoState }).data;
      if (input.kind === "product") {
        const p = input.payload as Product;
        validateProduct(p, state.products);
        for (const [key, value] of Object.entries(p.attributes)) {
          const a = state.attributes.find((x) => x.key === key);
          if (!a)
            throw new StoreError(
              "An attribute no longer exists. Reload and try again.",
            );
          if (
            ((a.type === "text" || a.type === "select") &&
              typeof value !== "string") ||
            (a.type === "number" && typeof value !== "number") ||
            (a.type === "boolean" && typeof value !== "boolean") ||
            (a.type === "multi" && !Array.isArray(value))
          )
            throw new StoreError(`Enter a valid value for ${a.label}.`);
        }
      } else
        validatePromotion(
          input.payload as Promotion,
          state.promotions,
          state.products,
        );
    }
    const { data, error } = await client.rpc("admin_mutate", {
      kind: input.kind,
      payload: input.payload as Json,
      expected_version: input.expectedVersion,
      request_key: input.requestKey,
    });
    if (error) {
      if (error.code === "40001")
        throw new StoreError(
          "The store changed in another tab. Reload before saving again.",
          409,
        );
      if (error.code === "42501")
        throw new StoreError(
          "Your administrator session is no longer valid. Please sign in again.",
          403,
        );
      if (["23505", "23P01"].includes(error.code))
        throw new StoreError(
          "A URL, SKU, variant combination, or promotion period conflicts with an existing item.",
          409,
        );
      if (["23503", "23514", "P0001", "22P02"].includes(error.code))
        throw new StoreError(
          error.code === "P0001"
            ? error.message
            : "Some values are invalid or refer to an item that has changed.",
          400,
        );
      throw error;
    }
    const fresh = await client.rpc("admin_snapshot");
    // The write succeeded even if refreshing fails. Preserve its receipt for safe retries.
    return json({ saved: data, snapshot: fresh.error ? null : fresh.data });
  } catch (e) {
    if (e instanceof z.ZodError)
      return json(
        { error: e.issues[0]?.message ?? "Check the form values." },
        400,
      );
    if (e instanceof Error && !(e instanceof StoreError) && !("code" in e))
      return json({ error: e.message }, 400);
    return failure(e);
  }
}
