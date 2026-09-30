import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Camera,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Camera,
    title: "Snap or upload",
    body: "Drag in a photo of your plate — or pick one from your phone.",
  },
  {
    icon: SlidersHorizontal,
    title: "Review & adjust",
    body: "The AI detects the foods. Tweak items and portions until it looks right.",
  },
  {
    icon: BarChart3,
    title: "Get your estimate",
    body: "See an approximate calorie range plus protein, carbs, and fats.",
  },
];

export default function HomePage() {
  return (
    <div className="container flex flex-col gap-20 py-14 sm:py-20">
      {/* Hero */}
      <section className="mx-auto flex max-w-2xl animate-fade-in flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-sm font-medium text-secondary-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Smart, friendly nutrition estimates
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Snap your meal.
          <br />
          Get a smart nutrition estimate.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          FoodSnap AI looks at a photo of your meal, identifies the likely
          foods, and gives you an approximate calorie range and macros — no
          tracking diaries, no guilt.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/analyze"
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            Try it now
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See how it works
          </Link>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Estimates only — not medical or nutrition advice.
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-4xl">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          How it works
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-primary/5 px-6 py-12 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Curious what&apos;s on your plate?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          It takes about ten seconds. Upload a meal photo and see your estimate.
        </p>
        <Link
          href="/analyze"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 gap-2")}
        >
          <Camera className="h-4 w-4" />
          Analyze a meal
        </Link>
      </section>
    </div>
  );
}
