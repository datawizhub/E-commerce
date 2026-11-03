"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Shirt,
  Shapes,
  Layers,
  SlidersHorizontal,
  Package,
  Tag,
  PanelsTopLeft,
  List,
  ArrowUpRight,
  Menu,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { backendEnabled } from "@/lib/backend-contract";
const navigation = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/products", "Products", Shirt],
  ["/admin/categories", "Categories", Shapes],
  ["/admin/collections", "Collections", Layers],
  ["/admin/attributes", "Attributes", SlidersHorizontal],
  ["/admin/inventory", "Inventory", Package],
  ["/admin/promotions", "Promotions", Tag],
  ["/admin/homepage", "Homepage", PanelsTopLeft],
  ["/admin/navigation", "Navigation", List],
] as const;
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { warning, ready, pending } = useDemo();
  const [logoutError, setLogoutError] = useState("");
  return (
    <div className="admin-app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <Link href="/" className="wordmark">
          COMMON FORM<span className="brand-dot">®</span>
        </Link>
        <p className="sidebar-caption">Store workspace</p>
        <nav aria-label="Admin navigation">
          {navigation.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                (href === "/admin" ? path === href : path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/">
            View storefront <ArrowUpRight size={16} />
          </Link>
          <span>
            {backendEnabled
              ? "Connected store · one admin"
              : "Local demo · one admin"}
          </span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Toggle admin navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu size={20} />
          </button>
          <span className="local-indicator" />
          {backendEnabled ? "Store workspace" : "Local preview"}
          <span className="admin-topbar-note">
            {backendEnabled
              ? pending
                ? "Saving…"
                : "Connected to Supabase"
              : "Changes saved on this browser"}
          </span>
          {backendEnabled ? (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const r = await fetch("/api/auth/logout", { method: "POST" });
                  if (!r.ok)
                    throw new Error("Could not sign out. Please try again.");
                  // A full navigation clears the private in-memory snapshot and router cache.
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.assign("/login");
                } catch (e) {
                  setLogoutError((e as Error).message);
                }
              }}
            >
              Sign out
            </button>
          ) : null}
          <span
            className="admin-avatar"
            aria-label={backendEnabled ? "Store administrator" : "Demo admin"}
          >
            A
          </span>
        </header>
        <main id="main" className="admin-content">
          {logoutError ? (
            <p role="alert" className="feedback error">
              {logoutError}
            </p>
          ) : null}
          {warning ? (
            <p role="alert" className="feedback error">
              {warning}
            </p>
          ) : null}
          {ready ? (
            <fieldset
              className="workspace-fields"
              disabled={pending}
              aria-busy={pending}
            >
              {children}
            </fieldset>
          ) : (
            <p className="muted">Opening your local workspace…</p>
          )}
        </main>
      </div>
    </div>
  );
}
