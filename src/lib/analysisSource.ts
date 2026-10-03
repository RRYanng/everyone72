// Recognize persisted local results without changing the database schema.
export function isOfflineContent(text?: string | null): boolean {
  if (!text) return false;
  if (text.includes('Offline fallback')) return true;

  // Practice plans saved before the fallback notice was introduced.
  return text.includes('Rest day. Watch one swing tip video.')
    && text.includes('Pre-round warmup: 5 min stretch, 10 putts, 10 chips, 5 full swings.')
    && text.includes('On-course goal: max 2 putts per green, no penalty shots.');
}
