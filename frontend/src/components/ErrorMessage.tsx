interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-400/40 px-3 py-1.5 font-medium text-red-100 transition hover:bg-red-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
