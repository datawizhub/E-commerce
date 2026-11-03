import { AdminLogin } from "@/components/admin-login";
export const metadata = { title: "Administrator sign in" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AdminLogin next={next ?? null} />;
}
