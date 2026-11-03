"use client";
import { backendEnabled } from "@/lib/backend-contract";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Eye, Search } from "lucide-react";
import { commit, useDemo } from "@/lib/store";
import {
  adjustStock,
  fromLocalDateTime,
  localDateTime,
  money,
  promotionStatus,
  publishSite,
  validatePromotion,
} from "@/lib/catalog";
import { newSection } from "@/lib/seed";
import type { Promotion, SiteConfig, SiteSection } from "@/lib/types";
import { CheckList, Feedback, ImagePicker, Modal } from "./ui";
import { AdminHeading } from "./admin-catalog";
export function Inventory() {
  const { data } = useDemo();
  const [q, setQ] = useState(""),
    [onlyLow, setOnlyLow] = useState(false),
    [editing, setEditing] = useState(""),
    [delta, setDelta] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const all = data.products.flatMap((p) =>
    p.variants.map((v) => ({ product: p, variant: v })),
  );
  const rows = all.filter(
    ({ product: p, variant: v }) =>
      `${p.title} ${v.sku} ${v.color} ${v.size}`
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!onlyLow || v.stock <= 5),
  );
  const selected = all.find((r) => r.variant.id === editing);
  return (
    <>
      <AdminHeading
        title="Inventory"
        body="Every size, every colour, and every piece on hand."
      />
      <Feedback message={message} />
      <div className="admin-toolbar">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Search inventory"
            placeholder="Search products, SKU, colour, or size"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
          />
          Low stock (5 or fewer)
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Colour</th>
              <th>Size</th>
              <th>On hand</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product: p, variant: v }) => (
              <tr key={v.id}>
                <td>
                  <strong>{p.title}</strong>
                  <small>{v.sku}</small>
                </td>
                <td>{v.color}</td>
                <td>{v.size}</td>
                <td>
                  <span className={`badge ${v.stock ? "green" : ""}`}>
                    {v.stock}
                    {!v.stock ? " · Out of stock" : ""}
                  </span>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing(v.id);
                      setDelta("");
                      setReason("");
                      setError("");
                    }}
                  >
                    Adjust stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="empty">No matching variants.</p> : null}
      </div>
      <section className="form-section adjustment-history">
        <h2>Recent adjustments</h2>
        {data.adjustments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Change</th>
                  <th>Balance</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.adjustments.slice(0, 20).map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.productTitle}
                      <small>{a.variantLabel}</small>
                    </td>
                    <td>
                      {a.delta > 0 ? "+" : ""}
                      {a.delta}
                    </td>
                    <td>{a.balance}</td>
                    <td>{a.reason}</td>
                    <td>
                      {new Date(a.date).toLocaleString("en-MY", {
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Stock changes will appear here with a reason and running balance.
          </p>
        )}
      </section>
      <Modal
        title="Adjust stock"
        open={!!selected}
        onClose={() => setEditing("")}
      >
        {selected ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (!reason.trim())
                  throw new Error("Add a reason for the adjustment.");
                const change = Number(delta);
                await commit((s) => {
                  const products = adjustStock(
                    s.products,
                    selected.variant.id,
                    change,
                  );
                  const balance = products
                    .flatMap((p) => p.variants)
                    .find((v) => v.id === selected.variant.id)!.stock;
                  return {
                    ...s,
                    products,
                    adjustments: [
                      {
                        id: crypto.randomUUID(),
                        variantId: selected.variant.id,
                        productTitle: selected.product.title,
                        variantLabel: `${selected.variant.color} / ${selected.variant.size}`,
                        delta: change,
                        reason: reason.trim(),
                        balance,
                        date: new Date().toISOString(),
                      },
                      ...s.adjustments,
                    ],
                  };
                });
                setEditing("");
                setMessage("Stock updated.");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <p>
              <strong>{selected.product.title}</strong>
              <br />
              {selected.variant.color} / {selected.variant.size} ·{" "}
              {selected.variant.stock} on hand
            </p>
            <Feedback error={error} />
            <label>
              Adjustment (use a minus sign to remove stock)
              <input
                required
                type="number"
                step="1"
                value={delta}
                placeholder="e.g. 5 or -2"
                onChange={(e) => setDelta(e.target.value)}
              />
            </label>
            <label>
              Reason
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. New ready-stock delivery"
              />
            </label>
            <button className="button full">Save stock adjustment</button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
export function Promotions() {
  const { data } = useDemo();
  const [editing, setEditing] = useState<Promotion | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const open = (p?: Promotion) => {
    setEditing(
      p
        ? structuredClone(p)
        : {
            id: crypto.randomUUID(),
            title: "",
            productIds: [],
            kind: "percentage",
            amount: 10,
            enabled: true,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
    );
    setError("");
  };
  return (
    <>
      <AdminHeading
        title="Promotions"
        body="Simple offers. The same product, wherever it belongs."
      >
        <button className="button" onClick={() => open()}>
          <Plus size={17} />
          Create promotion
        </button>
      </AdminHeading>
      <Feedback message={message} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Promotion</th>
              <th>Discount</th>
              <th>Products</th>
              <th>Status</th>
              <th>Dates (MYT)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.promotions.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.title}</strong>
                </td>
                <td>
                  {p.kind === "percentage" ? `${p.amount}%` : money(p.amount)}{" "}
                  off
                </td>
                <td>{p.productIds.length}</td>
                <td>
                  <span
                    className={`badge ${promotionStatus(p) === "Active" ? "green" : ""}`}
                  >
                    {promotionStatus(p)}
                  </span>
                </td>
                <td>
                  {localDateTime(p.startsAt).replace("T", " ")}
                  <small>to {localDateTime(p.endsAt).replace("T", " ")}</small>
                </td>
                <td>
                  <button className="text-button" onClick={() => open(p)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Offers appear automatically in The offers and in each product’s original
        categories. Enabled offers cannot overlap for the same product.
      </p>
      <Modal
        title={
          editing && data.promotions.some((p) => p.id === editing.id)
            ? "Edit promotion"
            : "Create promotion"
        }
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                validatePromotion(editing, data.promotions, data.products);
                await commit((s) => ({
                  ...s,
                  promotions: [
                    ...s.promotions.filter((p) => p.id !== editing.id),
                    editing,
                  ],
                }));
                setEditing(null);
                setMessage("Promotion saved.");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <Feedback error={error} />
            <label>
              Promotion name
              <input
                required
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            <div className="form-pair">
              <label>
                Discount type
                <select
                  value={editing.kind}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      kind: e.target.value as Promotion["kind"],
                      amount: e.target.value === "fixed" ? 1000 : 10,
                    })
                  }
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </label>
              <label>
                {editing.kind === "fixed" ? "Amount (RM)" : "Percentage (%)"}
                <input
                  required
                  type="number"
                  min={editing.kind === "fixed" ? "0.01" : "0.01"}
                  max={editing.kind === "percentage" ? 100 : undefined}
                  step="0.01"
                  value={
                    editing.kind === "fixed"
                      ? editing.amount / 100
                      : editing.amount
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      amount:
                        editing.kind === "fixed"
                          ? Math.round(Number(e.target.value) * 100)
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="form-pair">
              <label>
                Starts (Malaysia time)
                <input
                  type="datetime-local"
                  required
                  value={localDateTime(editing.startsAt)}
                  onChange={(e) => {
                    if (e.target.value)
                      setEditing({
                        ...editing,
                        startsAt: fromLocalDateTime(e.target.value),
                      });
                  }}
                />
              </label>
              <label>
                Ends (Malaysia time)
                <input
                  type="datetime-local"
                  required
                  value={localDateTime(editing.endsAt)}
                  onChange={(e) => {
                    if (e.target.value)
                      setEditing({
                        ...editing,
                        endsAt: fromLocalDateTime(e.target.value),
                      });
                  }}
                />
              </label>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) =>
                  setEditing({ ...editing, enabled: e.target.checked })
                }
              />
              Enable this promotion
            </label>
            <CheckList
              label="Published products"
              items={data.products
                .filter(
                  (p) =>
                    p.status === "published" ||
                    editing.productIds.includes(p.id),
                )
                .map((p) => ({
                  ...p,
                  title:
                    p.status === "published"
                      ? p.title
                      : `${p.title} (${p.status})`,
                }))}
              value={editing.productIds}
              onChange={(v) => setEditing({ ...editing, productIds: v })}
            />
            <button className="button full">Save promotion</button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
const validHref = (href: string) =>
  /^\/(?!\/)/.test(href) && !/[\\\s]/.test(href);
function validateSite(site: SiteConfig) {
  if (
    !site.heroTitle.trim() ||
    !site.heroButton.trim() ||
    !validHref(site.heroHref)
  )
    throw new Error(
      "Add a hero title, button label, and an internal button destination starting with /.",
    );
  if (site.navigation.some((n) => !n.label.trim() || !validHref(n.href)))
    throw new Error(
      "Every navigation item needs a label and an internal destination starting with /.",
    );
  if (
    site.sections.some(
      (s) => !s.title.trim() || (s.type === "image-text" && !validHref(s.href)),
    )
  )
    throw new Error(
      "Every section needs a title and image sections need an internal destination.",
    );
}
export function Homepage() {
  const { data } = useDemo();
  return <SiteEditor initial={data.siteDraft} mode="homepage" />;
}
export function Navigation() {
  const { data } = useDemo();
  return <SiteEditor initial={data.siteDraft} mode="navigation" />;
}
function SiteEditor({
  initial,
  mode,
}: {
  initial: SiteConfig;
  mode: "homepage" | "navigation";
}) {
  const { data } = useDemo();
  const [site, setSite] = useState(() => structuredClone(initial)),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [type, setType] = useState<SiteSection["type"]>("collection");
  const save = async (publish = false) => {
    try {
      validateSite(site);
      await commit(
        (s) => {
          const next = { ...s, siteDraft: structuredClone(site) };
          return publish ? publishSite(next) : next;
        },
        { kind: "site", payload: { site, publish } },
      );
      setMessage(
        publish
          ? "Published to your storefront."
          : "Draft saved. Open the preview to review your changes.",
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const section = (id: string, change: Partial<SiteSection>) =>
    setSite({
      ...site,
      sections: site.sections.map((s) =>
        s.id === id ? { ...s, ...change } : s,
      ),
    });
  const move = (index: number, delta: number) => {
    const sections = [...site.sections];
    [sections[index], sections[index + delta]] = [
      sections[index + delta],
      sections[index],
    ];
    setSite({ ...site, sections });
  };
  const destinations = [
    { href: "/products", label: "All products" },
    { href: "/collections", label: "All collections" },
    { href: "/promotions", label: "The offers" },
    ...data.categories.map((c) => ({
      href: `/categories/${c.slug}`,
      label: `Category: ${c.title}`,
    })),
    ...data.collections.map((c) => ({
      href: `/collections/${c.slug}`,
      label: `Collection: ${c.title}`,
    })),
  ];
  return (
    <>
      <AdminHeading
        title={mode === "homepage" ? "Homepage" : "Navigation"}
        body="Save a draft, preview it, then publish when it feels right."
      >
        <div className="inline">
          <Link className="button secondary" href="/preview" target="_blank">
            <Eye size={16} />
            Preview saved draft
          </Link>
          <button className="button secondary" onClick={() => save()}>
            Save draft
          </button>
          <button className="button" onClick={() => save(true)}>
            {backendEnabled ? "Publish changes" : "Publish locally"}
          </button>
        </div>
      </AdminHeading>
      <Feedback error={error} message={message} />
      <p className="editor-note">
        Homepage and navigation share one draft.{" "}
        {backendEnabled
          ? "Publishing makes both visible in your storefront."
          : "Publishing makes both visible in this browser’s storefront."}
      </p>
      {mode === "homepage" ? (
        <div className="site-editor">
          <section className="form-section">
            <h2>Announcement & hero</h2>
            <label>
              Announcement
              <input
                value={site.announcement}
                onChange={(e) =>
                  setSite({ ...site, announcement: e.target.value })
                }
              />
            </label>
            <div className="editor-layout">
              <div>
                <label>
                  Hero title
                  <textarea
                    rows={2}
                    value={site.heroTitle}
                    onChange={(e) =>
                      setSite({ ...site, heroTitle: e.target.value })
                    }
                  />
                </label>
                <label>
                  Hero description
                  <textarea
                    value={site.heroBody}
                    onChange={(e) =>
                      setSite({ ...site, heroBody: e.target.value })
                    }
                  />
                </label>
                <div className="form-pair">
                  <label>
                    Button label
                    <input
                      value={site.heroButton}
                      onChange={(e) =>
                        setSite({ ...site, heroButton: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Button destination
                    <select
                      value={site.heroHref}
                      onChange={(e) =>
                        setSite({ ...site, heroHref: e.target.value })
                      }
                    >
                      {destinations.map((d) => (
                        <option key={d.href} value={d.href}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <ImagePicker
                value={site.heroImage}
                onChange={(v) => setSite({ ...site, heroImage: v })}
              />
            </div>
          </section>
          <div className="section-title">
            <h2>Homepage sections</h2>
            <span className="muted">
              Preset layouts, your choice of content
            </span>
          </div>
          {site.sections.map((s, index) => (
            <details className="section-editor" key={s.id} open={index === 0}>
              <summary>
                <span>
                  {s.title}
                  <small>
                    {s.type} · {s.enabled ? "Visible" : "Hidden"}
                  </small>
                </span>
              </summary>
              <div className="section-editor-body">
                <div className="section-controls">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) =>
                        section(s.id, { enabled: e.target.checked })
                      }
                    />
                    Visible
                  </label>
                  <div className="inline">
                    <button
                      aria-label={`Move ${s.title} up`}
                      className="icon-button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      aria-label={`Move ${s.title} down`}
                      className="icon-button"
                      disabled={index === site.sections.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      aria-label={`Remove ${s.title}`}
                      className="icon-button"
                      onClick={() =>
                        setSite({
                          ...site,
                          sections: site.sections.filter((x) => x.id !== s.id),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <label>
                  Section heading
                  <input
                    value={s.title}
                    onChange={(e) => section(s.id, { title: e.target.value })}
                  />
                </label>
                {s.type === "collection" ? (
                  <label>
                    Collection
                    <select
                      value={s.collectionId}
                      onChange={(e) =>
                        section(s.id, { collectionId: e.target.value })
                      }
                    >
                      {data.collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {s.type === "products" ? (
                  <CheckList
                    label="Featured products"
                    items={data.products.filter(
                      (p) => p.status === "published",
                    )}
                    value={s.productIds}
                    onChange={(v) => section(s.id, { productIds: v })}
                  />
                ) : null}
                {s.type === "image-text" ? (
                  <div className="form-pair">
                    <div>
                      <label>
                        Description
                        <textarea
                          value={s.body}
                          onChange={(e) =>
                            section(s.id, { body: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Link destination
                        <select
                          value={s.href}
                          onChange={(e) =>
                            section(s.id, { href: e.target.value })
                          }
                        >
                          {destinations.map((d) => (
                            <option key={d.href} value={d.href}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <ImagePicker
                      value={s.image}
                      onChange={(v) => section(s.id, { image: v })}
                    />
                  </div>
                ) : (
                  <label>
                    Number of products
                    <select
                      value={s.count}
                      onChange={(e) =>
                        section(s.id, { count: Number(e.target.value) })
                      }
                    >
                      {[2, 3, 4, 6, 8].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </details>
          ))}
          <div className="add-section">
            <label>
              Section type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SiteSection["type"])}
              >
                <option value="collection">Collection products</option>
                <option value="products">Selected products</option>
                <option value="promotions">Promotional products</option>
                <option value="image-text">Image with text</option>
              </select>
            </label>
            <button
              className="button secondary"
              onClick={() =>
                setSite({
                  ...site,
                  sections: [...site.sections, newSection(type)],
                })
              }
            >
              <Plus size={17} />
              Add section
            </button>
          </div>
        </div>
      ) : (
        <section className="form-section">
          <h2>Main navigation</h2>
          <p className="muted">
            The offers link is always available. Use these items for the rest of
            your store.
          </p>
          {site.navigation.map((n, index) => (
            <div className="navigation-row" key={n.id}>
              <label>
                Label
                <input
                  value={n.label}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      navigation: site.navigation.map((x) =>
                        x.id === n.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Destination
                <select
                  value={n.href}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      navigation: site.navigation.map((x) =>
                        x.id === n.id ? { ...x, href: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {destinations.map((d) => (
                    <option key={d.href} value={d.href}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="inline">
                <button
                  className="icon-button"
                  aria-label={`Move ${n.label} up`}
                  disabled={!index}
                  onClick={() => {
                    const nav = [...site.navigation];
                    [nav[index], nav[index - 1]] = [nav[index - 1], nav[index]];
                    setSite({ ...site, navigation: nav });
                  }}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove ${n.label}`}
                  onClick={() =>
                    setSite({
                      ...site,
                      navigation: site.navigation.filter((x) => x.id !== n.id),
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
          <button
            className="button secondary"
            onClick={() =>
              setSite({
                ...site,
                navigation: [
                  ...site.navigation,
                  {
                    id: crypto.randomUUID(),
                    label: "New link",
                    href: "/products",
                  },
                ],
              })
            }
          >
            <Plus size={17} />
            Add navigation item
          </button>
        </section>
      )}
    </>
  );
}
