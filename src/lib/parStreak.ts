import type { HoleScore } from '../types';

export function getLongestParStreak(holes: HoleScore[]) {
  let longest = { length: 0, start: 0, end: 0 };
  let current = { length: 0, start: 0, end: 0 };
  for (const hole of [...holes].sort((a, b) => a.hole_number - b.hole_number)) {
    if (hole.strokes !== hole.par) {
      current = { length: 0, start: 0, end: 0 };
      continue;
    }
    current = current.length && hole.hole_number === current.end + 1
      ? { ...current, length: current.length + 1, end: hole.hole_number }
      : { length: 1, start: hole.hole_number, end: hole.hole_number };
    if (current.length > longest.length) longest = { ...current };
  }
  return longest;
}

const countWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen'];

// The round prompt only permits claims about the longest par streak. Keep that
// count tied to the scorecard even if the provider miscounts it in prose.
export function correctParStreakCounts(text: string, holes: HoleScore[]): string {
  const { length } = getLongestParStreak(holes);
  const count = `(\\d+|${countWords.join('|')})`;
  const claims = new RegExp(`\\b${count}(?:\\s+consecutive\\s+pars?\\b|[\\s–-]+holes?\\s+par\\s+streak\\b)`, 'gi');
  return text.replace(claims, (claim: string, rawCount: string) => {
    const claimed = /^\d+$/.test(rawCount) ? Number(rawCount) : countWords.indexOf(rawCount.toLowerCase());
    return claimed === length ? claim : claim.replace(rawCount, String(length));
  });
}

export function hasIncorrectParStreakCount(text: string, holes: HoleScore[]): boolean {
  return correctParStreakCounts(text, holes) !== text;
}
