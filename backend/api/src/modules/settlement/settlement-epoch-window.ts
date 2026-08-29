const EPOCH_WINDOW_MS = 15 * 60 * 1_000;

export type SettlementEpochWindow = {
  epochKey: string;
  windowStart: Date;
  windowEnd: Date;
};

/** Produces a stable key so retries never create a second epoch for the same agreement window. */
export function settlementEpochWindow(agreementId: string, occurredAt: Date): SettlementEpochWindow {
  const windowStartMs = Math.floor(occurredAt.getTime() / EPOCH_WINDOW_MS) * EPOCH_WINDOW_MS;
  const windowStart = new Date(windowStartMs);
  const windowEnd = new Date(windowStartMs + EPOCH_WINDOW_MS);
  return {
    epochKey: `${agreementId}:${windowStart.toISOString()}:${windowEnd.toISOString()}`,
    windowStart,
    windowEnd,
  };
}
