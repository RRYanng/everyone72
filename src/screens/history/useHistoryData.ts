// ============================================================
// HistoryScreen 数据层 hook
// 封装 rounds / troubleStats / diagnosisReport 三路 fetch + state
// ============================================================

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  isDevMockActive,
  MOCK_ROUNDS, MOCK_TROUBLE_STATS, MOCK_TROUBLE_INSIGHT, MOCK_DIAGNOSIS_REPORT,
} from '../../lib/mockUser';
import { Round, HoleScore, TroubleStats } from '../../types';
import {
  generateTroubleInsights, generateDiagnosisReport, DiagnosisReport,
} from '../../lib/claude';

const MIN_ROUNDS_FOR_DIAGNOSIS = 5;

function calcHandicap(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  const diffs = [...rounds].map(r => r.score_vs_par).sort((a, b) => a - b);
  const take  = Math.min(Math.ceil(diffs.length / 2), 8);
  const best  = diffs.slice(0, take);
  const avg   = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

export function useHistoryData() {
  const { user } = useAuth();

  const [rounds,         setRounds]         = useState<Round[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [troubleStats,   setTroubleStats]   = useState<TroubleStats | null>(null);
  const [troubleInsight, setTroubleInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const [diagnosisReport,  setDiagnosisReport]  = useState<DiagnosisReport | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [diagnosisFetched, setDiagnosisFetched] = useState(false);
  const [diagnosisError,   setDiagnosisError]   = useState('');

  const analyzeTroubles = async (recentRounds: Round[]) => {
    if (isDevMockActive()) {
      setTroubleStats(MOCK_TROUBLE_STATS);
      setTroubleInsight(MOCK_TROUBLE_INSIGHT);
      return;
    }

    if (!user || recentRounds.length < 3) return;
    const roundIds = recentRounds.map(r => r.id);
    const { data: holesData } = await supabase
      .from('hole_scores')
      .select('troubles, par')
      .in('round_id', roundIds);

    if (!holesData || holesData.length === 0) return;

    const stats: TroubleStats = {
      water: 0, ob: 0, bunker: 0, rough: 0, other: 0,
      totalRounds: recentRounds.length,
      byPar: { par3: 0, par4: 0, par5: 0 },
    };
    (holesData as any[]).forEach(hole => {
      const t: string[] = hole.troubles ?? [];
      if (t.length === 0) return;
      t.forEach(tr => {
        if (tr === 'water')       stats.water++;
        else if (tr === 'ob')     stats.ob++;
        else if (tr === 'bunker') stats.bunker++;
        else if (tr === 'rough')  stats.rough++;
        else                      stats.other++;
      });
      if (hole.par === 3)      stats.byPar.par3++;
      else if (hole.par === 4) stats.byPar.par4++;
      else if (hole.par === 5) stats.byPar.par5++;
    });

    const totalTrouble = stats.water + stats.ob + stats.bunker + stats.rough + stats.other;
    if (totalTrouble === 0) return;

    setTroubleStats(stats);
    setLoadingInsight(true);
    try {
      const insight = await generateTroubleInsights(stats);
      setTroubleInsight(insight);
    } catch { setTroubleInsight(''); }
    setLoadingInsight(false);
  };

  const fetchRounds = async () => {
    if (isDevMockActive()) {
      setRounds(MOCK_ROUNDS);
      await analyzeTroubles(MOCK_ROUNDS.slice(0, 10));
      setDiagnosisFetched(false);
      setDiagnosisReport(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!user) { setLoading(false); setRefreshing(false); return; }
    const { data } = await supabase
      .from('rounds')
      .select('*, courses(name, city, state, course_rating, slope_rating, total_par)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setRounds(data as Round[]);
      if (data.length >= 3) analyzeTroubles(data.slice(0, 10) as Round[]);
      setDiagnosisFetched(false);
      setDiagnosisReport(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const fetchDiagnosis = async () => {
    if (diagnosisFetched || loadingDiagnosis) return;
    setLoadingDiagnosis(true);
    setDiagnosisError('');

    if (isDevMockActive()) {
      await new Promise(r => setTimeout(r, 400));
      setDiagnosisReport(MOCK_DIAGNOSIS_REPORT);
      setDiagnosisFetched(true);
      setLoadingDiagnosis(false);
      return;
    }

    if (!user) { setLoadingDiagnosis(false); return; }

    const diagRounds = rounds.slice(0, 10);
    const roundIds   = diagRounds.map(r => r.id);

    const { data: holesData } = await supabase
      .from('hole_scores')
      .select('round_id, hole_number, par, strokes, putts, troubles')
      .in('round_id', roundIds);

    const allHoles = (holesData ?? []) as HoleScore[];

    try {
      const report = await generateDiagnosisReport(diagRounds, allHoles);
      setDiagnosisReport(report);
    } catch {
      setDiagnosisError('Could not generate diagnosis. Check your connection and try again.');
    }
    setDiagnosisFetched(true);
    setLoadingDiagnosis(false);
  };

  const resetDiagnosis = () => {
    setDiagnosisFetched(false);
    setDiagnosisReport(null);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRounds();
    }, [user]),
  );

  // ── Derived values ─────────────────────────────────────────
  const avgScore  = rounds.length > 0
    ? (rounds.reduce((s, r) => s + r.total_strokes, 0) / rounds.length).toFixed(1) : null;
  const bestScore = rounds.length > 0 ? Math.min(...rounds.map(r => r.total_strokes)) : null;
  const handicap  = calcHandicap(rounds.slice(0, 20));
  const showTabs  = rounds.length >= MIN_ROUNDS_FOR_DIAGNOSIS;

  return {
    // state
    rounds, loading, refreshing, setRefreshing,
    troubleStats, troubleInsight, loadingInsight,
    diagnosisReport, loadingDiagnosis, diagnosisError,
    // actions
    fetchRounds, fetchDiagnosis, resetDiagnosis,
    // derived
    avgScore, bestScore, handicap, showTabs,
    MIN_ROUNDS_FOR_DIAGNOSIS,
  };
}

export type UseHistoryData = ReturnType<typeof useHistoryData>;
