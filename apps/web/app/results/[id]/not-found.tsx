import Link from "next/link";

export default function ResultNotFound() {
  return (
    <div className="container max-w-xl py-10 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Result not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This saved result doesn&apos;t exist or isn&apos;t yours.
      </p>
      <Link
        href="/results"
        className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
      >
        Back to results
      </Link>
    </div>
  );
}
