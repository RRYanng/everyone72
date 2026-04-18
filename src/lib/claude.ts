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

// ── Prompt Builder ────────────────────────────────────────────────────────────
export function buildPrompt(round: Round, holeScores: HoleScore[], course: Course): string {
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

// ── Offline Fallback (web preview / no network) ───────────────────────────────
function generateOfflineFeedback(round: Round, holeScores: HoleScore[], course: Course): string {
  const diff = round.score_vs_par;
  const avgPutts = (round.total_putts / holeScores.length).toFixed(1);
  const worstHole    = holeScores.reduce((a, b) => (b.strokes - b.par) > (a.strokes - a.par) ? b : a);
  const bestHole     = holeScores.reduce((a, b) => (b.strokes - b.par) < (a.strokes - a.par) ? b : a);
  const highPuttHoles = holeScores.filter(h => h.putts >= 3);
  const troubleHoles  = holeScores.filter(h => h.troubles && h.troubles.length > 0);

  const assessment = diff <= 0
    ? `Great round! Shooting ${round.total_strokes} at ${course.name} (rated ${course.course_rating}) is impressive.`
    : diff <= 10
    ? `Solid round at ${course.name}. ${round.total_strokes} (+${diff}) on a ${course.course_rating}-rated course shows consistent play.`
    : `${course.name} (rating ${course.course_rating}) is challenging. A ${round.total_strokes} leaves clear room to improve.`;

  const puttNote = highPuttHoles.length > 0
    ? `🚨 Putting was a serious issue: ${highPuttHoles.map(h => `#${h.hole_number} took ${h.putts} putts`).join(', ')}. Priority #1 is eliminating 3-putts through lag putting practice.`
    : parseFloat(avgPutts) <= 1.8
    ? `Putting was a strength — ${round.total_putts} total putts is excellent.`
    : `Putting averaged ${avgPutts}/hole (${round.total_putts} total). Work on lag putting to reduce 3-putt risks.`;

  const troubleNote = troubleHoles.length > 0
    ? ` Trouble spots: ${troubleHoles.map(h => `hole #${h.hole_number} (${h.troubles!.join('+')})`).join(', ')} — practice these specific situations.`
    : '';

  return `${assessment} ${puttNote}${troubleNote} Best: #${bestHole.hole_number}. Toughest: #${worstHole.hole_number} (+${worstHole.strokes - worstHole.par}).

⚠️ AI Coach (web preview mode) — Install on your phone for full Claude-powered analysis.`;
}

// ── Main Export: analyzeRound ─────────────────────────────────────────────────
export async function analyzeRound(
  round: Round,
  holeScores: HoleScore[],
  course: Course
): Promise<string> {
  // Web + Native 均通过 Supabase Edge Function 调用 Claude（无 CORS 问题）
  const prompt = buildPrompt(round, holeScores, course);
  console.log('[Claude] Calling via Supabase Edge Function...');

  const { data, error } = await supabase.functions.invoke('analyze-round', {
    body: { prompt },
  });

  if (error) {
    console.error('[Claude] Edge Function error:', error);
    // 降级到本地分析
    console.warn('[Claude] Falling back to offline analysis');
    return generateOfflineFeedback(round, holeScores, course);
  }

  console.log('[Claude] Analysis received successfully');
  return (data as { analysis: string }).analysis;
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

  const { data, error } = await supabase.functions.invoke('analyze-round', {
    body: { prompt },
  });

  if (error || !data) {
    console.warn('[Claude] Practice plan generation failed, using fallback');
    return generateOfflinePracticePlan(round, holeScores);
  }
  return (data as { analysis: string }).analysis;
}

function generateOfflinePracticePlan(round: Round, holeScores: HoleScore[]): string {
  const highPuttHoles = holeScores.filter(h => h.putts >= 3);
  const needsPutting  = highPuttHoles.length >= 2;
  const focus = needsPutting ? 'Putting & Short Game' : 'Ball Striking & Course Management';

  return `**🎯 This Week's Focus:** ${focus}

**📅 Your Practice Schedule:**

**Mon** — ${needsPutting ? '30 min putting: 10 putts each from 3ft, 6ft, 10ft. Focus on pace control.' : '40 balls with 7-iron: slow backswing, pause at top, focus on clean contact.'}
**Tue** — Rest day. Watch one swing tip video.
**Wed** — ${needsPutting ? '20 min lag putting from 25+ feet. Goal: all putts within 3 feet.' : '20 min chipping from tight lies, 10-15 yards. Land ball on fringe, let it roll.'}
**Thu** — 30 min range: 10 balls each with PW, 8i, 6i, 4i. Track misses (left/right).
**Fri** — Rest or 15 min putting green.
**Sat** — Pre-round warmup: 5 min stretch, 10 putts, 10 chips, 5 full swings.
**Sun** — On-course goal: max 2 putts per green, no penalty shots.

**💡 Key Tip:** ${needsPutting ? 'For lag putting, focus on distance first — direction follows when speed is right.' : 'Start your downswing with your hips, not your hands.'}`;
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

function generateOfflineDiagnosis(rounds: Round[], allHoleScores: HoleScore[]): DiagnosisReport {
  const n = rounds.length;
  const avgScoreVsPar = +(rounds.reduce((s, r) => s + r.score_vs_par, 0) / n).toFixed(1);
  const avgPutts      = +(rounds.reduce((s, r) => s + r.total_putts, 0) / n).toFixed(1);
  const threePutts    = allHoleScores.filter(h => h.putts >= 3).length;
  const troubles      = allHoleScores.flatMap(h => h.troubles ?? []);
  const tTotal        = troubles.length;
  const tBunker       = troubles.filter(t => t === 'bunker').length;
  const tWater        = troubles.filter(t => t === 'water').length;
  const topIssue      = avgPutts > 34 ? 'putting' : tTotal / n > 3 ? 'course management' : 'ball striking';

  const raw = `<<CORE_ISSUE>>
Based on ${n} rounds, your biggest issue is ${topIssue}. Averaging ${avgScoreVsPar > 0 ? '+' : ''}${avgScoreVsPar} per round with ${avgPutts} putts/round, the data points to strokes being lost ${topIssue === 'putting' ? 'on the greens' : 'in hazards and rough'}.

<<DATA_EVIDENCE>>
• Average score vs par: ${avgScoreVsPar > 0 ? '+' : ''}${avgScoreVsPar} (bogey golfer benchmark: +18)
• Average putts per round: ${avgPutts} (amateur average: 33–36)
• 3-putt incidents: ${threePutts} over ${n} rounds (${+(threePutts / n).toFixed(1)}/round)
• Trouble incidents: ${+(tTotal / n).toFixed(1)}/round (bunkers: ${tBunker}, water: ${tWater})

<<ROOT_CAUSE>>
Hypothesis 1: Distance Control — Approach shots leaving putts from 30+ feet, making 3-putts inevitable.
Hypothesis 2: Club Selection — Aggressive plays near water/bunkers increasing penalty risk.
Hypothesis 3: Pre-Shot Routine — Inconsistent alignment causing directional errors in key moments.

<<PRACTICE_PLAN>>
Fix for Hypothesis 1: Lag Putting Ladder — 10 putts each from 20ft, 30ft, 40ft. Goal: all stop within 3ft. 3×/week, 20 min.
Fix for Hypothesis 2: Course Management Review — Before each round, mark 2 holes where you will lay up regardless. Track whether that changes your score on those holes.
Fix for Hypothesis 3: Alignment Stick Drill — Place 2 sticks on range to frame your stance. 50 balls/session until setup is automatic.`;

  return parseDiagnosisReport(raw);
}

export async function generateDiagnosisReport(
  rounds: Round[],
  allHoleScores: HoleScore[]
): Promise<DiagnosisReport> {
  const prompt = buildDiagnosisPrompt(rounds, allHoleScores);

  const { data, error } = await supabase.functions.invoke('analyze-round', {
    body: { prompt },
  });

  if (error || !data) {
    console.warn('[Claude] Diagnosis generation failed, using offline fallback');
    return generateOfflineDiagnosis(rounds, allHoleScores);
  }

  const raw = (data as { analysis: string }).analysis;
  const report = parseDiagnosisReport(raw);

  // Fallback: if parsing failed (empty sections), use offline
  if (!report.coreIssue && !report.dataEvidence) {
    return generateOfflineDiagnosis(rounds, allHoleScores);
  }

  return report;
}

// ── generateTroubleInsights ───────────────────────────────────────────────────
// 根据最近多轮 trouble 数据，生成战术建议
export async function generateTroubleInsights(stats: TroubleStats): Promise<string> {
  const total = stats.water + stats.ob + stats.bunker + stats.rough + stats.other;
  if (total === 0) return '';

  const topTrouble = Object.entries({
    water: stats.water, ob: stats.ob,
    bunker: stats.bunker, rough: stats.rough, other: stats.other,
  }).sort((a, b) => b[1] - a[1]).filter(e => e[1] > 0);

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

  const { data, error } = await supabase.functions.invoke('analyze-round', {
    body: { prompt },
  });

  if (error || !data) return generateOfflineTroubleAdvice(stats, topTrouble);
  return (data as { analysis: string }).analysis;
}

function generateOfflineTroubleAdvice(
  stats: TroubleStats,
  topTrouble: [string, number][]
): string {
  const top = topTrouble[0]?.[0] ?? 'rough';
  const adviceMap: Record<string, string> = {
    water: 'Aim 20-30 yards away from water on approach shots. Club down one level for more control.',
    ob: 'Tee off with a 3-wood or hybrid instead of driver on tight holes. Prioritize fairway over distance.',
    bunker: 'When in doubt, aim for the fat of the green away from bunkers. A center-green bogey beats a sand save attempt.',
    rough: 'From rough above ankle height, take one extra club and make a steeper swing. Never try to muscle a long iron.',
    other: 'Play within your comfort zone. A conservative par is worth more than an aggressive double.',
  };

  return `**1. Avoid Your #1 Hazard** — ${adviceMap[top]}
**2. Par 5 Strategy** — ${stats.byPar.par5 > stats.byPar.par4 ? 'Lay up to your comfortable yardage on par 5 second shots. Attack the pin only from the fairway.' : 'On par 4s, pick a specific target in the fairway, not just "fairway". Narrow your focus.'}
**3. Pre-Shot Routine** — Before every shot with potential trouble, pick a safe bailout area first, then decide if the aggressive shot is worth the risk.`;
}
