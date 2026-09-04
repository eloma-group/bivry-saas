/**
 * Digits and a single decimal point: what a money or percent box accepts.
 *
 * Everything else is dropped where it is typed or pasted, and only the first
 * dot survives, so "12..5" and "1.2.3" cannot be entered at all rather than
 * being accepted and refused later. A dot typed first is kept, because ".50"
 * is a reasonable way to start typing fifty cents.
 *
 * It sits here rather than in the field kit because two things clean a typed
 * amount now: `TextField`'s `decimalOnly`, and the paired rate/amount field on
 * Our Price, which draws its own input.
 */
export function decimals(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}
