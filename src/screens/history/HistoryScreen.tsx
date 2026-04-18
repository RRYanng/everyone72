// ============================================================
// 历史成绩界面 — Rounds tab + My Diagnosis tab
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator,
  RefreshControl, Dimensions, ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Round, HoleScore } from '../../types';
import { TroubleStats } from '../../types';
import { RootStackParamList } from '../../navigation';
import { generateTroubleInsights, generateDiagnosisReport, DiagnosisReport } from '../../lib/claude';
import CoachWaitlistModal from './CoachWaitlistModal';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'rounds' | 'diagnosis';

const SCREEN_W = Dimensions.get('window').width;
const MIN_ROUNDS_FOR_DIAGNOSIS = 5;

function calcHandicap(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  const diffs = [...rounds].map(r => r.score_vs_par).sort((a, b) => a - b);
  const take  = Math.min(Math.ceil(diffs.length / 2), 8);
  const best  = diffs.slice(0, take);
  const avg   = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { user }   = useAuth();

  // ── Rounds tab state ───────────────────────────────────────
  const [rounds,         setRounds]         = useState<Round[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [troubleStats,   setTroubleStats]   = useState<TroubleStats | null>(null);
  const [troubleInsight, setTroubleInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);

  // ── Diagnosis tab state ────────────────────────────────────
  const [activeTab,          setActiveTab]          = useState<TabType>('rounds');
  const [diagnosisReport,    setDiagnosisReport]    = useState<DiagnosisReport | null>(null);
  const [loadingDiagnosis,   setLoadingDiagnosis]   = useState(false);
  const [diagnosisFetched,   setDiagnosisFetched]   = useState(false);
  const [diagnosisError,     setDiagnosisError]     = useState('');
  const [showWaitlist,       setShowWaitlist]       = useState(false);

  // ── Data fetching ─────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchRounds();
    }, [user])
  );

  const fetchRounds = async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    const { data } = await supabase
      .from('rounds')
      .select('*, courses(name, city, state, course_rating, slope_rating, total_par)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setRounds(data as Round[]);
      if (data.length >= 3) analyzeTroubles(data.slice(0, 10) as Round[]);
      // Reset cached diagnosis if new round added
      setDiagnosisFetched(false);
      setDiagnosisReport(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const analyzeTroubles = async (recentRounds: Round[]) => {
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

  const fetchDiagnosis = async () => {
    if (!user || diagnosisFetched || loadingDiagnosis) return;
    setLoadingDiagnosis(true);
    setDiagnosisError('');

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'diagnosis' && !diagnosisFetched) {
      fetchDiagnosis();
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const scoreColor = (vs_par: number) => {
    if (vs_par <= 0) return '#d4af37';
    if (vs_par <= 5) return '#4caf50';
    if (vs_par <= 10) return '#ff9800';
    return '#f44336';
  };

  const avgScore  = rounds.length > 0
    ? (rounds.reduce((s, r) => s + r.total_strokes, 0) / rounds.length).toFixed(1) : null;
  const bestScore = rounds.length > 0
    ? Math.min(...rounds.map(r => r.total_strokes)) : null;
  const handicap  = calcHandicap(rounds.slice(0, 20));

  const chartRounds = [...rounds].reverse().slice(-10);
  const showChart   = chartRounds.length >= 2;
  const chartData   = {
    labels: chartRounds.map((_, i) =>
      i === 0 || i === chartRounds.length - 1 || chartRounds.length <= 5
        ? `R${rounds.length - chartRounds.length + i + 1}` : ''
    ),
    datasets: [{ data: chartRounds.map(r => r.total_strokes), color: () => '#d4af37', strokeWidth: 2 }],
  };

  const showTabs = rounds.length >= MIN_ROUNDS_FOR_DIAGNOSIS;

  // ── Render helpers ─────────────────────────────────────────

  const renderRoundItem = ({ item }: { item: Round }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Analysis', { roundId: item.id })}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardCourse}>{(item as any).courses?.name ?? 'Unknown'}</Text>
        <Text style={styles.cardLocation}>
          {(item as any).courses?.city}, {(item as any).courses?.state}
        </Text>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          })}{'  ·  '}{item.total_holes} holes
        </Text>
        {item.ai_feedback && (
          <View style={styles.aiBadge}>
            <Ionicons name="analytics" size={10} color="#1a472a" />
            <Text style={styles.aiBadgeText}>AI Analysis</Text>
          </View>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.cardScore, { color: scoreColor(item.score_vs_par) }]}>
          {item.total_strokes}
        </Text>
        <Text style={[styles.cardPar, { color: scoreColor(item.score_vs_par) }]}>
          {item.score_vs_par > 0 ? '+' : ''}{item.score_vs_par}
        </Text>
        <Text style={styles.cardPutts}>{item.total_putts} putts</Text>
        <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );

  const RoundsListHeader = () => (
    <>
      {showChart && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Score Trend</Text>
          <LineChart
            data={chartData}
            width={SCREEN_W - 48}
            height={160}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(26, 71, 42, ${opacity})`,
              labelColor: () => '#888',
              style: { borderRadius: 12 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#d4af37' },
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 4 }}
            withInnerLines={false}
            withOuterLines={true}
          />
          <Text style={styles.chartHint}>Last {chartRounds.length} rounds (oldest → newest)</Text>
        </View>
      )}

      {troubleStats && (
        <View style={styles.insightCard}>
          <TouchableOpacity
            style={styles.insightHeader}
            onPress={() => setInsightExpanded(e => !e)}
          >
            <Text style={styles.insightIcon}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>Trouble Insights</Text>
              <Text style={styles.insightSub}>
                Last {troubleStats.totalRounds} rounds · tap to {insightExpanded ? 'collapse' : 'expand'}
              </Text>
            </View>
            <Text style={styles.insightChevron}>{insightExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {insightExpanded && (
            <>
              <View style={styles.insightStats}>
                {[
                  { emoji: '💧', label: 'Water',  count: troubleStats.water },
                  { emoji: '🚫', label: 'OB',     count: troubleStats.ob },
                  { emoji: '🏖️', label: 'Bunker', count: troubleStats.bunker },
                  { emoji: '🌿', label: 'Rough',  count: troubleStats.rough },
                ].filter(i => i.count > 0).map(item => (
                  <View key={item.label} style={styles.insightStatItem}>
                    <Text style={styles.insightStatEmoji}>{item.emoji}</Text>
                    <Text style={styles.insightStatCount}>{item.count}×</Text>
                    <Text style={styles.insightStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.insightParRow}>
                <Text style={styles.insightParLabel}>Par 3:</Text>
                <Text style={styles.insightParVal}>{troubleStats.byPar.par3} incidents</Text>
                <Text style={styles.insightParLabel}>Par 4:</Text>
                <Text style={styles.insightParVal}>{troubleStats.byPar.par4} incidents</Text>
                <Text style={styles.insightParLabel}>Par 5:</Text>
                <Text style={styles.insightParVal}>{troubleStats.byPar.par5} incidents</Text>
              </View>
              <View style={styles.insightAI}>
                <Text style={styles.insightAITitle}>🤖 AI Strategy Advice</Text>
                {loadingInsight ? (
                  <ActivityIndicator size="small" color="#1a472a" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.insightAIText}>{troubleInsight || 'No data yet.'}</Text>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {rounds.length > 0 && (
        <Text style={styles.sectionTitle}>All Rounds</Text>
      )}
    </>
  );

  // ── Diagnosis section components ──────────────────────────

  const DiagnosisSectionCard = ({
    icon, color, bgColor, title, content,
  }: {
    icon: string; color: string; bgColor: string; title: string; content: string;
  }) => (
    <View style={[styles.diagSection, { borderLeftColor: color }]}>
      <View style={styles.diagSectionHeader}>
        <View style={[styles.diagSectionIconBg, { backgroundColor: bgColor }]}>
          <Text style={styles.diagSectionIcon}>{icon}</Text>
        </View>
        <Text style={[styles.diagSectionTitle, { color }]}>{title}</Text>
      </View>
      <Text style={styles.diagSectionContent}>{content}</Text>
    </View>
  );

  const DiagnosisContent = () => {
    if (loadingDiagnosis) {
      return (
        <View style={styles.diagLoading}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.diagLoadingTitle}>Analyzing your game...</Text>
          <Text style={styles.diagLoadingSub}>
            Claude is reviewing your last {Math.min(rounds.length, 10)} rounds of data
          </Text>
        </View>
      );
    }

    if (diagnosisError) {
      return (
        <View style={styles.diagError}>
          <Text style={styles.diagErrorEmoji}>⚠️</Text>
          <Text style={styles.diagErrorText}>{diagnosisError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setDiagnosisFetched(false); fetchDiagnosis(); }}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!diagnosisReport) {
      return (
        <View style={styles.diagLoading}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.diagLoadingTitle}>Preparing diagnosis...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.diagScroll}
        contentContainerStyle={styles.diagScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.diagBanner}>
          <Text style={styles.diagBannerEmoji}>🏥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.diagBannerTitle}>Your Golf Diagnosis</Text>
            <Text style={styles.diagBannerSub}>
              Based on your last {Math.min(rounds.length, 10)} rounds · AI-powered analysis
            </Text>
          </View>
        </View>

        {/* 4 sections */}
        {diagnosisReport.coreIssue ? (
          <DiagnosisSectionCard
            icon="🎯"
            color="#c62828"
            bgColor="#ffebee"
            title="Core Issue"
            content={diagnosisReport.coreIssue}
          />
        ) : null}

        {diagnosisReport.dataEvidence ? (
          <DiagnosisSectionCard
            icon="📊"
            color="#1565c0"
            bgColor="#e3f2fd"
            title="Data Evidence"
            content={diagnosisReport.dataEvidence}
          />
        ) : null}

        {diagnosisReport.rootCause ? (
          <DiagnosisSectionCard
            icon="🔬"
            color="#6a1b9a"
            bgColor="#f3e5f5"
            title="Root Cause Hypothesis"
            content={diagnosisReport.rootCause}
          />
        ) : null}

        {diagnosisReport.practicePlan ? (
          <DiagnosisSectionCard
            icon="🏋️"
            color="#1a472a"
            bgColor="#e8f5e9"
            title="Specific Practice Plan"
            content={diagnosisReport.practicePlan}
          />
        ) : null}

        {/* Coach CTA */}
        <View style={styles.coachCTA}>
          <Text style={styles.coachCTATitle}>Want a coach to help you fix this?</Text>
          <Text style={styles.coachCTASub}>
            We'll match you with a local PGA instructor who specializes in exactly your weaknesses.
          </Text>
          <TouchableOpacity
            style={styles.coachCTABtn}
            onPress={() => setShowWaitlist(true)}
          >
            <Text style={styles.coachCTABtnText}>Get matched with a local pro →</Text>
          </TouchableOpacity>
        </View>

        {/* Refresh */}
        <TouchableOpacity
          style={styles.refreshDiagBtn}
          onPress={() => { setDiagnosisFetched(false); fetchDiagnosis(); }}
        >
          <Ionicons name="refresh" size={14} color="#888" />
          <Text style={styles.refreshDiagText}>Regenerate diagnosis</Text>
        </TouchableOpacity>

        <Text style={styles.diagDisclaimer}>
          AI analysis is for practice guidance only. Not a substitute for professional coaching.
        </Text>
      </ScrollView>
    );
  };

  // ── Main render ───────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Round History</Text>
      </View>

      {/* Stats bar */}
      {rounds.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{rounds.length}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{avgScore}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{bestScore}</Text>
            <Text style={styles.statLabel}>Best Score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>
              {handicap !== null ? (handicap >= 0 ? `+${handicap}` : `${handicap}`) : '—'}
            </Text>
            <Text style={styles.statLabel}>Handicap</Text>
          </View>
        </View>
      )}

      {/* Tab switcher — only when ≥5 rounds */}
      {showTabs && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'rounds' && styles.tabBtnActive]}
            onPress={() => handleTabChange('rounds')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'rounds' && styles.tabBtnTextActive]}>
              Rounds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'diagnosis' && styles.tabBtnActive]}
            onPress={() => handleTabChange('diagnosis')}
          >
            <View style={styles.tabBtnInner}>
              <Text style={[styles.tabBtnText, activeTab === 'diagnosis' && styles.tabBtnTextActive]}>
                My Diagnosis
              </Text>
              <View style={styles.tabNewBadge}>
                <Text style={styles.tabNewBadgeText}>AI</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      ) : activeTab === 'rounds' || !showTabs ? (
        <FlatList
          data={rounds}
          keyExtractor={item => item.id}
          renderItem={renderRoundItem}
          ListHeaderComponent={<RoundsListHeader />}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRounds(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>⛳</Text>
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptySub}>
                Head to the Play tab to record your first round!
              </Text>
            </View>
          }
        />
      ) : (
        <DiagnosisContent />
      )}

      <CoachWaitlistModal
        visible={showWaitlist}
        onClose={() => setShowWaitlist(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f5f5f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a472a', padding: 20, paddingTop: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1a472a',
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { color: '#d4af37', fontSize: 20, fontWeight: 'bold' },
  statLabel:   { color: '#a8d5b5', fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  // ── Tab bar ─────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#1a472a',
  },
  tabBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
  },
  tabBtnTextActive: {
    color: '#1a472a',
  },
  tabNewBadge: {
    backgroundColor: '#d4af37',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabNewBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1a472a',
    letterSpacing: 0.5,
  },

  // ── Rounds list ──────────────────────────────────────────────
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1a472a', marginBottom: 4 },
  chartHint:  { fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 4 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft:     { flex: 1 },
  cardCourse:   { fontSize: 15, fontWeight: '700', color: '#1a472a' },
  cardLocation: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDate:     { fontSize: 12, color: '#aaa', marginTop: 4 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 3,
  },
  aiBadgeText: { fontSize: 10, color: '#1a472a', fontWeight: '600' },
  cardRight:   { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 12 },
  cardScore:   { fontSize: 28, fontWeight: 'bold' },
  cardPar:     { fontSize: 14, fontWeight: '600', marginTop: 2 },
  cardPutts:   { fontSize: 11, color: '#aaa', marginTop: 4 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:     { fontSize: 56, marginBottom: 12 },
  emptyTitle:     { fontSize: 20, fontWeight: 'bold', color: '#333' },
  emptySub:       {
    fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 32,
  },

  // Trouble Insights card
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  insightIcon:    { fontSize: 20 },
  insightTitle:   { fontSize: 15, fontWeight: '700', color: '#1a472a' },
  insightSub:     { fontSize: 12, color: '#888', marginTop: 2 },
  insightChevron: { fontSize: 12, color: '#aaa' },
  insightStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  insightStatItem:  { alignItems: 'center', gap: 2 },
  insightStatEmoji: { fontSize: 20 },
  insightStatCount: { fontSize: 16, fontWeight: 'bold', color: '#f44336' },
  insightStatLabel: { fontSize: 11, color: '#888' },
  insightParRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  insightParLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  insightParVal:   { fontSize: 12, color: '#333', marginRight: 4 },
  insightAI: {
    backgroundColor: '#f0f7f2',
    margin: 12,
    marginTop: 0,
    borderRadius: 10,
    padding: 14,
  },
  insightAITitle: { fontSize: 13, fontWeight: '700', color: '#1a472a', marginBottom: 8 },
  insightAIText:  { fontSize: 13, color: '#333', lineHeight: 20 },

  // ── Diagnosis tab ────────────────────────────────────────────
  diagScroll:        { flex: 1 },
  diagScrollContent: { padding: 16, paddingBottom: 48 },

  diagLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  diagLoadingTitle: { fontSize: 17, fontWeight: '700', color: '#1a472a', textAlign: 'center' },
  diagLoadingSub:   { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },

  diagError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  diagErrorEmoji: { fontSize: 40 },
  diagErrorText:  { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#1a472a',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  diagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a472a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  diagBannerEmoji:  { fontSize: 32 },
  diagBannerTitle:  { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  diagBannerSub:    { fontSize: 12, color: '#a8d5b5', marginTop: 2 },

  diagSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  diagSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  diagSectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagSectionIcon:    { fontSize: 18 },
  diagSectionTitle:   { fontSize: 15, fontWeight: '800' },
  diagSectionContent: { fontSize: 13.5, color: '#333', lineHeight: 22 },

  // Coach CTA
  coachCTA: {
    backgroundColor: '#1a472a',
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
    marginBottom: 12,
    gap: 8,
  },
  coachCTATitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  coachCTASub:   { fontSize: 13, color: '#a8d5b5', lineHeight: 19 },
  coachCTABtn: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  coachCTABtnText: { fontSize: 15, fontWeight: 'bold', color: '#1a472a' },

  refreshDiagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  refreshDiagText: { fontSize: 12, color: '#888' },
  diagDisclaimer:  {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 17,
    marginBottom: 8,
  },
});
