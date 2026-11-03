import { CatalogPage } from "@/components/catalog-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CatalogPage kind="all" searchParams={searchParams} />;
}
