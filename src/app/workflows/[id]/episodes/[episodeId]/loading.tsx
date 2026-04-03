import { Skeleton } from "@/components/ui/skeleton";

export default function EpisodeDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header: back button + title + show name */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-6 w-64" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <Skeleton className="h-2 w-24 rounded-full" />
        <Skeleton className="h-3.5 w-10" />
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1 max-w-[250px]" />
              <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
