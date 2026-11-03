import sharp from "sharp";
import { requireAdmin, StoreError } from "@/lib/supabase/auth";
import { failure, json, sameOrigin } from "@/lib/supabase/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const client = await requireAdmin();
    const reader = request.body?.getReader();
    if (!reader) throw new StoreError("Choose an image.");
    let length = 0;
    const parts: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 11 * 1024 * 1024) {
        await reader.cancel();
        throw new StoreError("Choose an image smaller than 10 MB.", 413);
      }
      parts.push(value);
    }
    const form = await new Response(new Uint8Array(Buffer.concat(parts)), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024)
      throw new StoreError(
        "Choose a JPG, PNG, or WebP image smaller than 10 MB.",
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    let processed;
    try {
      const meta = await sharp(bytes, {
        limitInputPixels: 40_000_000,
      }).metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
        (meta.pages ?? 1) > 1
      )
        throw new Error("format");
      processed = await sharp(bytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new StoreError(
        "This image could not be decoded. Choose a static JPG, PNG, or WebP.",
      );
    }
    const id = crypto.randomUUID(),
      path = `${id}.webp`;
    const upload = await client.storage
      .from("catalog-media")
      .upload(path, processed.data, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "300",
      });
    if (upload.error) throw upload.error;
    const registered = await client.rpc("register_asset", {
      asset_id: id,
      storage_path: path,
      width: processed.info.width,
      height: processed.info.height,
      alt_text: String(form.get("alt") ?? "").slice(0, 500),
    });
    if (registered.error) throw registered.error;
    return json({ id, src: `/api/media/${id}` }, 201);
  } catch (e) {
    return failure(e);
  }
}
