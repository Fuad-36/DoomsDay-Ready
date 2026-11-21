import { useState } from 'react';
import type { FormEvent } from 'react';
import { createCinema } from '../../api/client';
import type { Cinema, CreateCinemaInput } from '../../api/client';
import { ErrorMessage } from '../../components/ErrorMessage';
import { BundleSizeInput } from './BundleSizeInput';
import { toErrorMessage } from './errors';

interface AddCinemaFormProps {
  onCreated: (cinema: Cinema) => void;
}

export function AddCinemaForm({ onCreated }: AddCinemaFormProps) {
  const [name, setName] = useState('');
  const [sizes, setSizes] = useState<number[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const canSubmit = name.trim().length > 0 && sizes.length > 0 && !submitting;

  function clearServerError() {
    setServerError(null);
  }

  function handleAddSize(size: number) {
    setSizes((current) => {
      if (current.includes(size) || current.length >= 10) {
        return current;
      }
      return [...current, size];
    });
    clearServerError();
  }

  function handleRemoveSize(size: number) {
    setSizes((current) => current.filter((candidate) => candidate !== size));
    clearServerError();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const input: CreateCinemaInput = {
        name: name.trim(),
        bundleSizes: sizes,
      };
      const created = await createCinema(input);

      setName('');
      setSizes([]);
      setResetToken((token) => token + 1);
      onCreated(created);
    } catch (reason: unknown) {
      setServerError(
        toErrorMessage(
          reason,
          'Could not add the cinema. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-lg font-semibold text-slate-100">Add a cinema</h3>
      <p className="mt-1 text-sm text-slate-400">
        Create a cinema and list the bundle sizes it offers.
      </p>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="add-cinema-name"
            className="block text-sm font-medium text-slate-300"
          >
            Cinema name
          </label>
          <input
            id="add-cinema-name"
            type="text"
            value={name}
            maxLength={200}
            autoComplete="off"
            placeholder="e.g. Downtown Cinema"
            onChange={(event) => {
              setName(event.target.value);
              clearServerError();
            }}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          />
        </div>

        <BundleSizeInput
          key={resetToken}
          sizes={sizes}
          onAdd={handleAddSize}
          onRemove={handleRemoveSize}
        />

        {sizes.length === 0 ? (
          <p className="text-xs text-slate-500">
            Add at least one bundle size to create a cinema.
          </p>
        ) : null}

        {serverError ? <ErrorMessage message={serverError} /> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add cinema'}
          </button>
        </div>
      </form>
    </section>
  );
}
