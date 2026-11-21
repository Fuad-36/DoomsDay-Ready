import type { BookingQuote } from '../../api/client';

interface BookingResultProps {
  quote: BookingQuote;
}

export function BookingResult({ quote }: BookingResultProps) {
  if (!quote.possible) {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5"
      >
        <p className="font-semibold text-amber-200">
          Not possible with this cinema's bundles
        </p>
        <p className="mt-1 text-sm text-amber-100/80">
          Try a different group size or choose another cinema.
        </p>
      </div>
    );
  }

  const breakdown = quote.bundles
    .map((bundle) => `${bundle.count} x ${bundle.size}`)
    .join(', ');
  const totalLabel = `${quote.totalBundles} ${
    quote.totalBundles === 1 ? 'bundle' : 'bundles'
  } total`;

  return (
    <div
      role="status"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Bundle breakdown
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{breakdown}</p>
      <p className="mt-2 text-sm text-slate-300">{totalLabel}</p>
    </div>
  );
}
