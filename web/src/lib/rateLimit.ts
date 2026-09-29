/**
 * In-memory per-key token bucket (server only). Guards the paid model path of /api/assistant;
 * per-instance, so a multi-instance deployment should add edge rate limiting as well.
 */
export interface TokenBucketOptions {
  capacity: number;
  /** Tokens added per second. */
  refillPerSecond: number;
  /** Keys tracked before idle entries are pruned. */
  maxKeys?: number;
}

export function createTokenBucket({ capacity, refillPerSecond, maxKeys = 5000 }: TokenBucketOptions) {
  const buckets = new Map<string, { tokens: number; updated: number }>();

  function prune(now: number) {
    for (const [key, b] of buckets) {
      if (b.tokens + ((now - b.updated) / 1000) * refillPerSecond >= capacity) buckets.delete(key);
    }
    // Still full of active keys: drop the oldest entries rather than grow without bound.
    while (buckets.size >= maxKeys) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  }

  /** Take one token for `key`; false when the bucket is empty. */
  return function take(key: string, now: number = Date.now()): boolean {
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= maxKeys) prune(now);
      b = { tokens: capacity, updated: now };
      buckets.set(key, b);
    }
    b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / 1000) * refillPerSecond);
    b.updated = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  };
}
