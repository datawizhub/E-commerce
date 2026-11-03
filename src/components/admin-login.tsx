"use client";
import Link from "next/link";
import { useState } from "react";
import { safeAdminDestination } from "@/lib/backend-contract";
import { Feedback } from "./ui";
export function AdminLogin({ next }: { next: string | null }) {
  const [email, setEmail] = useState("danish@datawiz.com.my"),
    [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="login-page">
      <Link className="wordmark" href="/">
        COMMON FORM<span className="brand-dot">®</span>
      </Link>
      <section className="login-card">
        <p className="eyebrow">Store workspace</p>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in to manage your collection.</p>
        <Feedback error={error} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending) return;
            setPending(true);
            setError("");
            try {
              const r = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
              });
              const body = await r.json();
              if (!r.ok) throw new Error(body.error);
              window.location.assign(safeAdminDestination(next));
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Sign-in is unavailable. Try again.",
              );
              setPending(false);
            }
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link className="text-link" href="/">
          Back to the store
        </Link>
      </section>
    </main>
  );
}
