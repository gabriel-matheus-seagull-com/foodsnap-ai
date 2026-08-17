import Link from "next/link";
import { Salad } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/foodsnap/theme-toggle";

/** Top app bar — logo + name, links home, auth-aware nav. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Salad className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">
            FoodSnap <span className="text-primary">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/analyze"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Try it
          </Link>
          <Show when="signed-in">
            <Link
              href="/results"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              My Results
            </Link>
            <Link
              href="/history"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              History
            </Link>
            <Link
              href="/goals"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Goals
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
