// ============================================================
// Claude AI 分析引擎
//
// 安全架构：
//   - API key 存储在 Supabase 后端 (Edge Function secrets)
//   - 客户端 → Supabase Edge Function → Claude API
//   - CLAUDE_API_KEY 不再出现在前端代码或 .env 文件中
//
// Web 预览模式下优雅降级（CORS）
// ============================================================

import { supabase } from './supabase';
import { Round, HoleScore, Course, TroubleStats } from '../types';
import { getLongestParStreak, getPuttingFacts, correctRoundFactCounts } from './parStreak';

// ── Edge Function 调用 ────────────────────────────────────────────────────────
// 失败一律抛 AIError,由界面显示真实状态并允许重试。
// 之前这里会悄悄退回本地模板,而调用方又把模板当成 AI 分析写进了数据库
// (rounds.ai_feedback / practice_plans),用户看到的"AI 建议"其实是固定文案。
export type AIErrorCode =
  | 'quota_exceeded'   // 今日额度用完
  | 'unauthorized'     // 登录失效
  | 'ai_unavailable'   // 上游暂时不可用 / 超时 / 网络
  | 'ai_error';        // 上游返回了无法使用的内容

export class AIError extends Error {
  constructor(public code: AIErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AIError';
  }
}

export function aiErrorMessage(err: unknown): string {
  const code = err instanceof AIError ? err.code : 'ai_unavailable';
  switch (code) {
    case 'quota_exceeded': return "You've reached today's AI coach limit. It resets tomorrow.";
    case 'unauthorized':   return 'Your session expired. Please sign in again.';
    default:               return 'The AI coach is unavailable right now. Please try again in a moment.';
  }
}

export type AIKind = 'analysis' | 'plan' | 'diagnosis' | 'trouble';

async function invokeAI(kind: AIKind, prompt: string): Promise<{ text: string; truncated: boolean }> {
  const { data, error } = await supabase.functions.invoke('analyze-round', { body: { prompt, kind } });

  if (error) {
    let code: AIErrorCode = 'ai_unavailable';
    // FunctionsHttpError 的 context 是原始 Response,里面有服务端给的 code
    const ctx = (error as { context?: unknown }).context;
    if (ctx && typeof (ctx as Response).json === 'function') {
      try {
        const body = await (ctx as Response).json();
        if (body?.code === 'quota_exceeded' || body?.code === 'unauthorized' || body?.code === 'ai_error') {
          code = body.code;
        }
      } catch { /* 响应体不是 JSON,保持 ai_unavailable */ }
    }
    console.warn('[Claude] Edge Function error:', code);
    throw new AIError(code);
  }

  const analysis = (data as { analysis?: unknown } | null)?.analysis;
  if (typeof analysis !== 'string' || !analysis.trim()) throw new AIError('ai_error');
  return { text: analysis, truncated: !!(data as { truncated?: boolean }).truncated };
}

// ── Prompt Builder ────────────────────────────────────────────────────────────
export function buildPrompt(round: Round, holeScores: HoleScore[], course: Course): string {
  const parStreak = getLongestParStreak(holeScores);
  const playedPar = holeScores.reduce((total, hole) => total + hole.par, 0);
  const parCount = holeScores.filter(hole => hole.strokes === hole.par).length;
  const puttingFacts = getPuttingFacts(holeScores);
  const scoreTable = holeScores
    .map(h => {
      const troubles = h.troubles?.length ? h.troubles.join(', ') : '—';
      return `| ${h.hole_number} | ${h.par} | ${h.strokes} | ${h.putts} | ${h.strokes - h.par > 0 ? '+' : ''}${h.strokes - h.par} | ${troubles} |`;
    })
    .join('\n');

  const highPuttHoles = holeScores.filter(h => h.putts >= 3);
  const troubleHoles  = holeScores.filter(h => h.troubles && h.troubles.length > 0);

  const puttAlert = highPuttHoles.length > 0
    ? `\n⚠️ PUTTING ALERT: Holes ${highPuttHoles.map(h => `#${h.hole_number} (${h.putts} putts)`).join(', ')} had 3+ putts. You MUST call these out specifically as critical issues requiring immediate attention.`
    : '';

  const troubleAlert = troubleHoles.length > 0
    ? `\n⚠️ TROUBLE HOLES: ${troubleHoles.map(h => `#${h.hole_number} (${h.troubles!.join(', ')})`).join(', ')}. Mention these specifically and give targeted advice for each trouble type.`
    : '';

  return `You are an experienced golf coach and data analyst. Analyze this player's round:

## Course Info
- Course: ${course.name}, ${course.city}, ${course.state}
- Rating: ${course.course_rating} / Slope: ${course.slope_rating} / Par: ${course.total_par}

## Verified Scorecard Facts
- Holes played: ${holeScores.length}; played-hole par: ${playedPar}. The full-course par above is not the par for a partial round.
- Total par holes: ${parCount}.
- Putting totals: ${puttingFacts.totalPutts} putts; ${puttingFacts.twoPuttHoles} two-putt holes used exactly ${puttingFacts.twoPuttStrokes} putts. Hole counts and putt counts are different quantities.
- Longest par streak: ${parStreak.length} consecutive pars${parStreak.length ? ` (holes #${parStreak.start} through #${parStreak.end}, inclusive)` : ''}.
- These counts are computed from the scorecard. Use them exactly; do not estimate or recount them. Any par-streak claim must refer to this longest streak and use its exact count and hole range.

## Scorecard
| Hole | Par | Strokes | Putts | vs Par | Trouble |
|------|-----|---------|-------|--------|---------|
${scoreTable}

**Summary:** ${round.total_strokes} total (${round.score_vs_par > 0 ? '+' : ''}${round.score_vs_par}), ${round.total_putts} putts
${puttAlert}${troubleAlert}

Analysis (80–120 words, English, encouraging but honest):
1. **Overall** — Score vs course difficulty
2. **Putting** — ${highPuttHoles.length > 0 ? `CRITICAL: address the 3-putt holes specifically` : 'strength or weakness?'}
3. **Key Holes** — Best and worst moments, mention trouble holes by number
4. **Practice Tips** — 2-3 specific drills targeting the weaknesses shown`;
}

// ── Main Export: analyzeRound ─────────────────────────────────────────────────
export async function analyzeRound(
  round: Round,
  holeScores: HoleScore[],
  course: Course
): Promise<string> {
  const prompt = buildPrompt(round, holeScores, course);
  const { text } = await invokeAI('analysis', prompt);
  // 事实校验:纠正模型对连续 par 数 / 推杆统计的数错
  return correctRoundFactCounts(text, holeScores);
}

// ── generatePracticePlan ──────────────────────────────────────────────────────
// 根据本轮成绩 + 历史数据，生成个性化本周练习计划
export async function generatePracticePlan(
  round: Round,
  holeScores: HoleScore[],
  course: Course,
  historySummary?: string   // 历史成绩摘要（可选）
): Promise<string> {
  const highPuttHoles = holeScores.filter(h => h.putts >= 3);
  const troubleHoles  = holeScores.filter(h => h.troubles && h.troubles.length > 0);
  const worstHole     = holeScores.reduce((a, b) => (b.strokes - b.par) > (a.strokes - a.par) ? b : a);

  // 计算主要问题
  const issues: string[] = [];
  if (highPuttHoles.length >= 2) issues.push(`putting (3-putted ${highPuttHoles.length} holes)`);
  if (troubleHoles.length >= 3)  issues.push(`course management (${troubleHoles.length} trouble holes)`);
  if (round.score_vs_par > 10)   issues.push('overall ball striking');
  if (issues.length === 0)       issues.push('consistency and course management');

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 本周一

  const prompt = `You are an elite golf coach. Based on this player's recent round, create a specific 7-day practice plan.

## Round Data
- Course: ${course.name} (Rating ${course.course_rating}, Slope ${course.slope_rating})
- Score: ${round.total_strokes} (${round.score_vs_par > 0 ? '+' : ''}${round.score_vs_par})
- Total putts: ${round.total_putts}
- Worst hole: #${worstHole.hole_number} (${worstHole.strokes - worstHole.par > 0 ? '+' : ''}${worstHole.strokes - worstHole.par})
- 3-putt holes: ${highPuttHoles.length > 0 ? highPuttHoles.map(h => `#${h.hole_number}`).join(', ') : 'none'}
- Trouble holes: ${troubleHoles.length > 0 ? troubleHoles.map(h => `#${h.hole_number} (${h.troubles!.join('+')})`).join(', ') : 'none'}
- Key issues: ${issues.join(', ')}
${historySummary ? `\n## Recent History\n${historySummary}` : ''}

## Instructions
Generate a practical 7-day practice plan. Format EXACTLY like this:

**🎯 This Week's Focus:** [2-3 word focus area]

**📅 Your Practice Schedule:**

**Mon** — [specific drill, duration, reps, target distance/count]
**Tue** — [rest or light activity]
**Wed** — [specific drill, duration, reps]
**Thu** — [specific drill, duration, reps]
**Fri** — [rest or light activity]
**Sat** — [pre-round warmup routine, 15 min]
**Sun** — [on-course goal for next round]

**💡 Key Tip:** [One sentence most important technical tip based on the data]

Keep each day's instruction to 1-2 sentences. Be specific with numbers (minutes, balls, distances). Total response: 150-200 words.`;

  const { text } = await invokeAI('plan', prompt);
  return text;
}

// ── generateDiagnosisReport ───────────────────────────────────────────────────
// 传入最近 5-10 轮全量数据，返回结构化的 4-part 诊断报告

export interface DiagnosisReport {
  coreIssue: string;
  dataEvidence: string;
  rootCause: string;
  practicePlan: string;
  raw: string;
}

function parseDiagnosisReport(raw: string): DiagnosisReport {
  const extract = (tag: string): string => {
    const regex = new RegExp(`<<${tag}>>([\\s\\S]*?)(?=<<[A-Z_]+>>|$)`, 'i');
    const m = raw.match(regex);
    return m ? m[1].trim() : '';
  };
  return {
    coreIssue:    extract('CORE_ISSUE'),
    dataEvidence: extract('DATA_EVIDENCE'),
    rootCause:    extract('ROOT_CAUSE'),
    practicePlan: extract('PRACTICE_PLAN'),
    raw,
  };
}

function buildDiagnosisPrompt(rounds: Round[], allHoleScores: HoleScore[]): string {
  // ── Per-round stats ──────────────────────────────────────────────────────────
  const roundRows = rounds.map((r, i) => {
    const holes = allHoleScores.filter(h => h.round_id === r.id);
    const threePutts = holes.filter(h => h.putts >= 3).length;
    const troubles   = holes.flatMap(h => h.troubles ?? []);
    const water  = troubles.filter(t => t === 'water').length;
    const ob     = troubles.filter(t => t === 'ob').length;
    const bunker = troubles.filter(t => t === 'bunker').length;
    const rough  = troubles.filter(t => t === 'rough').length;
    const courseName = (r as any).courses?.name ?? `Course ${i + 1}`;
    const rating     = (r as any).courses?.course_rating ?? '?';
    const slope      = (r as any).courses?.slope_rating ?? '?';
    const date       = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `| ${i + 1} | ${date} | ${courseName} | ${rating}/${slope} | ${r.total_strokes} | ${r.score_vs_par > 0 ? '+' : ''}${r.score_vs_par} | ${r.total_putts} | ${threePutts} | W:${water} OB:${ob} B:${bunker} R:${rough} |`;
  });

  // ── Aggregated stats ─────────────────────────────────────────────────────────
  const n = rounds.length;
  const avgScoreVsPar = +(rounds.reduce((s, r) => s + r.score_vs_par, 0) / n).toFixed(1);
  const avgPutts      = +(rounds.reduce((s, r) => s + r.total_putts, 0) / n).toFixed(1);
  const totalHoles    = allHoleScores.length;
  const threePuttTotal = allHoleScores.filter(h => h.putts >= 3).length;
  const threePuttRate  = totalHoles > 0 ? +((threePuttTotal / totalHoles) * 100).toFixed(1) : 0;

  const allTroubles = allHoleScores.flatMap(h => h.troubles ?? []);
  const tWater  = allTroubles.filter(t => t === 'water').length;
  const tOB     = allTroubles.filter(t => t === 'ob').length;
  const tBunker = allTroubles.filter(t => t === 'bunker').length;
  const tRough  = allTroubles.filter(t => t === 'rough').length;
  const tOther  = allTroubles.filter(t => t === 'other').length;
  const tTotal  = allTroubles.length;
  const troublePerRound = +(tTotal / n).toFixed(1);

  const tPar3 = allHoleScores.filter(h => h.par === 3 && (h.troubles?.length ?? 0) > 0).length;
  const tPar4 = allHoleScores.filter(h => h.par === 4 && (h.troubles?.length ?? 0) > 0).length;
  const tPar5 = allHoleScores.filter(h => h.par === 5 && (h.troubles?.length ?? 0) > 0).length;

  // Scoring breakdown per hole
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0;
  allHoleScores.forEach(h => {
    const d = h.strokes - h.par;
    if (d <= -2) eagles++;
    else if (d === -1) birdies++;
    else if (d === 0) pars++;
    else if (d === 1) bogeys++;
    else doubles++;
  });

  return `You are a PGA-level golf coach and data scientist. Analyze this player's last ${n} rounds of detailed scorecard data and produce a brutally honest, data-driven diagnosis. Your goal: identify the one or two issues that are costing the most strokes per round, backed by specific numbers.

## Round-by-Round Summary
| # | Date | Course | Rating/Slope | Score | vs Par | Putts | 3-Putts | Troubles |
|---|------|--------|-------------|-------|--------|-------|---------|---------|
${roundRows.join('\n')}

## Aggregated Statistics (all ${n} rounds)
- Average score vs par: ${avgScoreVsPar > 0 ? '+' : ''}${avgScoreVsPar}
- Average putts per round: ${avgPutts}
- 3-putt rate: ${threePuttRate}% of greens (${threePuttTotal} total 3-putts in ${totalHoles} holes)
- Trouble incidents: ${troublePerRound}/round (${tTotal} total) — Water: ${tWater}, OB: ${tOB}, Bunker: ${tBunker}, Rough: ${tRough}, Other: ${tOther}
- Trouble by hole type: Par 3s: ${tPar3}, Par 4s: ${tPar4}, Par 5s: ${tPar5}
- Scoring breakdown: Eagles/better: ${eagles}, Birdies: ${birdies}, Pars: ${pars}, Bogeys: ${bogeys}, Doubles+: ${doubles}

## Output Format
Use EXACTLY these four section markers (include the << >> delimiters):

<<CORE_ISSUE>>
State the 1-2 most damaging, specific problems (e.g., "chronic lag putting — 3-putts on ${threePuttRate}% of greens" not just "putting needs work"). Name the exact failure mode. Cite the data inline. Be blunt. 2-3 sentences per issue. Max 120 words.

<<DATA_EVIDENCE>>
3-5 bullet points of the specific numbers that prove the diagnosis. Go beyond the obvious — calculate rates, identify patterns across rounds, note any outlier rounds. Include context (e.g., compare to typical amateur benchmarks: avg amateur 3-putts ~8-10% of greens, bogey golfer loses ~3 strokes/round to full swings from rough). Max 100 words.

<<ROOT_CAUSE>>
2-3 hypotheses for WHY this is happening. Each must be specific and testable — not "poor technique" but "over-aggressive club selection on approaches leading to long first putts." Label them: "Hypothesis 1: [Name] — [explanation]". Max 120 words.

<<PRACTICE_PLAN>>
One targeted drill/intervention per hypothesis. Include: drill name, exact protocol (reps, duration, distances, equipment), and a measurable success metric. Label: "Fix for Hypothesis 1: [Drill] — [exact instructions] — Goal: [metric]". Be a coach, not a cheerleader. Max 150 words.

Do not use any other headers or formatting outside of these four sections.`;
}

export async function generateDiagnosisReport(
  rounds: Round[],
  allHoleScores: HoleScore[]
): Promise<DiagnosisReport> {
  const prompt = buildDiagnosisPrompt(rounds, allHoleScores);
  const { text } = await invokeAI('diagnosis', prompt);
  const report = parseDiagnosisReport(text);

  // 模型没按约定的 <<SECTION>> 格式返回 → 当作失败,而不是展示一份空报告
  if (!report.coreIssue && !report.dataEvidence) throw new AIError('ai_error');
  return report;
}

// ── generateTroubleInsights ───────────────────────────────────────────────────
// 根据最近多轮 trouble 数据，生成战术建议
export async function generateTroubleInsights(stats: TroubleStats): Promise<string> {
  const total = stats.water + stats.ob + stats.bunker + stats.rough + stats.other;
  if (total === 0) return '';


  const prompt = `You are a strategic golf coach. Analyze this player's trouble pattern from their last ${stats.totalRounds} rounds and give tactical advice.

## Trouble Statistics (last ${stats.totalRounds} rounds)
- Water hazards: ${stats.water} times
- Out of bounds: ${stats.ob} times
- Bunkers: ${stats.bunker} times
- Rough: ${stats.rough} times
- Other: ${stats.other} times
- Total trouble incidents: ${total}

## Trouble by Hole Type
- Par 3s: ${stats.byPar.par3} incidents
- Par 4s: ${stats.byPar.par4} incidents
- Par 5s: ${stats.byPar.par5} incidents

## Instructions
Give 3 specific tactical strategies to reduce trouble. Format:

**1. [Strategy Name]** — [One specific actionable tactic, e.g. club selection, aim point, pre-shot routine change]
**2. [Strategy Name]** — [One specific actionable tactic]
**3. [Strategy Name]** — [One specific actionable tactic]

Be concrete (mention specific clubs, distances, targets). Total: 80-100 words.`;

  const { text } = await invokeAI('trouble', prompt);
  return text;
}
