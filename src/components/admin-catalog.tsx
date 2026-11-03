"use client";
import { backendEnabled } from "@/lib/backend-contract";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, ArrowUpRight, Search, Trash2, RotateCcw } from "lucide-react";
import { commit, resetDemo, useDemo, uploadImage } from "@/lib/store";
import {
  filterProducts,
  money,
  promotionStatus,
  slugify,
  validateProduct,
  validatePromotion,
} from "@/lib/catalog";
import type { Product, Variant, Group, AttributeDefinition } from "@/lib/types";
import { CheckList, Empty, Feedback, ImagePicker, Modal } from "./ui";
export function AdminHeading({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {children}
    </div>
  );
}
export function Overview() {
  const { data } = useDemo();
  const [reset, setReset] = useState(false),
    [error, setError] = useState("");
  const count = filterProducts(data.products, data.promotions, {}).length;
  return (
    <>
      <AdminHeading
        title="A little care, every day."
        body="Your collection, content, and the details that bring them together."
      >
        <Link className="button secondary" href="/">
          View storefront
          <ArrowUpRight size={17} />
        </Link>
      </AdminHeading>
      <section className="overview-intro">
        <div>
          <h2>Your store is taking shape.</h2>
          <p>
            Build the collection one piece at a time.{" "}
            {backendEnabled
              ? "Your changes are saved to your connected store."
              : "Everything here is a local preview, ready for you to explore."}
          </p>
          <Link className="button" href="/admin/products/new">
            <Plus size={17} />
            Add a product
          </Link>
        </div>
        <Image
          src="/images/studio.jpg"
          alt="Clothing store interior"
          width={550}
          height={340}
          unoptimized
        />
      </section>
      <div className="overview-columns">
        <section>
          <h2>At a glance</h2>
          <dl className="overview-stats">
            <div>
              <dt>Published pieces</dt>
              <dd>{count}</dd>
            </div>
            <div>
              <dt>Draft products</dt>
              <dd>
                {data.products.filter((p) => p.status === "draft").length}
              </dd>
            </div>
            <div>
              <dt>Active offers</dt>
              <dd>
                {
                  data.promotions.filter((p) => promotionStatus(p) === "Active")
                    .length
                }
              </dd>
            </div>
            <div>
              <dt>Out-of-stock variants</dt>
              <dd>
                {
                  data.products
                    .flatMap((p) => p.variants)
                    .filter((v) => !v.stock).length
                }
              </dd>
            </div>
          </dl>
        </section>
        <section>
          <h2>Make it yours</h2>
          <div className="task-links">
            <Link href="/admin/products">
              Manage the collection
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/admin/homepage">
              Arrange the homepage
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/admin/promotions">
              Create a simple offer
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/admin/attributes">
              Add descriptive attributes
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </div>
      {!backendEnabled ? (
        <section className="demo-settings">
          <div>
            <h2>Local demo settings</h2>
            <p>
              Sample products and photography. Edits stay in this browser; no
              backend is connected.
            </p>
          </div>
          <button className="button secondary" onClick={() => setReset(true)}>
            <RotateCcw size={16} />
            Reset demo
          </button>
        </section>
      ) : null}
      <Modal
        title="Reset this demo?"
        open={reset}
        onClose={() => setReset(false)}
      >
        <p>
          This removes your saved local edits and restores the sample
          collection, offers, and site content.
        </p>
        <Feedback error={error} />
        <div className="form-actions">
          <button className="button secondary" onClick={() => setReset(false)}>
            Keep my edits
          </button>
          <button
            className="button danger"
            onClick={() => {
              try {
                resetDemo();
                setReset(false);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Restore sample data
          </button>
        </div>
      </Modal>
    </>
  );
}
export function Products() {
  const { data } = useDemo();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("all");
  const products = data.products.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      `${p.title} ${p.variants.map((v) => v.sku).join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <AdminHeading
        title="Products"
        body="The pieces at the heart of your store."
      >
        <Link className="button" href="/admin/products/new">
          <Plus size={17} />
          Add product
        </Link>
      </AdminHeading>
      <div className="admin-toolbar">
        <label className="search-input">
          <Search size={18} />
          <input
            placeholder="Search products or SKU"
            aria-label="Search products or SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="Product status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["all", "published", "draft", "archived"].map((v) => (
            <option key={v} value={v}>
              {v === "all" ? "All statuses" : v}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Inventory</th>
              <th>Price</th>
              <th>Variants</th>
              <th>
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link
                    className="table-product"
                    href={`/admin/products/${p.id}`}
                  >
                    <Image
                      src={p.image}
                      alt=""
                      width={46}
                      height={58}
                      unoptimized
                    />
                    <span>
                      {p.title}
                      <small>{p.slug}</small>
                    </span>
                  </Link>
                </td>
                <td>
                  <span
                    className={`badge ${p.status === "published" ? "green" : ""}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td>
                  {p.variants.reduce((sum, v) => sum + v.stock, 0)} in stock
                </td>
                <td>{money(Math.min(...p.variants.map((v) => v.price)))}</td>
                <td>{p.variants.length}</td>
                <td>
                  <Link className="text-link" href={`/admin/products/${p.id}`}>
                    Edit
                    <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!products.length ? (
        <Empty
          title="No products found"
          body="Try another search or add your first piece."
        />
      ) : null}
      <p className="table-note">
        {products.length} products · published items appear immediately in the
        local storefront.
      </p>
    </>
  );
}
function blankProduct(): Product {
  return {
    id: crypto.randomUUID(),
    title: "",
    slug: "",
    description: "",
    image: "/images/white-tee.jpg",
    images: [],
    categoryIds: [],
    collectionIds: [],
    status: "draft",
    attributes: {},
    createdAt: new Date().toISOString(),
    variants: [
      {
        id: crypto.randomUUID(),
        sku: "",
        color: "",
        size: "",
        price: 0,
        stock: 0,
      },
    ],
  };
}
export function ProductEditor({ id }: { id?: string }) {
  const { data } = useDemo();
  const existing = data.products.find((p) => p.id === id);
  if (id && !existing)
    return (
      <Empty
        title="Product not found"
        body="Return to the product list to select a piece."
      >
        <Link href="/admin/products">All products</Link>
      </Empty>
    );
  return <ProductForm key={id ?? "new"} initial={existing ?? blankProduct()} />;
}
function ProductForm({ initial }: { initial: Product }) {
  const { data } = useDemo();
  const router = useRouter();
  const [p, setP] = useState<Product>(() => structuredClone(initial)),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [uploading, setUploading] = useState(false);
  const persisted = data.products.some((x) => x.id === p.id);
  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setP({ ...p, [key]: value });
  const variant = (id: string, key: keyof Variant, value: string | number) =>
    set(
      "variants",
      p.variants.map((v) => (v.id === id ? { ...v, [key]: value } : v)),
    );
  const save = async () => {
    try {
      validateProduct(p, data.products);
      const products = [...data.products.filter((x) => x.id !== p.id), p];
      for (const promotion of data.promotions.filter(
        (x) => x.enabled && x.productIds.includes(p.id),
      )) {
        if (p.status === "published")
          validatePromotion(promotion, data.promotions, products);
      }
      await commit((s) => ({ ...s, products }));
      setError("");
      setMessage(
        "Product saved. Published changes are visible in the storefront.",
      );
      if (!persisted) router.replace(`/admin/products/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
      setMessage("");
    }
  };
  return (
    <>
      <AdminHeading
        title={persisted ? p.title || "Edit product" : "Add a product"}
        body="Start with the essentials. Add the details that make this piece yours."
      >
        <div className="inline">
          {persisted && p.status === "published" ? (
            <Link className="button secondary" href={`/products/${p.slug}`}>
              View product
              <ArrowUpRight size={16} />
            </Link>
          ) : null}
          <button
            className="button"
            form="product-form"
            type="submit"
            disabled={uploading}
          >
            Save product
          </button>
        </div>
      </AdminHeading>
      <Feedback error={error} message={message} />
      <form
        id="product-form"
        onSubmit={async (e) => {
          e.preventDefault();
          save();
        }}
        className="editor-layout"
      >
        <div>
          <section className="form-section">
            <h2>Product details</h2>
            <label>
              Product title
              <input
                required
                value={p.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setP({
                    ...p,
                    title,
                    slug:
                      !persisted && p.slug === slugify(p.title)
                        ? slugify(title)
                        : p.slug,
                  });
                }}
                placeholder="e.g. The linen everyday shirt"
              />
            </label>
            <label>
              URL slug
              <input
                required
                value={p.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="the-linen-everyday-shirt"
              />
            </label>
            <label>
              Description
              <textarea
                rows={5}
                value={p.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
          </section>
          <section className="form-section">
            <h2>Variants</h2>
            <p className="muted">
              One row per available colour and size combination. Prices are in
              RM.
            </p>
            <div className="variant-editor">
              {p.variants.map((v) => (
                <div className="variant-row" key={v.id}>
                  <label>
                    SKU
                    <input
                      required
                      value={v.sku}
                      onChange={(e) => variant(v.id, "sku", e.target.value)}
                    />
                  </label>
                  <label>
                    Colour
                    <input
                      required
                      value={v.color}
                      onChange={(e) => variant(v.id, "color", e.target.value)}
                    />
                  </label>
                  <label>
                    Size
                    <input
                      required
                      value={v.size}
                      onChange={(e) => variant(v.id, "size", e.target.value)}
                    />
                  </label>
                  <label>
                    Price (RM)
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={v.price / 100 || ""}
                      onChange={(e) =>
                        variant(
                          v.id,
                          "price",
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </label>
                  <label>
                    Stock
                    <input
                      type="number"
                      min="0"
                      step="1"
                      readOnly={
                        backendEnabled ||
                        (persisted &&
                          initial.variants.some((x) => x.id === v.id))
                      }
                      value={v.stock}
                      onChange={(e) =>
                        variant(v.id, "stock", Number(e.target.value))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={p.variants.length === 1}
                    aria-label={`Remove variant ${v.sku || "new"}`}
                    onClick={() =>
                      set(
                        "variants",
                        p.variants.filter((x) => x.id !== v.id),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                set("variants", [
                  ...p.variants,
                  {
                    id: crypto.randomUUID(),
                    sku: "",
                    color: "",
                    size: "",
                    price: p.variants[0]?.price ?? 0,
                    stock: 0,
                  },
                ])
              }
            >
              <Plus size={16} />
              Add variant
            </button>
            {persisted ? (
              <p className="muted small">
                Adjust existing stock in{" "}
                <Link href="/admin/inventory">Inventory</Link> to keep a
                history.
              </p>
            ) : null}
          </section>
          <section className="form-section">
            <h2>Descriptive attributes</h2>
            <p className="muted">
              Add or configure fields in{" "}
              <Link href="/admin/attributes">Attributes</Link>.
            </p>
            {data.attributes
              .filter(
                (a) =>
                  !a.categoryIds.length ||
                  a.categoryIds.some((id) => p.categoryIds.includes(id)),
              )
              .map((a) => {
                const value = p.attributes[a.key];
                const change = (v: string | number | boolean | string[]) =>
                  set("attributes", { ...p.attributes, [a.key]: v });
                return a.type === "boolean" ? (
                  <label key={a.id} className="check">
                    <input
                      type="checkbox"
                      checked={value === true}
                      onChange={(e) => change(e.target.checked)}
                    />
                    {a.label}
                  </label>
                ) : a.type === "multi" ? (
                  <CheckList
                    key={a.id}
                    label={a.label}
                    items={[
                      ...new Set([
                        ...a.choices,
                        ...(Array.isArray(value) ? value : []),
                      ]),
                    ].map((c) => ({
                      id: c,
                      title: a.choices.includes(c) ? c : `${c} (retired)`,
                    }))}
                    value={Array.isArray(value) ? value : []}
                    onChange={change}
                  />
                ) : (
                  <label key={a.id}>
                    {a.label}
                    {a.unit ? ` (${a.unit})` : ""}
                    {a.type === "select" ? (
                      <select
                        value={String(value ?? "")}
                        onChange={(e) => change(e.target.value)}
                      >
                        <option value="">Not specified</option>
                        {typeof value === "string" &&
                        value &&
                        !a.choices.includes(value) ? (
                          <option value={value}>{value} (retired)</option>
                        ) : null}
                        {a.choices.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={a.type === "number" ? "number" : "text"}
                        step="any"
                        value={
                          typeof value === "string" || typeof value === "number"
                            ? value
                            : ""
                        }
                        onChange={(e) => {
                          if (a.type === "number" && e.target.value === "") {
                            const next = { ...p.attributes };
                            delete next[a.key];
                            set("attributes", next);
                          } else
                            change(
                              a.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                            );
                        }}
                      />
                    )}
                  </label>
                );
              })}
          </section>
        </div>
        <div>
          <section className="form-section">
            <h2>Publishing</h2>
            <label>
              Status
              <select
                value={p.status}
                onChange={(e) =>
                  set("status", e.target.value as Product["status"])
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <p className="muted small">
              Only published products appear on the storefront.
            </p>
          </section>
          <section className="form-section">
            <h2>Product image</h2>
            <ImagePicker value={p.image} onChange={(v) => set("image", v)} />
            <label>
              {uploading ? "Uploading photo…" : "Upload a product photo"}
              <input
                disabled={uploading}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > (backendEnabled ? 10 * 1024 * 1024 : 750000)
                  ) {
                    setError(
                      "Choose a JPG, PNG, or WebP image within the upload size limit.",
                    );
                    return;
                  }
                  setUploading(true);
                  void uploadImage(file)
                    .then((src) => {
                      setP((previous) => ({ ...previous, image: src }));
                      setError("");
                    })
                    .catch((err) => setError(err.message))
                    .finally(() => setUploading(false));
                }}
              />
            </label>
            <p className="muted small">
              {backendEnabled
                ? "Bundled sample images or an uploaded JPG, PNG, or WebP up to 10 MB. Uploaded photos are stored privately."
                : "Sample images or a local image up to 750 KB. Images stay in this browser."}
            </p>
          </section>
          <section className="form-section">
            <h2>Organisation</h2>
            <CheckList
              label="Categories"
              items={data.categories}
              value={p.categoryIds}
              onChange={(v) => set("categoryIds", v)}
            />
            <CheckList
              label="Collections"
              items={data.collections}
              value={p.collectionIds}
              onChange={(v) => set("collectionIds", v)}
            />
          </section>
        </div>
      </form>
    </>
  );
}
export function Groups({ kind }: { kind: "categories" | "collections" }) {
  const { data } = useDemo();
  const [editing, setEditing] = useState<Group | null>(null),
    [members, setMembers] = useState<string[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const singular = kind === "categories" ? "category" : "collection";
  const memberKey = kind === "categories" ? "categoryIds" : "collectionIds";
  const open = (g?: Group) => {
    const group = g ?? {
      id: crypto.randomUUID(),
      title: "",
      slug: "",
      description: "",
      image: "/images/white-tee.jpg",
    };
    setEditing({ ...group });
    setMembers(
      data.products
        .filter((p) => p[memberKey].includes(group.id))
        .map((p) => p.id),
    );
    setError("");
  };
  return (
    <>
      <AdminHeading
        title={kind === "categories" ? "Categories" : "Collections"}
        body={
          kind === "categories"
            ? "Give each piece a place. Products can belong to more than one category."
            : "Bring pieces together in curated edits, without duplicating products."
        }
      >
        <button className="button" onClick={() => open()}>
          <Plus size={17} />
          Add {singular}
        </button>
      </AdminHeading>
      <Feedback message={message} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{singular}</th>
              <th>Products</th>
              <th>Storefront URL</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data[kind].map((g) => (
              <tr key={g.id}>
                <td>
                  <button
                    className="table-product text-button"
                    onClick={() => open(g)}
                  >
                    <Image
                      src={g.image}
                      alt=""
                      width={46}
                      height={58}
                      unoptimized
                    />
                    {g.title}
                  </button>
                </td>
                <td>
                  {
                    data.products.filter((p) => p[memberKey].includes(g.id))
                      .length
                  }
                </td>
                <td>
                  /{kind}/{g.slug}
                </td>
                <td>
                  <button className="text-button" onClick={() => open(g)}>
                    Edit
                    <ArrowUpRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        title={`Edit ${singular}`}
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (
                  !editing.title.trim() ||
                  !editing.slug ||
                  slugify(editing.slug) !== editing.slug
                )
                  throw new Error(
                    "Enter a name and a valid lowercase URL slug.",
                  );
                if (
                  data[kind].some(
                    (g) => g.id !== editing.id && g.slug === editing.slug,
                  )
                )
                  throw new Error("This URL is already in use.");
                await commit(
                  (s) => ({
                    ...s,
                    [kind]: [
                      ...s[kind].filter((g) => g.id !== editing.id),
                      editing,
                    ],
                    products: s.products.map((p) => ({
                      ...p,
                      [memberKey]: members.includes(p.id)
                        ? [...new Set([...p[memberKey], editing.id])]
                        : p[memberKey].filter((id) => id !== editing.id),
                    })),
                  }),
                  {
                    kind: kind === "categories" ? "category" : "collection",
                    payload: { ...editing, members },
                  },
                );
                setEditing(null);
                setMessage(`${singular} saved.`);
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <Feedback error={error} />
            <label>
              Name
              <input
                required
                value={editing.title}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    title: e.target.value,
                    slug:
                      editing.slug === slugify(editing.title)
                        ? slugify(e.target.value)
                        : editing.slug,
                  })
                }
              />
            </label>
            <label>
              URL slug
              <input
                required
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <ImagePicker
              value={editing.image}
              onChange={(v) => setEditing({ ...editing, image: v })}
            />
            <CheckList
              label="Products in this group"
              items={data.products}
              value={members}
              onChange={setMembers}
            />
            <button className="button full">Save {singular}</button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
export function Attributes() {
  const { data } = useDemo();
  const [editing, setEditing] = useState<AttributeDefinition | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <>
      <AdminHeading
        title="Descriptive attributes"
        body="Create reusable fields for materials, care, fit, and whatever comes next."
      >
        <button
          className="button"
          onClick={() => {
            setEditing({
              id: crypto.randomUUID(),
              key: "",
              label: "",
              type: "text",
              choices: [],
              unit: "",
              visible: true,
              filterable: false,
              categoryIds: [],
            });
            setError("");
          }}
        >
          <Plus size={17} />
          Add attribute
        </button>
      </AdminHeading>
      <Feedback message={message} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Type</th>
              <th>Storefront</th>
              <th>Filter</th>
              <th>Applies to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.attributes.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.label}</strong>
                  <small>{a.key}</small>
                </td>
                <td>{a.type}</td>
                <td>{a.visible ? "Visible" : "Hidden"}</td>
                <td>{a.filterable ? "Enabled" : "Off"}</td>
                <td>
                  {a.categoryIds.length
                    ? a.categoryIds
                        .map(
                          (id) =>
                            data.categories.find((c) => c.id === id)?.title,
                        )
                        .join(", ")
                    : "All categories"}
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing(structuredClone(a));
                      setError("");
                    }}
                  >
                    Edit
                    <ArrowUpRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        title={
          editing && data.attributes.some((a) => a.id === editing.id)
            ? "Edit attribute"
            : "Add attribute"
        }
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (
                  !editing.label.trim() ||
                  !/^[a-z][a-z0-9_]*$/.test(editing.key)
                )
                  throw new Error(
                    "Enter a label and a key using lowercase letters, numbers, and underscores.",
                  );
                if (
                  data.attributes.some(
                    (a) => a.id !== editing.id && a.key === editing.key,
                  )
                )
                  throw new Error("This attribute key already exists.");
                if (
                  ["select", "multi"].includes(editing.type) &&
                  (!editing.choices.length ||
                    editing.choices.some((c) => !c.trim()) ||
                    new Set(editing.choices).size !== editing.choices.length)
                )
                  throw new Error("Enter unique, non-empty choices.");
                await commit((s) => ({
                  ...s,
                  attributes: [
                    ...s.attributes.filter((a) => a.id !== editing.id),
                    editing,
                  ],
                }));
                setEditing(null);
                setMessage(
                  "Attribute saved. It is now available in product editors.",
                );
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <Feedback error={error} />
            <label>
              Label
              <input
                required
                value={editing.label}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    label: e.target.value,
                    key: !data.attributes.some((a) => a.id === editing.id)
                      ? slugify(e.target.value).replaceAll("-", "_")
                      : editing.key,
                  })
                }
              />
            </label>
            <label>
              Key
              <input
                required
                readOnly={data.attributes.some((a) => a.id === editing.id)}
                value={editing.key}
                onChange={(e) =>
                  setEditing({ ...editing, key: e.target.value })
                }
              />
            </label>
            <label>
              Type
              <select
                disabled={data.attributes.some((a) => a.id === editing.id)}
                value={editing.type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as AttributeDefinition["type"],
                    filterable:
                      e.target.value === "text" ? false : editing.filterable,
                  })
                }
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Yes / no</option>
                <option value="select">Single choice</option>
                <option value="multi">Multiple choices</option>
              </select>
            </label>
            {["select", "multi"].includes(editing.type) ? (
              <label>
                Choices (one per line)
                <textarea
                  value={editing.choices.join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      choices: e.target.value.split("\n"),
                    })
                  }
                />
              </label>
            ) : null}
            {editing.type === "number" ? (
              <label>
                Unit
                <input
                  value={editing.unit}
                  placeholder="e.g. g/m²"
                  onChange={(e) =>
                    setEditing({ ...editing, unit: e.target.value })
                  }
                />
              </label>
            ) : null}
            <label className="check">
              <input
                type="checkbox"
                checked={editing.visible}
                onChange={(e) =>
                  setEditing({ ...editing, visible: e.target.checked })
                }
              />
              Show on product pages
            </label>
            <label className="check">
              <input
                type="checkbox"
                disabled={backendEnabled && editing.type === "text"}
                checked={editing.filterable}
                onChange={(e) =>
                  setEditing({ ...editing, filterable: e.target.checked })
                }
              />
              Allow shoppers to filter by this attribute
            </label>
            <CheckList
              label="Limit to categories (none means all)"
              items={data.categories}
              value={editing.categoryIds}
              onChange={(v) => setEditing({ ...editing, categoryIds: v })}
            />
            <button className="button full">Save attribute</button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
