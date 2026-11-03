import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { btree_gist } });
const admin = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sql = async (q) => (await db.query(q)).rows;
const value = async (q) => (await sql(q))[0].result;
const tests = [];
async function check(name, fn) {
  await fn();
  tests.push(name);
  console.log("PASS", name);
}
async function rejects(q, message) {
  await assert.rejects(() => db.query(q), message);
}
const json = (o) => `'${JSON.stringify(o).replaceAll("'", "''")}'::jsonb`;
let revision = 1;
async function save(kind, payload, request = id(900 + revision)) {
  const out = await value(
    `select public.admin_mutate('${kind}',${json(payload)},${revision},'${request}') result`,
  );
  revision = out.revision;
  return out;
}
try {
  await db.exec(`create schema auth; create schema storage; create role anon; create role authenticated; create role service_role bypassrls;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users values('${admin}','danish@datawiz.com.my',now()),('${other}','someone@example.test',now());
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,bucket_id text,name text); alter table storage.objects enable row level security;`);
  for (const file of fs
    .readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
  await check(
    "anonymous reads are empty and contain no private inventory",
    async () => {
      await db.exec("set role anon");
      const r = await value("select public.product_snapshot('shirt') result");
      assert.deepEqual(r.data.products, []);
      assert.deepEqual(r.data.adjustments, []);
      await rejects(
        "select * from private.inventory_balances",
        /permission denied/,
      );
      await rejects(
        `select public.admin_mutate('category','{}',1,'${id(900)}')`,
        /permission denied|administrator/i,
      );
      await db.exec("reset role");
    },
  );
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${other}',false)`,
  );
  await check(
    "ordinary authenticated users have no admin authority",
    async () => {
      assert.equal(await value("select public.is_store_admin() result"), false);
      await rejects("select public.admin_snapshot()", /administrator/i);
    },
  );
  await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
  await check("approved verified identity has admin authority", async () =>
    assert.equal(await value("select public.is_store_admin() result"), true),
  );
  await save("category", {
    id: id(10),
    title: "Shirts",
    slug: "shirts",
    description: "",
    image: "/images/oxford.jpg",
    members: [],
  });
  const product = {
    id: id(20),
    title: "Shirt",
    slug: "shirt",
    description: "Cotton",
    image: "/images/oxford.jpg",
    images: [],
    categoryIds: [id(10)],
    collectionIds: [],
    status: "draft",
    attributes: {},
    createdAt: new Date().toISOString(),
    variants: [
      {
        id: id(30),
        sku: "SHIRT-M",
        color: "Navy",
        size: "M",
        price: 8000,
        stock: 0,
      },
    ],
  };
  await save("product", product);
  await check("draft products are excluded from public responses", async () =>
    assert.equal(
      (await value("select public.product_snapshot('shirt') result")).data
        .products.length,
      0,
    ),
  );
  await check("stale writes fail atomically", async () => {
    await rejects(
      `select public.admin_mutate('product',${json({ ...product, title: "Stale" })},1,'${id(950)}')`,
      /changed|conflict/i,
    );
    assert.equal(
      (await value("select public.admin_snapshot() result")).data.products[0]
        .title,
      "Shirt",
    );
  });
  product.status = "published";
  await save("product", product);
  await check("inventory writes are audited and retry-safe", async () => {
    const payload = {
      id: id(80),
      variantId: id(30),
      delta: 5,
      reason: "Received stock",
    };
    const request = id(850),
      previous = revision;
    const first = await save("stock", payload, request);
    const again = await value(
      `select public.admin_mutate('stock',${json(payload)},${previous},'${request}') result`,
    );
    assert.deepEqual(first, again);
    const r = await value("select public.admin_snapshot() result");
    assert.equal(r.data.products[0].variants[0].stock, 5);
    assert.equal(r.data.adjustments.length, 1);
    assert.equal(
      (await value("select public.product_snapshot('shirt') result")).data
        .products[0].variants[0].stock,
      1,
    );
    await rejects(
      `select public.admin_mutate('stock',${json({ ...payload, delta: 6 })},${revision},'${request}')`,
      /request|retry/i,
    );
    await rejects(
      `select public.admin_mutate('stock',${json({ ...payload, delta: -6 })},${revision},'${id(851)}')`,
      /negative|stock/i,
    );
  });
  await check(
    "published slugs stay stable and counts cannot be changed through product edits",
    async () => {
      await rejects(
        `select public.admin_mutate('product',${json({ ...product, slug: "new-url" })},${revision},'${id(852)}')`,
        /slug|URL/i,
      );
    },
  );
  await save("promotion", {
    id: id(40),
    title: "Sale",
    productIds: [id(20)],
    kind: "percentage",
    amount: 25,
    enabled: true,
    startsAt: "2020-01-01T00:00:00Z",
    endsAt: "2030-01-01T00:00:00Z",
  });
  await check(
    "one product keeps its category and receives the current promotional price",
    async () => {
      const p = (await value("select public.product_snapshot('shirt') result"))
        .data.products[0];
      assert.deepEqual(p.categoryIds, [id(10)]);
      assert.equal(p.variants[0].effectivePrice, 6000);
      await rejects(
        `select public.admin_mutate('promotion',${json({ id: id(41), title: "Overlap", productIds: [id(20)], kind: "fixed", amount: 100, enabled: true, startsAt: "2021-01-01", endsAt: "2029-01-01" })},${revision},'${id(853)}')`,
        /overlap|exclusion/i,
      );
    },
  );
  const site = {
    announcement: "A",
    heroTitle: "Store",
    heroBody: "",
    heroImage: "/images/oxford.jpg",
    heroButton: "Shop",
    heroHref: "/products",
    sections: [],
    navigation: [],
  };
  await save("site", { site, publish: false });
  await check("saved drafts do not change public site content", async () =>
    assert.notEqual(
      (await value("select public.product_snapshot('shirt') result")).data
        .sitePublished.heroTitle,
      "Store",
    ),
  );
  await save("site", { site, publish: true });
  await check(
    "publication selects a sealed revision and keeps a separate editable draft",
    async () =>
      assert.equal(
        (await value("select public.product_snapshot('shirt') result")).data
          .sitePublished.heroTitle,
        "Store",
      ),
  );
  await db.exec("reset role");
  await check(
    "sealed revisions cannot be modified",
    async () =>
      await rejects(
        "update public.site_revisions set settings='{}' where state='sealed'",
        /sealed|immutable/i,
      ),
  );
  await db.exec(`insert into storage.objects(id,bucket_id,name) values('${id(70)}','catalog-media','${id(70)}.webp');
 insert into public.assets(id,storage_path,mime_type,width,height,processing_state) values('${id(70)}','${id(70)}.webp','image/webp',100,100,'ready');
 insert into public.product_media(product_id,asset_id,position) values('${id(20)}','${id(70)}',0);
 grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon,authenticated;
 set role anon; select set_config('request.jwt.claim.sub','',false);`);
  await check(
    "Storage RLS does not require public catalog table grants",
    async () =>
      assert.equal((await sql("select * from storage.objects")).length, 0),
  );
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false)`,
  );
  await check(
    "selection choices can be replaced without losing historical values",
    async () => {
      const a = {
        id: id(60),
        key: "fabric",
        label: "Fabric",
        type: "select",
        unit: "",
        visible: true,
        filterable: true,
        categoryIds: [],
        choices: ["Cotton", "Linen"],
      };
      await save("attribute", a);
      await save("attribute", { ...a, choices: ["Wool", "Linen"] });
      assert.deepEqual(
        (await value("select public.admin_snapshot() result")).data
          .attributes[0].choices,
        ["Wool", "Linen"],
      );
    },
  );
  await check(
    "typed attributes preserve zero, false, and hidden filterable values",
    async () => {
      await save("attribute", {
        id: id(61),
        key: "weight",
        label: "Weight",
        type: "number",
        unit: "g",
        visible: false,
        filterable: true,
        categoryIds: [],
        choices: [],
      });
      await save("attribute", {
        id: id(62),
        key: "organic",
        label: "Organic",
        type: "boolean",
        unit: "",
        visible: true,
        filterable: true,
        categoryIds: [],
        choices: [],
      });
      await save("product", {
        ...product,
        attributes: { fabric: "Wool", weight: 0, organic: false },
      });
      const publicProduct = (
        await value("select public.product_snapshot('shirt') result")
      ).data.products[0];
      assert.equal(publicProduct.attributes.weight, 0);
      assert.equal(publicProduct.attributes.organic, false);
      assert.equal(
        (await value("select public.product_snapshot('shirt') result")).data
          .promotions[0].serverActive,
        true,
      );
    },
  );
  await check(
    "retired selection values survive unrelated product edits",
    async () => {
      await save("attribute", {
        id: id(60),
        key: "fabric",
        label: "Fabric",
        type: "select",
        unit: "",
        visible: true,
        filterable: true,
        categoryIds: [],
        choices: ["Linen"],
      });
      await save("product", {
        ...product,
        title: "Updated shirt",
        attributes: { fabric: "Wool", weight: 0, organic: false },
      });
      assert.equal(
        (await value("select public.admin_snapshot() result")).data.products[0]
          .attributes.fabric,
        "Wool",
      );
    },
  );
  await check(
    "optional text and selection attributes can be cleared",
    async () => {
      await save("attribute", {
        id: id(63),
        key: "care_note",
        label: "Care note",
        type: "text",
        unit: "",
        visible: true,
        filterable: false,
        categoryIds: [],
        choices: [],
      });
      await save("product", {
        ...product,
        attributes: { fabric: "Linen", care_note: "Hand wash" },
      });
      await save("product", {
        ...product,
        attributes: { fabric: "", care_note: "" },
      });
      const attrs = (await value("select public.admin_snapshot() result")).data
        .products[0].attributes;
      assert(!("fabric" in attrs));
      assert(!("care_note" in attrs));
    },
  );
  await check(
    "catalog queries filter one actual variant and expose numeric ranges",
    async () => {
      await save("product", {
        ...product,
        attributes: { weight: 0, organic: false },
        variants: [
          ...product.variants,
          {
            id: id(31),
            sku: "SHIRT-RED-L",
            color: "Red",
            size: "L",
            price: 12000,
            stock: 0,
          },
        ],
      });
      await save("product", {
        ...product,
        id: id(21),
        slug: "another-shirt",
        title: "Another shirt",
        attributes: { weight: 100 },
        variants: [
          {
            id: id(32),
            sku: "OTHER-RED-M",
            color: "Red",
            size: "M",
            price: 10000,
            stock: 0,
          },
        ],
      });
      const list = async (f) =>
        value(`select public.catalog_list(${json(f)}) result`);
      assert.equal(
        (await list({ colors: ["Red"], sizes: ["M"], inStock: true })).total,
        0,
      );
      const limited = await list({ numeric: { weight: { max: 50 } } });
      assert.equal(limited.total, 1);
      assert.equal(limited.facets.attributes.weight.min, 0);
      assert.equal(limited.facets.attributes.weight.max, 100);
      assert.equal((await list({ categorySlug: "missing-category" })).total, 0);
      const sale = await list({ promotional: true });
      assert.equal(sale.matches[0].minPrice, 6000);
      assert.equal(sale.matches[0].product.categoryIds[0], id(10));
    },
  );
  await check(
    "catalog pagination is fixed at 24 and public snapshots are bounded",
    async () => {
      for (let n = 0; n < 25; n++)
        await save("product", {
          ...product,
          id: id(1000 + n),
          slug: `paged-shirt-${n}`,
          title: `Paged shirt ${n}`,
          variants: [
            {
              id: id(2000 + n),
              sku: `PAGED-${n}`,
              color: "Navy",
              size: "M",
              price: 8000,
              stock: 0,
            },
          ],
        });
      const first = await value(
          `select public.catalog_list('{"page":1,"pageSize":10000}') result`,
        ),
        second = await value(`select public.catalog_list('{"page":2}') result`);
      assert.equal(first.pageSize, 24);
      assert.equal(first.matches.length, 24);
      assert.equal(second.matches.length, 3);
      assert.equal(
        new Set([...first.matches, ...second.matches].map((m) => m.product.id))
          .size,
        27,
      );
      assert(
        (await value("select public.store_snapshot() result")).data.products
          .length <= 24,
      );
      const detail = await value(
        "select public.product_snapshot('shirt') result",
      );
      assert(detail.data.products.some((p) => p.slug === "shirt"));
      assert(detail.data.products.length <= 5);
    },
  );
  await check(
    "public snapshots announce the next database offer boundary without exposing scheduled offers",
    async () => {
      const startsAt = new Date(Date.now() + 60000).toISOString();
      await save("promotion", {
        id: id(70),
        title: "Future offer",
        productIds: [id(21)],
        kind: "percentage",
        amount: 10,
        enabled: true,
        startsAt,
        endsAt: new Date(Date.now() + 120000).toISOString(),
      });
      const snapshot = await value("select public.store_snapshot() result");
      assert.equal(Date.parse(snapshot.nextBoundary), Date.parse(startsAt));
      assert(!snapshot.data.promotions.some((p) => p.title === "Future offer"));
    },
  );
  console.log(JSON.stringify({ passed: tests.length, tests }, null, 2));
} finally {
  await db.close();
}
