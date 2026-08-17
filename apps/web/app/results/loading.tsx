import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <div className="container max-w-xl py-10">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
