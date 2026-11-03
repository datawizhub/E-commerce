import { Suspense } from "react";
import { ProductDetail } from "@/components/catalog-ui";
import { StoreShell } from "@/components/store-shell";
import { StoreProvider, type StoreInitial } from "@/lib/store";
import { createSupabase } from "@/lib/supabase/server";
import { backendEnabled } from "@/lib/backend-contract";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = (
    <Suspense fallback={<p className="empty">Opening this piece…</p>}>
      <ProductDetail key={slug} slug={slug} />
    </Suspense>
  );
  if (!backendEnabled) return <StoreShell>{content}</StoreShell>;
  const { data, error } = await (
    await createSupabase()
  ).rpc("product_snapshot", { slug });
  if (error) throw new Error("This product could not load. Please reload.");
  return (
    <StoreProvider initial={data as unknown as StoreInitial} scope="public">
      <StoreShell>{content}</StoreShell>
    </StoreProvider>
  );
}
