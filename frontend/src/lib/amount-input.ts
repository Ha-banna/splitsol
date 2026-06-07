/** Keep only digits and one decimal point (max 6 fractional digits). */
export function sanitizeAmountInput(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  const whole = cleaned.slice(0, dot);
  const frac = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 6);
  return `${whole}.${frac}`;
}

export function parsePositiveAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Parse a non-negative decimal (0 allowed). */
export function parseNonNegativeAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}
