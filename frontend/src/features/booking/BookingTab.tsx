import { useState } from 'react';
import { listCinemas } from '../../api/client';
import type { Cinema } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingCard } from '../../components/LoadingCard';
import { useAsync } from '../../hooks/useAsync';
import { AddCinemaForm } from './AddCinemaForm';
import { BookingQuoteForm } from './BookingQuoteForm';

interface BookingContentProps {
  initialCinemas: Cinema[];
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Booking</h2>
        <p className="mt-1 text-sm text-slate-400">
          Find a cinema and build an opening-night bundle quote for your group.
        </p>
      </div>

      {loading && data === null ? (
        <LoadingCard label="Loading cinemas…" />
      ) : error && data === null ? (
        <ErrorMessage message={error.message} onRetry={reload} />
      ) : (
        <BookingContent initialCinemas={data ?? []} />
      )}
    </div>
  );
}
