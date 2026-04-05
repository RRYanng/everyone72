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
import { Round, HoleScore, Course } from '../types';

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
