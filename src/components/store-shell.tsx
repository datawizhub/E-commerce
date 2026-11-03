"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, ArrowUpRight } from "lucide-react";
import { useDemo } from "@/lib/store";
import { Modal } from "./ui";
export function StoreShell({ children }: { children: React.ReactNode }) {
  const { data, warning, ready } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const preview = path === "/preview";
  const site = preview ? data.siteDraft : data.sitePublished;
  const [search, setSearch] = useState(false),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState("");
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {preview ? (
        <div className="preview-banner">
          Administrator draft preview{" "}
          <Link href="/admin/homepage">Back to editor</Link>
        </div>
      ) : null}
      <div className="announcement">{site.announcement}</div>
      <header className="store-header">
        <button
          className="icon-button mobile-only"
          aria-label="Open menu"
          onClick={() => setMenu(true)}
        >
          <Menu size={21} />
        </button>
        <Link href="/" className="wordmark" aria-label="Common Form home">
          COMMON FORM<span className="brand-dot">®</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {site.navigation.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              aria-current={path === n.href ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
          <Link className="promo-nav" href="/promotions">
            The offers
          </Link>
        </nav>
        <button
          className="icon-button"
          aria-label="Search products"
          onClick={() => setSearch(true)}
        >
          <Search size={21} />
        </button>
      </header>
      {warning ? (
        <p className="feedback error">
          {warning} <Link href="/admin">Open demo settings</Link>
        </p>
      ) : null}
      <main id="main" data-ready={ready}>
        {children}
      </main>
      <footer className="store-footer">
        <div>
          <Link className="wordmark" href="/">
            COMMON FORM<span className="brand-dot">®</span>
          </Link>
          <p>
            Everyday pieces.
            <br />
            Room to be yourself.
          </p>
        </div>
        <div>
          <h2>Find your form</h2>
          <Link href="/products">Shop all</Link>
          <Link href="/collections">The collections</Link>
          <Link href="/promotions">The offers</Link>
        </div>
        <div>
          <h2>Behind the store</h2>
          <Link href="/admin">
            Open local admin <ArrowUpRight size={14} />
          </Link>
          <p>
            Frontend preview
            <br />
            Sample products & photography
          </p>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Common Form · Demo concept</span>
          <span>Prices in MYR · Malaysia & Australia</span>
        </div>
      </footer>
      <Modal
        title="Find something you love"
        open={search}
        onClose={() => setSearch(false)}
      >
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(false);
            router.push(`/products?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <label htmlFor="search">Search the collection</label>
          <div className="inline">
            <input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try a shirt, knit, or everyday tee"
            />
            <button className="button" type="submit">
              Search
            </button>
          </div>
        </form>
        <p className="muted">A few favourites: cotton, layers, denim.</p>
      </Modal>
      <Modal
        title="Explore Common Form"
        open={menu}
        onClose={() => setMenu(false)}
      >
        <nav className="mobile-menu" aria-label="Mobile navigation">
          {[
            ...site.navigation,
            { id: "offers", label: "The offers", href: "/promotions" },
          ].map((n) => (
            <Link href={n.href} key={n.id} onClick={() => setMenu(false)}>
              {n.label}
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </nav>
      </Modal>
    </>
  );
}
