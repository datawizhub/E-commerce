import { AdminShell } from "@/components/admin-shell";
import { StoreProvider } from "@/lib/store";
import { requireAdmin, StoreError } from "@/lib/supabase/auth";
import { backendEnabled } from "@/lib/backend-contract";
import { redirect } from "next/navigation";
import type { DemoState } from "@/lib/types";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!backendEnabled) return <AdminShell>{children}</AdminShell>;
  let client;
  try {
    client = await requireAdmin();
  } catch (error) {
    if (error instanceof StoreError) redirect("/login");
    throw error;
  }
  const { data, error } = await client.rpc("admin_snapshot");
  if (error) throw new Error("Your store could not load. Please reload.");
  return (
    <StoreProvider
      initial={data as unknown as { data: DemoState; revision: number }}
      scope="admin"
    >
      <AdminShell>{children}</AdminShell>
    </StoreProvider>
  );
}
