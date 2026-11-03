import { StoreShell } from "@/components/store-shell";
import { StoreProvider } from "@/lib/store";
import { createSupabase } from "@/lib/supabase/server";
import { backendEnabled } from "@/lib/backend-contract";
import type { DemoState } from "@/lib/types";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!backendEnabled) return <StoreShell>{children}</StoreShell>;
  const { data, error } = await (await createSupabase()).rpc("store_snapshot");
  if (error) throw new Error("The collection could not load. Please reload.");
  return (
    <StoreProvider
      initial={data as unknown as { data: DemoState; revision: number }}
      scope="public"
    >
      <StoreShell>{children}</StoreShell>
    </StoreProvider>
  );
}
