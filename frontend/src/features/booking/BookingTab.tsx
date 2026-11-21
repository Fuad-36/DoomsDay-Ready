import { useState } from 'react';
import { listCinemas } from '../../api/client';
import type { Cinema } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Spinner } from '../../components/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { AddCinemaForm } from './AddCinemaForm';
import { BookingQuoteForm } from './BookingQuoteForm';

interface BookingContentProps {
  initialCinemas: Cinema[];
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <Spinner label={label} />
    </div>
  );
}

function BookingContent({ initialCinemas }: BookingContentProps) {
  const [cinemas, setCinemas] = useState<Cinema[]>(initialCinemas);
  const [selectedCinemaId, setSelectedCinemaId] = useState('');

  function handleCreated(cinema: Cinema) {
    setCinemas((current) => [...current, cinema]);
    setSelectedCinemaId((current) => current || cinema.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Booking</h2>
        <p className="mt-1 text-sm text-slate-400">
          Find a cinema and build an opening-night bundle quote for your group.
        </p>
      </div>

      <AddCinemaForm onCreated={handleCreated} />

      {cinemas.length === 0 ? (
        <EmptyState
          title="No cinemas yet"
          description="Add your first cinema above to build a booking quote."
        />
      ) : (
        <BookingQuoteForm
          cinemas={cinemas}
          selectedCinemaId={selectedCinemaId}
          onCinemaChange={setSelectedCinemaId}
        />
      )}
    </div>
  );
}

export function BookingTab() {
  const { data, loading, error, reload } = useAsync(listCinemas, []);

  if (loading && data === null) {
    return <LoadingCard label="Loading cinemas…" />;
  }

  if (error && data === null) {
    return <ErrorMessage message={error.message} onRetry={reload} />;
  }

  return <BookingContent initialCinemas={data ?? []} />;
}
