// ============================================================
// 历史成绩界面 — Rounds tab + My Diagnosis tab
// Phase A: 仅结构拆分，视觉保持原样。子组件在同目录：
//   useHistoryData / HistoryStatsBar / HistoryTabBar
//   RoundListItem / ScoreTrendCard / TroubleInsightsCard
//   DiagnosisView (+ DiagnosisSectionCard / CoachCTACard)
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Round } from '../../types';
import { RootStackParamList } from '../../navigation';
import { ScreenHeader } from '../../components';
import { colors, spacing, typography } from '../../theme';
import CoachWaitlistModal from './CoachWaitlistModal';

import { useHistoryData } from './useHistoryData';
import { HistoryStatsBar } from './HistoryStatsBar';
import { HistoryTabBar, TabType } from './HistoryTabBar';
import { RoundListItem } from './RoundListItem';
import { ScoreTrendCard } from './ScoreTrendCard';
import { TroubleInsightsCard } from './TroubleInsightsCard';
import { DiagnosisView } from './DiagnosisView';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const data = useHistoryData();
  const {
    rounds, loading, refreshing, setRefreshing,
    troubleStats, troubleInsight, loadingInsight,
    diagnosisReport, loadingDiagnosis, diagnosisError,
    fetchRounds, fetchDiagnosis, resetDiagnosis,
    avgScore, bestScore, handicap, showTabs,
  } = data;

  const [activeTab, setActiveTab] = useState<TabType>('rounds');
  const [showWaitlist, setShowWaitlist] = useState(false);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'diagnosis') fetchDiagnosis();
  };

  const retryDiagnosis = () => { resetDiagnosis(); fetchDiagnosis(); };

  const chartRounds = [...rounds].reverse().slice(-10);
  const roundsAnalyzed = Math.min(rounds.length, 10);

  const renderRound = ({ item }: { item: Round }) => (
    <RoundListItem
      round={item}
      onPress={(roundId) => navigation.navigate('Analysis', { roundId })}
    />
  );

  const RoundsListHeader = () => (
    <>
      <ScoreTrendCard rounds={chartRounds} totalRoundsCount={rounds.length} />
      {troubleStats && (
        <TroubleInsightsCard
          stats={troubleStats}
          insight={troubleInsight}
          loadingInsight={loadingInsight}
        />
      )}
      {rounds.length > 0 && (
        <Text style={styles.sectionTitle}>All Rounds</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Round History" />

      {rounds.length > 0 && (
        <HistoryStatsBar
          roundsCount={rounds.length}
          avgScore={avgScore}
          bestScore={bestScore}
          handicap={handicap}
        />
      )}

      {showTabs && (
        <HistoryTabBar active={activeTab} onChange={handleTabChange} />
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      ) : activeTab === 'rounds' || !showTabs ? (
        <FlatList
          data={rounds}
          keyExtractor={item => item.id}
          renderItem={renderRound}
          ListHeaderComponent={<RoundsListHeader />}
          contentContainerStyle={styles.listContent}
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
        <DiagnosisView
          report={diagnosisReport}
          loading={loadingDiagnosis}
          error={diagnosisError}
          roundsAnalyzed={roundsAnalyzed}
          onRetry={retryDiagnosis}
          onCoachCTA={() => setShowWaitlist(true)}
        />
      )}

      <CoachWaitlistModal
        visible={showWaitlist}
        onClose={() => setShowWaitlist(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.washi },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:     { fontSize: 56, marginBottom: 12 },
  emptyTitle:     { fontSize: 20, fontWeight: 'bold', color: '#333' },
  emptySub:       {
    fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 32,
  },
});
