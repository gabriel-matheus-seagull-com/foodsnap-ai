import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Just wires up Clerk's session/auth context for every request — required
 * for `auth()`/`auth.protect()` to work anywhere in the app. Route
 * protection itself is NOT done here via path matching (Clerk's own
 * recommended pattern, and `createRouteMatcher`-based middleware protection
 * is now deprecated): each protected page calls `auth.protect()` directly,
 * so protection can't drift from how Next.js actually routes requests. See
 * app/profile/[[...profile]]/page.tsx, app/results/page.tsx, and
 * app/results/[id]/page.tsx.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip)).*)",
    "/(api|trpc)(.*)",
  ],
};
