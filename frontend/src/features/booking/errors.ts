export function toErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message.trim().length > 0) {
    return reason.message;
  }

  return fallback;
}
