import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/5 rounded-sm",
        className
      )}
    />
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-cyber-panel border border-white/5 rounded-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="w-12 h-3 mb-1" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div>
          <Skeleton className="w-12 h-3 mb-1" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div>
          <Skeleton className="w-16 h-3 mb-1" />
          <Skeleton className="w-20 h-4" />
        </div>
        <div>
          <Skeleton className="w-12 h-3 mb-1" />
          <Skeleton className="w-28 h-4" />
        </div>
      </div>
    </div>
  );
}

export function OrderFormSkeleton() {
  return (
    <div className="w-full max-w-[480px] mx-auto bg-cyber-panel border border-white/5 rounded-sm p-6">
      <Skeleton className="w-40 h-6 mb-6" />
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <div className="flex justify-center">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-10" />
        <Skeleton className="w-full h-12" />
      </div>
    </div>
  );
}
