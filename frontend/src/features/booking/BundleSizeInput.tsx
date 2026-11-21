import { useId, useState } from 'react';

const MIN_BUNDLE_SIZE = 1;
const MAX_BUNDLE_SIZE = 500;
const MAX_BUNDLE_SIZES = 10;

interface BundleSizeInputProps {
  sizes: readonly number[];
  onAdd: (size: number) => void;
  onRemove: (size: number) => void;
}

function getValidationMessage(
  value: string,
  sizes: readonly number[],
): string | null {
  if (sizes.length >= MAX_BUNDLE_SIZES) {
    return `You can add up to ${MAX_BUNDLE_SIZES} bundle sizes.`;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const size = Number(trimmed);
  if (
    !Number.isInteger(size) ||
    size < MIN_BUNDLE_SIZE ||
    size > MAX_BUNDLE_SIZE
  ) {
    return `Bundle size must be a whole number between ${MIN_BUNDLE_SIZE} and ${MAX_BUNDLE_SIZE}.`;
  }

  if (sizes.includes(size)) {
    return 'That bundle size has already been added.';
  }

  return null;
}

export function BundleSizeInput({
  sizes,
  onAdd,
  onRemove,
}: BundleSizeInputProps) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');

  const validationMessage = getValidationMessage(value, sizes);
  const parsedSize = Number(value.trim());
  const canAdd =
    value.trim().length > 0 &&
    validationMessage === null &&
    Number.isInteger(parsedSize) &&
    parsedSize >= MIN_BUNDLE_SIZE &&
    parsedSize <= MAX_BUNDLE_SIZE;

  function handleAdd() {
    if (!canAdd) {
      return;
    }

    onAdd(parsedSize);
    setValue('');
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-300"
      >
        Bundle size
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={value}
          placeholder="e.g. 2"
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(validationMessage)}
          aria-describedby={validationMessage ? errorId : undefined}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:max-w-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="shrink-0 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add size
        </button>
      </div>

      {validationMessage ? (
        <p id={errorId} role="alert" className="text-xs text-red-300">
          {validationMessage}
        </p>
      ) : null}

      {sizes.length > 0 ? (
        <ul aria-label="Bundle sizes" className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <li
              key={size}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200"
            >
              {size}
              <button
                type="button"
                onClick={() => onRemove(size)}
                aria-label={`Remove bundle size ${size}`}
                className="rounded-full p-0.5 text-amber-200/80 transition hover:bg-amber-400/20 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
