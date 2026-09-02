interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 animate-pulse rounded bg-slate-200/80 ${i === lines - 1 ? 'w-2/3' : 'w-full'} ${className}`}
          />
        ))}
      </div>
    );
  }
  return <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 animate-pulse rounded bg-slate-200/80 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="space-y-3">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/80" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200/80" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200/80" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-6 px-6 py-4">
            {Array.from({ length: cols }).map((_, col) => (
              <div key={col} className="h-3 w-32 animate-pulse rounded bg-slate-200/80" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
