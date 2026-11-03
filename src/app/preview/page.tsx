import { Home } from "@/components/catalog-ui";
import { StoreShell } from "@/components/store-shell";
import { StoreProvider } from "@/lib/store";
import { requireAdmin, StoreError } from "@/lib/supabase/auth";
import { backendEnabled } from "@/lib/backend-contract";
import { redirect } from "next/navigation";
import type { DemoState } from "@/lib/types";
export default async function Page() {
  if (!backendEnabled)
    return (
      <StoreShell>
        <Home preview />
      </StoreShell>
    );
  let client;
  try {
    client = await requireAdmin();
  } catch (e) {
    if (e instanceof StoreError) redirect("/login?next=/admin/homepage");
    throw e;
  }
  const { data, error } = await client.rpc("admin_snapshot");
  if (error) throw new Error("Preview could not load.");
  return (
    <StoreProvider
      initial={data as unknown as { data: DemoState; revision: number }}
      scope="preview"
    >
      <StoreShell>
        <Home preview />
      </StoreShell>
    </StoreProvider>
  );
}
