"use client";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { stateSchema as schema } from "./data-schema";
import {
  backendEnabled,
  buildMutation,
  type Mutation,
  offerRefreshDelay,
} from "./backend-contract";
import { initialState } from "./seed";
import type { DemoState } from "./types";
const key = "common-form-demo-v1";
export type StoreSnapshot = {
  data: DemoState;
  warning: string;
  ready: boolean;
  revision: number;
  pending: boolean;
  scope: string;
  serverTime?: string;
  nextBoundary?: string | null;
};
export type StoreInitial = {
  data: DemoState;
  revision: number;
  serverTime?: string;
  nextBoundary?: string | null;
};
const emptyState: DemoState = {
  schemaVersion: 1,
  products: [],
  categories: [],
  collections: [],
  attributes: [],
  promotions: [],
  adjustments: [],
  siteDraft: initialState.sitePublished,
  sitePublished: initialState.sitePublished,
};
const serverSnapshot: StoreSnapshot = {
  data: backendEnabled ? emptyState : initialState,
  warning: "",
  ready: false,
  revision: 0,
  pending: false,
  scope: "",
};
const StoreContext = createContext<StoreSnapshot>(serverSnapshot);
export function hydrateStore(initial: StoreInitial, scope: string) {
  snapshot = {
    ...initial,
    data: schema.parse(initial.data),
    ready: true,
    warning: "",
    pending: false,
    scope,
  };
  loaded = true;
  notify();
}
export function StoreProvider({
  initial,
  scope,
  children,
}: {
  initial: StoreInitial;
  scope: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const value: StoreSnapshot = {
    ...initial,
    ready: true,
    warning: "",
    pending: false,
    scope,
  };
  useEffect(() => {
    hydrateStore(initial, scope);
  }, [initial, scope]);
  useEffect(() => {
    if (!backendEnabled || scope !== "public") return;
    const refresh = () => router.refresh();
    const interval = setInterval(refresh, 30000);
    const delay = offerRefreshDelay(initial.serverTime, initial.nextBoundary);
    const boundary = delay === null ? undefined : setTimeout(refresh, delay);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      if (boundary) clearTimeout(boundary);
      window.removeEventListener("focus", refresh);
    };
  }, [initial.serverTime, initial.nextBoundary, scope, router]);
  return createElement(StoreContext.Provider, { value }, children);
}
let pendingRetry: { fingerprint: string; envelope: unknown } | undefined;
async function refreshStore() {
  const scope = snapshot.scope;
  const r = await fetch("/api/store" + (scope === "admin" ? "?admin=1" : ""), {
    cache: "no-store",
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? "The store could not load.");
  if (snapshot.scope !== scope) return;
  snapshot = {
    ...snapshot,
    data: schema.parse(body.data),
    revision: body.revision,
    ready: true,
    warning: "",
  };
  notify();
}
export async function uploadImage(file: File) {
  if (!backendEnabled)
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The image could not be read."));
      reader.readAsDataURL(file);
    });
  const form = new FormData();
  form.set("file", file);
  const r = await fetch("/api/admin/media", { method: "POST", body: form });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? "Image upload failed.");
  return body.src as string;
}
let snapshot = serverSnapshot,
  loaded = false;
const listeners = new Set<() => void>();
let clock: ReturnType<typeof setInterval> | undefined;
function notify() {
  listeners.forEach((listener) => listener());
}
function load() {
  if (backendEnabled || loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(key);
    snapshot = {
      ...snapshot,
      data: raw ? schema.parse(JSON.parse(raw)) : initialState,
      warning: "",
      ready: true,
    };
  } catch {
    snapshot = {
      ...snapshot,
      data: initialState,
      warning:
        "Saved demo data could not be read. Sample data is shown; reset the demo to start fresh.",
      ready: true,
    };
  }
}
function getSnapshot() {
  load();
  return snapshot;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!clock && !backendEnabled)
    clock = setInterval(() => {
      snapshot = { ...snapshot };
      notify();
    }, 30000);
  const onStorage = (event: StorageEvent) => {
    if (!backendEnabled && event.key === key) {
      loaded = false;
      load();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && clock) {
      clearInterval(clock);
      clock = undefined;
    }
    window.removeEventListener("storage", onStorage);
  };
}
export async function commit(
  update: (previous: DemoState) => DemoState,
  override?: Mutation,
) {
  if (backendEnabled) {
    if (snapshot.pending) throw new Error("A save is already in progress.");
    const next = update(snapshot.data);
    schema.parse(next);
    const change = override ?? buildMutation(snapshot.data, next);
    const fingerprint = JSON.stringify({
      ...change,
      payload:
        change.kind === "stock"
          ? { ...change.payload, id: undefined }
          : change.payload,
      revision: snapshot.revision,
    });
    const envelope =
      pendingRetry?.fingerprint === fingerprint
        ? pendingRetry.envelope
        : {
            ...change,
            expectedVersion: snapshot.revision,
            requestKey: crypto.randomUUID(),
          };
    pendingRetry = { fingerprint, envelope };
    snapshot = { ...snapshot, pending: true };
    notify();
    try {
      const r = await fetch("/api/admin/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      const body = await r.json();
      if (!r.ok) {
        if (r.status < 500) pendingRetry = undefined;
        throw new Error(
          body.error ?? "Changes were not saved. Please try again.",
        );
      }
      pendingRetry = undefined;
      snapshot = {
        ...snapshot,
        data: next,
        revision: body.saved.revision,
        warning: "",
      };
      try {
        if (body.snapshot)
          snapshot = {
            ...snapshot,
            data: schema.parse(body.snapshot.data),
            revision: body.snapshot.revision,
            warning: "",
          };
        else await refreshStore();
      } catch {
        snapshot = {
          ...snapshot,
          warning:
            "Changes were saved, but the latest store data could not refresh. Reload before making more edits.",
        };
      }
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error(
            "The connection failed. Retry to check or finish the same save.",
          );
    } finally {
      snapshot = { ...snapshot, pending: false };
      notify();
    }
    return;
  }
  load();
  const next = update(snapshot.data);
  schema.parse(next);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    throw new Error(
      "Browser storage is unavailable or full. Changes were not saved. Try a smaller image or reset the demo.",
    );
  }
  snapshot = { ...snapshot, data: next, warning: "", ready: true };
  notify();
}
export function resetDemo() {
  if (backendEnabled)
    throw new Error("Sample reset is disabled for the connected store.");
  try {
    localStorage.removeItem(key);
  } catch {
    throw new Error(
      "Browser storage is unavailable. Enable site storage and try again.",
    );
  }
  snapshot = {
    ...snapshot,
    data: structuredClone(initialState),
    warning: "",
    ready: true,
  };
  notify();
}
export function useDemo() {
  const context = useContext(StoreContext);
  return useSyncExternalStore(
    subscribe,
    () =>
      backendEnabled
        ? snapshot.scope === context.scope && snapshot.ready
          ? snapshot
          : context
        : getSnapshot(),
    () => (backendEnabled ? context : serverSnapshot),
  );
}
