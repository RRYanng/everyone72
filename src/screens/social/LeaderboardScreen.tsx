// ============================================================
// 排行榜 — 按周 / 月统计练习次数
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type Period = 'week' | 'month' | 'alltime';

interface LeaderEntry {
  user_id: string;
  username: string;
  count: number;
  rank: number;
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('week');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const now = new Date();
    let since: string;

    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      since = weekAgo.toISOString();
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      since = monthAgo.toISOString();
    } else {
      since = '2020-01-01T00:00:00.000Z';
    }

    // Step 1: 拉取打卡记录（不联查 profiles，避免 FK 缺失报错）
    const { data } = await supabase
      .from('practice_logs')
      .select('user_id')
      .gte('created_at', since);

    if (!data) { setLoading(false); return; }

    // Step 2: 批量拉取 profiles
    const userIds = [...new Set(data.map((r: any) => r.user_id as string))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    const profileMap: Record<string, string> = {};
    (profilesData ?? []).forEach((p: any) => { profileMap[p.id] = p.username; });

    // 客户端聚合：按 user_id 统计次数
    const countMap: Record<string, { username: string; count: number }> = {};
    data.forEach((row: any) => {
      const uid = row.user_id;
      if (!countMap[uid]) {
        countMap[uid] = { username: profileMap[uid] ?? 'Golfer', count: 0 };
      }
      countMap[uid].count++;
    });

    const sorted = Object.entries(countMap)
      .map(([user_id, { username, count }]) => ({ user_id, username, count, rank: 0 }))
      .sort((a, b) => b.count - a.count)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    setEntries(sorted);
    setLoading(false);
  };

  const myRank = entries.find(e => e.user_id === user?.id);

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 周期选择 */}
      <View style={styles.periodRow}>
        {(['week', 'month', 'alltime'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 我的排名卡片 */}
      {myRank && (
        <View style={styles.myRankCard}>
          <Text style={styles.myRankLabel}>Your Rank</Text>
          <Text style={styles.myRankNum}>{rankEmoji(myRank.rank)}</Text>
          <Text style={styles.myRankSessions}>{myRank.count} sessions</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1a472a" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.user_id}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isMe = item.user_id === user?.id;
            return (
              <View style={[styles.entry, isMe && styles.entryMe]}>
                <Text style={[styles.entryRank, item.rank <= 3 && styles.entryRankTop]}>
                  {rankEmoji(item.rank)}
                </Text>
                <View style={[styles.entryAvatar, isMe && styles.entryAvatarMe]}>
                  <Text style={styles.entryAvatarText}>{item.username[0].toUpperCase()}</Text>
                </View>
                <Text style={[styles.entryName, isMe && styles.entryNameMe]}>
                  {item.username}{isMe ? ' (You)' : ''}
                </Text>
                <View style={styles.entryCountWrap}>
                  <Text style={[styles.entryCount, isMe && { color: '#d4af37' }]}>{item.count}</Text>
                  <Text style={styles.entryCountLabel}>sessions</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No practice sessions logged yet.</Text>
              <Text style={styles.emptySub}>Be the first to log a practice!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  header: {
    backgroundColor: '#1a472a', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  periodRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    margin: 12, borderRadius: 12, padding: 4, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  periodBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#1a472a' },
  periodText: { fontSize: 13, color: '#888', fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  myRankCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a472a',
    marginHorizontal: 12, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    marginBottom: 8, gap: 12,
  },
  myRankLabel: { color: '#a8d5b5', fontSize: 13, flex: 1 },
  myRankNum: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  myRankSessions: { color: '#d4af37', fontSize: 13, fontWeight: '600' },
  entry: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  entryMe: { borderWidth: 2, borderColor: '#d4af37' },
  entryRank: { fontSize: 16, fontWeight: 'bold', color: '#888', width: 36, textAlign: 'center' },
  entryRankTop: { fontSize: 22 },
  entryAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center',
  },
  entryAvatarMe: { backgroundColor: '#1a472a' },
  entryAvatarText: { fontWeight: 'bold', color: '#fff', fontSize: 15 },
  entryName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  entryNameMe: { color: '#1a472a' },
  entryCountWrap: { alignItems: 'flex-end' },
  entryCount: { fontSize: 20, fontWeight: 'bold', color: '#1a472a' },
  entryCountLabel: { fontSize: 11, color: '#aaa' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySub: { fontSize: 13, color: '#888', marginTop: 6 },
});
