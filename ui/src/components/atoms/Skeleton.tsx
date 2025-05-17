import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string | number;
  width?: string | number;
  borderRadius?: string | number;
  animated?: boolean;
}

export default function Skeleton({
  height,
  width,
  borderRadius = "0.25rem",
  className,
  animated = true,
  ...props
}: SkeletonProps) {
  const style = {
    height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : undefined,
    width: width !== undefined ? (typeof width === "number" ? `${width}px` : width) : undefined,
    borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={cn(
        "bg-gray-200",
        animated && "animate-pulse",
        className
      )}
      style={style}
      {...props}
    />
  );
}

// Prebuilt skeletons for common use cases
export function JobCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg shadow-sm space-y-3">
      <Skeleton height={24} width="70%" />
      <Skeleton height={20} width="40%" />
      <div className="flex space-x-2 mt-2">
        <Skeleton height={18} width={80} borderRadius="9999px" />
        <Skeleton height={18} width={90} borderRadius="9999px" />
      </div>
      <Skeleton height={60} />
      <div className="flex justify-between items-center mt-4">
        <Skeleton height={20} width={100} />
        <Skeleton height={36} width={100} borderRadius="0.375rem" />
      </div>
    </div>
  );
}

export function JobDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton height={36} width="70%" />
      <Skeleton height={24} width="40%" />
      <div className="flex flex-wrap gap-2 mt-2">
        <Skeleton height={22} width={90} borderRadius="9999px" />
        <Skeleton height={22} width={110} borderRadius="9999px" />
        <Skeleton height={22} width={80} borderRadius="9999px" />
      </div>
      <Skeleton height={200} />
      <div className="mt-4 space-y-2">
        <Skeleton height={20} width="60%" />
        <Skeleton height={20} width="75%" />
        <Skeleton height={20} width="40%" />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
} 