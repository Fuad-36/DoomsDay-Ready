import { useState } from "react";
import type { FormEvent } from "react";
import { getBookingQuote } from "../../api/client";
import type { BookingQuote, Cinema } from "../../api/client";
import { ErrorMessage } from "../../components/ErrorMessage";
import { Spinner } from "../../components/Spinner";
import { BookingResult } from "./BookingResult";
import { toErrorMessage } from "./errors";

const MIN_GROUP_SIZE = 1;
const MAX_GROUP_SIZE = 10000;

interface BookingQuoteFormProps {
  cinemas: readonly Cinema[];
  selectedCinemaId: string;
  onCinemaChange: (id: string) => void;
}

function validateGroupSize(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Group size is required.";
  }

  const groupSize = Number(trimmed);
  if (
    !Number.isInteger(groupSize) ||
    groupSize < MIN_GROUP_SIZE ||
    groupSize > MAX_GROUP_SIZE
  ) {
    return `Group size must be a whole number between ${MIN_GROUP_SIZE} and ${MAX_GROUP_SIZE}.`;
  }

  return null;
}

export function BookingQuoteForm({
  cinemas,
  selectedCinemaId,
  onCinemaChange,
}: BookingQuoteFormProps) {
  const [groupSize, setGroupSize] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [loading, setLoading] = useState(false);

  function resetResult() {
    setQuote(null);
    setServerError(null);
  }

  function handleCinemaChange(id: string) {
    onCinemaChange(id);
    setFieldError(null);
    resetResult();
  }

  function handleGroupSizeChange(value: string) {
    setGroupSize(value);
    resetResult();

    if (fieldError !== null) {
      setFieldError(validateGroupSize(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const validationError = validateGroupSize(groupSize);
    setFieldError(validationError);
    setServerError(null);
    setQuote(null);

    if (validationError || selectedCinemaId.length === 0) {
      return;
    }

    setLoading(true);

    try {
      const result = await getBookingQuote(
        selectedCinemaId,
        Number(groupSize.trim()),
      );
      setQuote(result);
    } catch (reason: unknown) {
      setServerError(
        toErrorMessage(reason, "Could not build a quote. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = selectedCinemaId.length > 0 && !loading;
  const selectedCinema = cinemas.find(
    (cinema) => cinema.id === selectedCinemaId,
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-lg font-semibold text-slate-100">Build a quote</h3>
      <p className="mt-1 text-sm text-slate-400">
        Choose a cinema and group size to see the bundle breakdown.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="booking-cinema"
            className="block text-sm font-medium text-slate-300"
          >
            Cinema
          </label>
          <select
            id="booking-cinema"
            value={selectedCinemaId}
            disabled={loading}
            onChange={(event) => handleCinemaChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select a cinema</option>
            {cinemas.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>
                {cinema.name}
              </option>
            ))}
          </select>
          {selectedCinema && (
            <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-xs font-medium text-slate-400">
                Available bundle sizes
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCinema.bundleSizes.map((size) => (
                  <span
                    key={size}
                    className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-300"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="booking-group-size"
            className="block text-sm font-medium text-slate-300"
          >
            Group size
          </label>
          <input
            id="booking-group-size"
            type="number"
            min={MIN_GROUP_SIZE}
            max={MAX_GROUP_SIZE}
            step={1}
            inputMode="numeric"
            value={groupSize}
            disabled={loading}
            placeholder="e.g. 35"
            onChange={(event) => handleGroupSizeChange(event.target.value)}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={
              fieldError ? "booking-group-size-error" : undefined
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {fieldError ? (
            <p
              id="booking-group-size-error"
              role="alert"
              className="mt-1 text-xs text-red-300"
            >
              {fieldError}
            </p>
          ) : null}
        </div>

        {serverError ? <ErrorMessage message={serverError} /> : null}

        {loading ? <Spinner label="Building quote…" /> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Getting quote…" : "Get quote"}
          </button>
        </div>
      </form>

      {quote ? (
        <div className="mt-4">
          <BookingResult quote={quote} />
        </div>
      ) : null}
    </section>
  );
}
