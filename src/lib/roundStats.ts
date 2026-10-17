// ============================================================
// 成绩统计 —— 9 洞和 18 洞不能直接混在一起平均。
//
// 之前 Home / History / Crew 各自把 total_strokes、total_putts、score_vs_par
// 原样求平均,一个 9 洞的 38 杆会把平均拉低 ~15 杆,并且永远是"最好成绩"。
//
// 规则:
//   * 平均杆数 / 平均推杆 / Handicap:按 18 洞折算(值 × 18 ÷ 洞数)。
//     折算出来的是估算值(假设另一半和打过的这一半一样),界面上要标 "≈"。
//   * 最好成绩:不折算,9 洞和 18 洞分开取最小值,因为"最好"必须是真打出来的。
// ============================================================

export interface RoundStatsInput {
  total_holes?: number | null;
  total_strokes?: number | null;
  total_putts?: number | null;
  score_vs_par?: number | null;
}

/** 这一轮打了几洞;旧数据没填时按 18 洞算(数据库默认值就是 18)。 */
export function roundHoles(r: RoundStatsInput): number {
  return r.total_holes && r.total_holes > 0 ? r.total_holes : 18;
}

/** 折算成 18 洞。 */
export function per18(value: number, holes: number): number {
  return (value * 18) / holes;
}

export interface Per18Average {
  /** 折算后的平均值(未取整);没有可用数据时为 null */
  value: number | null;
  /** 只要有一轮不是 18 洞,这个数就是估算值,界面上要显示 "≈" */
  approx: boolean;
}

/** 按 18 洞折算后的平均值。pick 取要平均的字段,取不到数的轮次会被跳过。 */
export function averagePer18(
  rounds: RoundStatsInput[],
  pick: (r: RoundStatsInput) => number | null | undefined,
): Per18Average {
  const usable = rounds
    .map(r => ({ v: pick(r), h: roundHoles(r) }))
    .filter((x): x is { v: number; h: number } => typeof x.v === 'number' && Number.isFinite(x.v));
  if (usable.length === 0) return { value: null, approx: false };
  const sum = usable.reduce((s, x) => s + per18(x.v, x.h), 0);
  return { value: sum / usable.length, approx: usable.some(x => x.h !== 18) };
}

/**
 * Handicap(简化版):取相对标准杆成绩最好的一半(最多 8 轮)求平均。
 * 每轮的相对标准杆先按 18 洞折算:9 洞的 +2 按 +4 参与比较。
 * 返回值保留 1 位小数。
 */
export function handicap18(rounds: RoundStatsInput[]): number | null {
  const diffs = rounds
    .filter(r => typeof r.score_vs_par === 'number' && Number.isFinite(r.score_vs_par))
    .map(r => per18(r.score_vs_par as number, roundHoles(r)))
    .sort((a, b) => a - b);
  if (diffs.length === 0) return null;
  const take = Math.min(Math.ceil(diffs.length / 2), 8);
  const best = diffs.slice(0, take);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

export interface BestScores {
  best18: number | null;
  best9: number | null;
}

/** 18 洞和 9 洞分开的最好成绩(真实杆数,不折算)。其他洞数的轮次不参与。 */
export function bestScores(rounds: RoundStatsInput[]): BestScores {
  let best18: number | null = null;
  let best9: number | null = null;
  for (const r of rounds) {
    if (typeof r.total_strokes !== 'number' || !Number.isFinite(r.total_strokes)) continue;
    const holes = roundHoles(r);
    if (holes === 18) best18 = best18 === null ? r.total_strokes : Math.min(best18, r.total_strokes);
    else if (holes === 9) best9 = best9 === null ? r.total_strokes : Math.min(best9, r.total_strokes);
  }
  return { best18, best9 };
}

/** "Best 18: 71 · Best 9: 38";缺的一项显示 —。 */
export function formatBestScores(b: BestScores): string {
  return `Best 18: ${b.best18 ?? '—'} · Best 9: ${b.best9 ?? '—'}`;
}
