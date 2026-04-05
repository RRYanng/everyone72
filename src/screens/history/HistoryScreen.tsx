// ============================================================
// 历史成绩界面 — 列出所有已打完的轮次 + 成绩趋势图 + 差点
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
import { Round } from '../../types';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_W = Dimensions.get('window').width;

// 差点估算：取最近 20 轮中最好的一半成绩（最多 8 轮）的平均 score_vs_par
function calcHandicap(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  const diffs = [...rounds].map(r => r.score_vs_par).sort((a, b) => a - b);
  const take = Math.min(Math.ceil(diffs.length / 2), 8);
  const best = diffs.slice(0, take);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRounds();
    }, [user])
  );

  const fetchRounds = async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    const { data } = await supabase
      .from('rounds')
      .select('*, courses(name, city, state)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setRounds(data as Round[]);
    setLoading(false);
    setRefreshing(false);
  };

  const scoreColor = (vs_par: number) => {
    if (vs_par <= 0) return '#d4af37';
    if (vs_par <= 5) return '#4caf50';
    if (vs_par <= 10) return '#ff9800';
    return '#f44336';
  };

  const avgScore = rounds.length > 0
    ? (rounds.reduce((s, r) => s + r.total_strokes, 0) / rounds.length).toFixed(1)
    : null;
  const bestScore = rounds.length > 0
    ? Math.min(...rounds.map(r => r.total_strokes))
    : null;
  const handicap = calcHandicap(rounds.slice(0, 20));

  // 折线图数据（时间正序，最多显示最近 10 轮）
  const chartRounds = [...rounds].reverse().slice(-10);
  const showChart = chartRounds.length >= 2;
  const chartData = {
    labels: chartRounds.map((_, i) =>
      i === 0 || i === chartRounds.length - 1 || chartRounds.length <= 5
        ? `R${rounds.length - chartRounds.length + i + 1}`
        : ''
    ),
    datasets: [{
      data: chartRounds.map(r => r.total_strokes),
      color: () => '#d4af37',
      strokeWidth: 2,
    }],
  };

  const renderItem = ({ item }: { item: Round }) => (
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
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          })}
          {'  ·  '}{item.total_holes} holes
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

  const ListHeader = () => (
    <>
      {/* 折线图 */}
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
      {rounds.length > 0 && (
        <Text style={styles.sectionTitle}>All Rounds</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* 顶部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Round History</Text>
      </View>

      {/* 摘要统计 */}
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      ) : (
        <FlatList
          data={rounds}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRounds(); }} />
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1a472a',
    padding: 20,
    paddingTop: 8,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1a472a',
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#d4af37', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#a8d5b5', fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
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
  chartHint: { fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 4 },
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
  cardLeft: { flex: 1 },
  cardCourse: { fontSize: 15, fontWeight: '700', color: '#1a472a' },
  cardLocation: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 4 },
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
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 12 },
  cardScore: { fontSize: 28, fontWeight: 'bold' },
  cardPar: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  cardPutts: { fontSize: 11, color: '#aaa', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
