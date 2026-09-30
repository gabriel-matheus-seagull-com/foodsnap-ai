import Link from "next/link";
import { Salad } from "lucide-react";

/** Top app bar — logo + name, links home. */
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
        <Link
          href="/analyze"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Try it
        </Link>
      </div>
    </header>
  );
}
