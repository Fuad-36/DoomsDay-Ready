interface RewatchProgressProps {
  watchedCount: number;
  totalCount: number;
}

export function RewatchProgress({
  watchedCount,
  totalCount,
}: RewatchProgressProps) {
  // A plan can have zero prerequisites, so 0/0 must stay at 0% rather than NaN.
  const rawPercent =
    totalCount === 0 ? 0 : Math.round((watchedCount / totalCount) * 100);
  const percent = Math.min(100, Math.max(0, rawPercent));
  const label = `${watchedCount} of ${totalCount} watched`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="text-xs text-slate-500">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Rewatch progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={label}
        className="h-2 overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-amber-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
