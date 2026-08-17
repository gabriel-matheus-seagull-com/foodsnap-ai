import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

/**
 * Clerk's prebuilt account-management UI. Name/username live natively in
 * Clerk (enabled via the Clerk Dashboard) — there's no app-specific profile
 * data to store separately, so no custom form or Supabase table is needed.
 * The catch-all segment is required by Clerk for its internal sub-routing.
 *
 * `auth.protect()` is the resource-based auth check itself (redirects to
 * sign-in if signed out) — see proxy.ts for why route protection lives here
 * rather than in path-matched middleware.
 */
export default async function ProfilePage() {
  await auth.protect();

  return (
    <div className="container flex justify-center py-10">
      <UserProfile routing="path" path="/profile" />
    </div>
  );
}
