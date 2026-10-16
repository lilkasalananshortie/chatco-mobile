export type CashSyncOutcome = { status: "synced" | "failed"; error?: string };

/** Match a server acknowledgement to its durable idempotency key, not a row index. */
export function cashSyncOutcome(response: unknown, key: string, localId: string): CashSyncOutcome | undefined {
  if (!response || typeof response !== "object") return undefined;
  const payload = response as { items?: unknown; results?: unknown };
  let result: unknown;
  if (Array.isArray(payload.items)) {
    result = payload.items.find(item => item && typeof item === "object" && item.idempotency_key === key);
  } else if (payload.results && typeof payload.results === "object") {
    // Compatibility with an older keyed response during staggered deployments.
    const results = payload.results as Record<string, unknown>;
    result = results[key] ?? results[localId];
  }
  if (!result || typeof result !== "object") return undefined;
  const outcome = result as CashSyncOutcome;
  return outcome.status === "synced" || outcome.status === "failed" ? outcome : undefined;
}
