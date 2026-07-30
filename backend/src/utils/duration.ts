const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Converts a JWT style duration ("15m", "7d", "900") to milliseconds so the
 * same value can drive both the token expiry and the database row expiry.
 */
export function durationToMs(value: string, fallbackMs = 0): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2];
  // A bare number is seconds, matching how jsonwebtoken reads it.
  return unit ? amount * UNIT_MS[unit] : amount * 1000;
}

export function expiryDateFrom(value: string, fallbackMs: number): Date {
  return new Date(Date.now() + durationToMs(value, fallbackMs));
}
