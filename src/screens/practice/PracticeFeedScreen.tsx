// ============================================================
// 练球动态 Feed — 显示自己和好友的打卡记录
// 右下角 FAB 按钮跳转到打卡页面
// ============================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { getUserStats } from '../../lib/streak';
import { UserStats } from '../../types';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Image, RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import AnimatedPressable from '../../components/AnimatedPressable';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const TAG_COLORS: Record<string, string> = {
  '挥杆': '#1a472a', 'Full Swing': '#1a472a',
  '推杆': '#2e7d32', 'Putting': '#2e7d32',
  '切杆': '#388e3c', 'Chipping': '#388e3c',
  '沙坑': '#d4af37', 'Bunker': '#d4af37',
  '铁杆': '#1565c0', 'Iron Play': '#1565c0',
  '木杆': '#6a1b9a', 'Driver': '#6a1b9a',
};

function PracticeCard({ item, currentUserId, index }: { item: any; currentUserId: string; index: number }) {
  // 错落淡入动画（前 8 张卡片依次出现）
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const delay = Math.min(index, 7) * 70;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const [liked, setLiked] = useState(
    (item.reactions || []).some((r: any) => r.user_id === currentUserId && r.type === 'like')
  );
  const [likeCount, setLikeCount] = useState(
    (item.reactions || []).filter((r: any) => r.type === 'like').length
  );

  const toggleLike = async () => {
    if (liked) {
      await supabase.from('reactions').delete()
        .eq('practice_log_id', item.id)
        .eq('user_id', currentUserId)
        .eq('type', 'like');
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      await supabase.from('reactions').insert({
        practice_log_id: item.id,
        user_id: currentUserId,
        type: 'like',
      });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY: slideY }] }]}>
      {/* 用户信息栏 */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.profiles?.username ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.username}>{item.profiles?.username ?? 'Golfer'}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
        </View>
        {item.location && (
          <View style={styles.locationBadge}>
            <Ionicons name="location-outline" size={11} color="#888" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        )}
      </View>

      {/* 图片 */}
      {item.photo_url ? (
        <Image
          source={{ uri: item.photo_url }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => {/* silently ignore broken image */}}
        />
      ) : null}

      {/* 标签 */}
      {item.practice_tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {item.practice_tags.map((tag: string) => (
            <View key={tag} style={[styles.tag, { backgroundColor: TAG_COLORS[tag] ?? '#555' }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 统计数据 */}
      <View style={styles.statsRow}>
        {item.duration_minutes && (
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={13} color="#888" />
            <Text style={styles.statText}>{item.duration_minutes} min</Text>
          </View>
        )}
        {item.ball_count && (
          <View style={styles.stat}>
            <Ionicons name="golf-outline" size={13} color="#888" />
            <Text style={styles.statText}>{item.ball_count} balls</Text>
          </View>
        )}
        {item.note && (
          <Text style={styles.note} numberOfLines={2}>{item.note}</Text>
        )}
      </View>

      {/* 点赞 */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.likeBtn} onPress={toggleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#f44336' : '#888'}
          />
          {likeCount > 0 && <Text style={[styles.likeCount, liked && { color: '#f44336' }]}>{likeCount}</Text>}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function PracticeFeedScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // FAB 弹入动画
  const fabScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabScale, { toValue: 1, delay: 400, useNativeDriver: true, bounciness: 12 }).start();
  }, []);

  // 依赖 user：user 变化时（登录后）重新触发；Tab 切换时也会重新拉取
  useFocusEffect(useCallback(() => {
    fetchFeed();
    if (user) fetchUserStats();
  }, [user]));

  const fetchFeed = async () => {
    // user 为 null 时（auth 还在加载）直接结束 loading，不卡转圈
    if (!user) { setLoading(false); return; }

    // Step 1: 拉取 practice_logs + reactions（不做 profiles 联查，避免 FK 缺失报错）
    const { data: logsData, error } = await supabase
      .from('practice_logs')
      .select('*, reactions(id, user_id, type, content)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('[PracticeFeed] query error:', error.message, error.details);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!logsData || logsData.length === 0) {
      setLogs([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Step 2: 根据 user_id 批量拉取 profiles
    const userIds = [...new Set(logsData.map((l: any) => l.user_id as string))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profilesData ?? []).forEach((p: any) => { profileMap[p.id] = p; });

    // Step 3: 合并 profiles 数据到每条 log
    const merged = logsData.map((log: any) => ({
      ...log,
      profiles: profileMap[log.user_id] ?? null,
    }));

    setLogs(merged);
    setLoading(false);
    setRefreshing(false);
  };

  const fetchUserStats = async () => {
    if (!user) return;
    const stats = await getUserStats(user.id);
    if (stats) setUserStats(stats);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Practice Feed</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
          <Ionicons name="trophy-outline" size={22} color="#d4af37" />
        </TouchableOpacity>
      </View>

      {/* Streak 横幅 */}
      {userStats && userStats.current_streak > 0 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakBannerFire}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakBannerText}>
              {userStats.current_streak}-day practice streak!
            </Text>
            {userStats.badges.length > 0 && (
              <Text style={styles.streakBannerBadges}>
                Badges: {userStats.badges.map(b => b.emoji).join(' ')}
              </Text>
            )}
          </View>
          <Text style={styles.streakBannerTotal}>{userStats.total_practices} total</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <PracticeCard item={item} currentUserId={user!.id} index={index} />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchFeed(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏌️</Text>
              <Text style={styles.emptyTitle}>No practice logs yet</Text>
              <Text style={styles.emptySub}>Tap the + button to log your first practice session!</Text>
            </View>
          }
        />
      )}

      {/* FAB — 打卡按钮（弹入 + 按压缩放） */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <AnimatedPressable
          onPress={() => navigation.navigate('PracticeCheckIn')}
          scaleTo={0.9}
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 30 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </AnimatedPressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1a472a', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1a472a', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardMeta: { flex: 1 },
  username: { fontWeight: '700', fontSize: 14, color: '#1a472a' },
  timeAgo: { fontSize: 12, color: '#aaa', marginTop: 1 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationText: { fontSize: 11, color: '#888' },
  photo: { width: '100%', height: 220, backgroundColor: '#eee' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10 },
  tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#888' },
  note: { flex: 1, fontSize: 13, color: '#555', fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8,
  },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: { fontSize: 14, color: '#888', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1a472a', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e6',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ffd54f',
    gap: 10,
  },
  streakBannerFire: { fontSize: 24 },
  streakBannerText: { fontSize: 14, fontWeight: '700', color: '#e65100' },
  streakBannerBadges: { fontSize: 12, color: '#888', marginTop: 2 },
  streakBannerTotal: { fontSize: 13, fontWeight: '600', color: '#1a472a' },
});
