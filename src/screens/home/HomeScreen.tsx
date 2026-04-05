// ============================================================
// 首页 — 显示欢迎信息 + 最近成绩摘要 + 快速开始按钮
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCountUp } from '../../hooks/useCountUp';
import AnimatedPressable from '../../components/AnimatedPressable';
import { Round } from '../../types';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, signOut } = useAuth();
  const [recentRounds, setRecentRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRecentRounds();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user!.id)
      .maybeSingle();               // 用 maybeSingle 避免没有 profile 时返回 406
    if (data) setUsername(data.username);
  };

  const fetchRecentRounds = async () => {
    const { data } = await supabase
      .from('rounds')
      .select('*, courses(name, city, state)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRecentRounds(data as Round[]);
    setLoading(false);
  };

  // 计算平均成绩（显示最近 3 轮）
  const displayRounds = recentRounds.slice(0, 3);
  const avgScore = displayRounds.length > 0
    ? Math.round(displayRounds.reduce((s, r) => s + r.total_strokes, 0) / displayRounds.length)
    : null;

  // 数字滚动动画
  const animRounds   = useCountUp(!loading ? recentRounds.length : null, 600);
  const animAvgScore = useCountUp(!loading && avgScore !== null ? avgScore : null, 700);
  const animAvgPutts = useCountUp(!loading && displayRounds.length > 0
    ? Math.round(displayRounds.reduce((s, r) => s + r.total_putts, 0) / displayRounds.length)
    : null, 650);

  // 差点估算：最近 20 轮中最好的一半（最多 8 轮）的平均 score_vs_par
  const handicap = (() => {
    if (recentRounds.length === 0) return null;
    const diffs = [...recentRounds].map(r => r.score_vs_par).sort((a, b) => a - b);
    const take = Math.min(Math.ceil(diffs.length / 2), 8);
    const best = diffs.slice(0, take);
    const avg = best.reduce((s, d) => s + d, 0) / best.length;
    return Math.round(avg * 10) / 10;
  })();

  // 成绩颜色（低于 Par 金色，高于差 Par 绿色）
  const scoreColor = (vs_par: number) => {
    if (vs_par <= 0) return '#d4af37';
    if (vs_par <= 5) return '#4caf50';
    if (vs_par <= 10) return '#ff9800';
    return '#f44336';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good round, {username || 'Golfer'} 👋</Text>
            <Text style={styles.date}>{new Date().toDateString()}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 统计卡片（数字滚动动画） */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{animRounds ?? '—'}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{animAvgScore ?? '—'}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{animAvgPutts ?? '—'}</Text>
            <Text style={styles.statLabel}>Avg Putts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>
              {handicap !== null ? (handicap >= 0 ? `+${handicap}` : `${handicap}`) : '—'}
            </Text>
            <Text style={styles.statLabel}>Handicap</Text>
          </View>
        </View>

        {/* 开始新一轮按钮（带缩放动画） */}
        <AnimatedPressable
          style={styles.playBtn}
          onPress={() => navigation.navigate('CourseSearch')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Ionicons name="golf" size={24} color="#1a472a" />
            <Text style={styles.playBtnText}>Start New Round</Text>
          </View>
        </AnimatedPressable>

        {/* 最近成绩 */}
        <Text style={styles.sectionTitle}>Recent Rounds</Text>

        {loading ? (
          <ActivityIndicator color="#1a472a" style={{ marginTop: 20 }} />
        ) : displayRounds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No rounds yet.</Text>
            <Text style={styles.emptySubtext}>Tap "Start New Round" to record your first game!</Text>
          </View>
        ) : (
          displayRounds.map(round => (
            <View key={round.id} style={styles.roundCard}>
              <View style={styles.roundLeft}>
                <Text style={styles.roundCourse}>
                  {(round as any).courses?.name ?? 'Unknown Course'}
                </Text>
                <Text style={styles.roundDate}>
                  {(round as any).courses?.city}, {(round as any).courses?.state}
                  {'  •  '}
                  {new Date(round.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.roundRight}>
                <Text style={[styles.roundScore, { color: scoreColor(round.score_vs_par) }]}>
                  {round.total_strokes}
                </Text>
                <Text style={styles.roundPar}>
                  {round.score_vs_par > 0 ? '+' : ''}{round.score_vs_par}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a472a' },
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: '#1a472a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
  },
  greeting: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  date: { color: '#a8d5b5', fontSize: 12, marginTop: 2 },
  signOutBtn: { padding: 8 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1a472a',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statNum: { color: '#d4af37', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#a8d5b5', fontSize: 12, marginTop: 2 },
  playBtn: {
    flexDirection: 'row',
    backgroundColor: '#d4af37',
    margin: 16,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  playBtnText: { color: '#1a472a', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a472a',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: '#555', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center' },
  roundCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roundLeft: { flex: 1 },
  roundCourse: { fontSize: 15, fontWeight: '700', color: '#1a472a' },
  roundDate: { fontSize: 12, color: '#888', marginTop: 3 },
  roundRight: { alignItems: 'flex-end', marginLeft: 12 },
  roundScore: { fontSize: 28, fontWeight: 'bold' },
  roundPar: { fontSize: 13, color: '#888', marginTop: 2 },
});
