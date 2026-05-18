const STORAGE_KEY_PREFIX = 'rl_';

function getAttempts(key: string): number[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function saveAttempts(key: string, attempts: number[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(attempts));
  } catch {
    // sessionStorage unavailable — fail open
  }
}

/** Record one attempt for the given key. */
export function recordAttempt(key: string): void {
  const attempts = getAttempts(key);
  attempts.push(Date.now());
  saveAttempts(key, attempts);
}

/**
 * Returns true if the user is within limits, false if rate-limited.
 * Also prunes expired entries so storage doesn't grow unbounded.
 */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const attempts = getAttempts(key).filter((t) => now - t < windowMs);
  saveAttempts(key, attempts);
  return attempts.length < maxAttempts;
}

/** How many ms remain until the oldest attempt falls outside the window. */
export function msUntilReset(key: string, windowMs: number): number {
  const now = Date.now();
  const attempts = getAttempts(key).filter((t) => now - t < windowMs);
  if (attempts.length === 0) return 0;
  const oldest = Math.min(...attempts);
  return Math.max(0, windowMs - (now - oldest));
}
