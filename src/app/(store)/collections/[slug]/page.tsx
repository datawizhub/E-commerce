import { CatalogPage } from "@/components/catalog-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  return (
    <CatalogPage kind="collection" slug={slug} searchParams={searchParams} />
  );
}
