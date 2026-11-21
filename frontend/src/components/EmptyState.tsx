interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
