import "server-only";
import { NextResponse } from "next/server";
import { StoreError } from "./auth";
import { sameRequestOrigin } from "@/lib/backend-contract";
export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
export function sameOrigin(request: Request) {
  if (!sameRequestOrigin(request))
    throw new StoreError(
      "Please submit this form from the store website.",
      403,
    );
}
export async function readJson(request: Request, limit = 2_000_000) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new StoreError("This request is too large.", 413);
  const reader = request.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (!reader) throw new StoreError("Request body is missing.");
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new StoreError("This request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new StoreError("Invalid request data.");
  }
}
export function failure(error: unknown) {
  if (error instanceof StoreError)
    return json({ error: error.message }, error.status);
  console.error("Store request failed", {
    type: error instanceof Error ? error.name : "unknown",
  });
  return json(
    { error: "The store could not complete this request. Please try again." },
    503,
  );
}
