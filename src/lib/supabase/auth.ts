import "server-only";
import { createSupabase } from "./server";
export class StoreError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function requireAdmin() {
  const supabase = await createSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    throw new StoreError("Please sign in to your administrator account.", 401);
  const membership = await supabase.rpc("is_store_admin");
  if (membership.error || membership.data !== true)
    throw new StoreError(
      "This account does not have store administrator access.",
      403,
    );
  return supabase;
}
