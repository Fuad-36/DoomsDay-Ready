import { Spinner } from './Spinner';

interface LoadingCardProps {
  label: string;
}

export function LoadingCard({ label }: LoadingCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <Spinner label={label} />
    </div>
  );
}
