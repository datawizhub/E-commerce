import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await client.rpc("product_snapshot", {
  slug: "integration-test-shirt",
});
if (error) throw error;
const p = data.data.products.find((p) => p.slug === "integration-test-shirt");
assert(p, "Run only while the approved QA shirt is temporarily published.");
const id = p.image.split("/").at(-1),
  path = `${id}.webp`;
const direct = await client.storage
  .from("catalog-media")
  .createSignedUrl(path, 86400);
assert(direct.error, "Public direct Storage signing must be denied.");
assert(!direct.data?.signedUrl);
const signed = await client.functions.invoke("catalog-media-url", {
  body: { assetId: id, expiresIn: 86400 },
});
if (signed.error) {
  console.error({
    error: signed.error.message,
    response: await signed.error.context?.text?.(),
  });
  throw signed.error;
}
assert.equal(signed.data.expiresIn, 300);
const token = new URL(signed.data.url).searchParams.get("token");
const claims = JSON.parse(
  Buffer.from(token.split(".")[1], "base64url").toString(),
);
assert(claims.exp - Math.floor(Date.now() / 1000) <= 301);
assert(claims.exp > Math.floor(Date.now() / 1000));
assert.equal((await fetch(signed.data.url)).status, 200);
const route = await fetch(`http://127.0.0.1:3000${p.image}`, {
  redirect: "manual",
});
assert.equal(route.status, 307);
console.log(
  "PASS: direct anonymous signing denied, privileged signer caps public expiry at 300 seconds, WebP delivery and local media redirect work.",
);
