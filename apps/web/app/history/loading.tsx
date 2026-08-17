import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="container max-w-xl py-10">
      <Skeleton className="mb-6 h-8 w-40" />
      <Skeleton className="mb-5 h-10 w-56 rounded-lg" />
      <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
