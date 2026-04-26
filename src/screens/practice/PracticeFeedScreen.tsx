// ============================================================
// 练球动态 Feed — Golf Journal 设计语言
// 顶部 brand + 通知 + avatar / Streak / Today's Focus / Feed 卡 / FAB
// ============================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, SafeAreaView, Image,
  RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getUserStats } from '../../lib/streak';
import { isDevMockActive, MOCK_PRACTICE_LOGS } from '../../lib/mockUser';
import { LoadingSpinner } from '../../components';
import { UserStats } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// 文件级视觉常量
const FOCUS_BG       = '#F3F7F2';  // Today's Focus 卡背景（pale green）
const FOCUS_ICON_BG  = '#DDE8D8';  // 图标圆形背景
const FAB_BG         = '#AFC3A2';  // FAB 浅 koke 绿
const TAG_BG         = '#E5EFE0';  // 标签 pill 浅绿底
const GRASS_LIGHT    = '#DDE8D8';
const GRASS_MID      = '#C8DFC8';
const TREE_GREEN     = '#A8C8A0';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Practice Card ───────────────────────────────────────────────

function PracticeCard({
  item, currentUserId, index,
}: { item: any; currentUserId: string; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const delay = Math.min(index, 7) * 60;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 360, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const initialLiked =
    (item.reactions || []).some((r: any) => r.user_id === currentUserId && r.type === 'like');
  const initialCount =
    (item.reactions || []).filter((r: any) => r.type === 'like').length;

  const [liked, setLiked]         = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const toggleLike = async () => {
    // optimistic UI
    if (liked) {
      setLiked(false);
      setLikeCount((c: number) => c - 1);
    } else {
      setLiked(true);
      setLikeCount((c: number) => c + 1);
    }
    if (isDevMockActive()) return;

    if (liked) {
      await supabase.from('reactions').delete()
        .eq('practice_log_id', item.id)
        .eq('user_id', currentUserId)
        .eq('type', 'like');
    } else {
      await supabase.from('reactions').insert({
        practice_log_id: item.id,
        user_id: currentUserId,
        type: 'like',
      });
    }
  };

  const username = item.profiles?.username ?? 'Golfer';
  const initial = (username[0] ?? 'U').toUpperCase();

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY: slideY }] }]}
      accessible
      accessibilityLabel={
        `${username}, ${timeAgo(item.created_at)}` +
        (item.location ? ` at ${item.location}` : '') +
        (item.note ? `. ${item.note}` : '')
      }
    >
      {/* Top row: avatar + name + time + location */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.username} numberOfLines={1}>{username}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
        </View>
        {item.location ? (
          <View style={styles.locationBadge} accessible={false}>
            <Ionicons name="location-outline" size={12} color={colors.text.hint} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
        ) : null}
      </View>

      {/* Note */}
      {item.note ? (
        <Text style={styles.note}>{item.note}</Text>
      ) : null}

      {/* Photo */}
      {item.photo_url ? (
        <Image
          source={{ uri: item.photo_url }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel="Practice session photo"
        />
      ) : null}

      {/* Footer: tags + heart */}
      <View style={styles.cardFooter}>
        <View style={styles.tagsRow}>
          {(item.practice_tags ?? []).map((tag: string) => (
            <View key={tag} style={styles.tag} accessible={false}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={toggleLike}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          accessibilityState={{ checked: liked }}
          hitSlop={6}
          style={({ pressed }) => [styles.likeBtn, pressed && styles.pressed]}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? colors.aka : colors.text.hint}
          />
          {likeCount > 0 ? (
            <Text style={[styles.likeCount, liked && { color: colors.aka }]}>
              {likeCount}
            </Text>
          ) : null}
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Screen ──────────────────────────────────────────────────────

export default function PracticeFeedScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const fabScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1, delay: 400, useNativeDriver: true, bounciness: 10,
    }).start();
  }, []);

  useFocusEffect(useCallback(() => {
    fetchFeed();
    if (user) fetchUserStats();
  }, [user]));

  const fetchFeed = async () => {
    if (isDevMockActive()) {
      setLogs(MOCK_PRACTICE_LOGS);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!user) { setLoading(false); return; }

    const { data: logsData, error } = await supabase
      .from('practice_logs')
      .select('*, reactions(id, user_id, type, content)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('[PracticeFeed] query error:', error.message, error.details);
      setLoading(false); setRefreshing(false); return;
    }
    if (!logsData || logsData.length === 0) {
      setLogs([]); setLoading(false); setRefreshing(false); return;
    }

    const userIds = [...new Set(logsData.map((l: any) => l.user_id as string))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profilesData ?? []).forEach((p: any) => { profileMap[p.id] = p; });

    setLogs(logsData.map((log: any) => ({ ...log, profiles: profileMap[log.user_id] ?? null })));
    setLoading(false);
    setRefreshing(false);
  };

  const fetchUserStats = async () => {
    if (!user) return;
    const stats = await getUserStats(user.id);
    if (stats) setUserStats(stats);
  };

  const totalCount = logs.length;
  const username = (user as any)?.user_metadata?.username ?? 'A';
  const userInitial = (username[0] ?? 'A').toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="golf-outline" size={20} color={colors.koke} accessible={false} />
          <Text style={styles.headerTitle} accessibilityRole="header">Practice Feed</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
            style={({ pressed }) => [styles.avatarHeader, pressed && styles.pressed]}
          >
            <Text style={styles.avatarHeaderText}>{userInitial}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <PracticeCard item={item} currentUserId={user?.id ?? 'guest'} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <FeedHeader
            streak={userStats?.current_streak ?? 0}
            totalCount={totalCount}
          />
        }
        ListEmptyComponent={
          loading ? (
            <LoadingSpinner style={styles.loaderWrap} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle} accessibilityRole="header">No practice logs yet</Text>
              <Text style={styles.emptySub}>Tap the + button to log your first practice session.</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFeed(); }}
            tintColor={colors.koke}
          />
        }
      />

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPress={() => navigation.navigate('PracticeCheckIn')}
          accessibilityRole="button"
          accessibilityLabel="Log a practice session"
          style={({ pressed }) => [
            styles.fabInner,
            pressed && styles.fabPressed,
          ]}
        >
          <Ionicons name="add" size={28} color={colors.shiro} accessible={false} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Header above feed (Streak + Today's Focus) ──────────────────

function FeedHeader({ streak, totalCount }: { streak: number; totalCount: number }) {
  return (
    <>
      {/* Streak strip */}
      {streak > 0 ? (
        <View
          style={styles.streakStrip}
          accessibilityLabel={`${streak} day practice streak, ${totalCount} total`}
        >
          <Text style={styles.streakFire} accessible={false}>🔥</Text>
          <Text style={styles.streakText}>
            {streak}-day practice streak!
          </Text>
          <Text style={styles.streakTotal}>{totalCount} total</Text>
        </View>
      ) : null}

      {/* Today's Focus */}
      <View style={styles.focusCard}>
        <View style={styles.focusIconWrap} accessible={false}>
          <Ionicons name="sparkles-outline" size={18} color={colors.koke} />
        </View>
        <View style={styles.focusContent}>
          <Text style={styles.focusLabel}>Today's Focus</Text>
          <Text style={styles.focusTitle} accessibilityRole="header">
            Putting consistency within 10ft
          </Text>
        </View>
        <View style={styles.focusIllustration} pointerEvents="none" accessible={false}>
          <FocusIllustration />
        </View>
      </View>
    </>
  );
}

// ── Mini watercolor course illustration for Today's Focus ───────

function FocusIllustration() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMaxYMax slice">
      {/* Distant ridge */}
      <Path
        d="M 0 30 Q 40 15, 80 25 Q 120 12, 160 22 Q 185 18, 200 28 L 200 50 L 0 50 Z"
        fill={GRASS_LIGHT}
        opacity={0.65}
      />
      {/* Mid hill */}
      <Path
        d="M 0 45 Q 60 35, 120 42 Q 170 38, 200 45 L 200 70 L 0 70 Z"
        fill={GRASS_MID}
        opacity={0.8}
      />
      {/* Foreground */}
      <Path
        d="M 0 65 Q 80 55, 160 62 Q 190 60, 200 65 L 200 100 L 0 100 Z"
        fill={GRASS_MID}
      />
      {/* Trees */}
      <Circle cx={28}  cy={48} r={6} fill={TREE_GREEN} opacity={0.7} />
      <Circle cx={172} cy={45} r={7} fill={TREE_GREEN} opacity={0.7} />
      <Circle cx={185} cy={50} r={5} fill={TREE_GREEN} opacity={0.6} />
      {/* Putting green */}
      <Ellipse cx={120} cy={82} rx={45} ry={9} fill={GRASS_MID} opacity={0.6} />
      {/* Flag pole */}
      <Line x1={120} y1={82} x2={120} y2={56} stroke={colors.text.secondary} strokeWidth={1} opacity={0.6} />
      {/* Flag */}
      <Path d="M 120 56 L 134 60 L 120 64 Z" fill={colors.aka} opacity={0.75} />
    </Svg>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  pressed: { opacity: 0.6 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeader: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.koke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeaderText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.shiro,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },

  // Streak strip
  streakStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.washi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  streakFire: { fontSize: typography.lg },
  streakText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  streakTotal: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },

  // Today's Focus
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FOCUS_BG,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    paddingLeft: spacing.base,
    paddingRight: 0,
    paddingVertical: spacing.base,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    minHeight: 96,
  },
  focusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FOCUS_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  focusContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  focusLabel: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  focusTitle: {
    fontSize: typography.base,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
  },
  focusIllustration: {
    width: 130,
    alignSelf: 'stretch',
    marginLeft: spacing.sm,
  },

  // Practice card
  card: {
    backgroundColor: colors.shiro,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.koke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.shiro,
    fontWeight: '700',
    fontSize: typography.sm,
  },
  cardMeta: { flex: 1 },
  username: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  timeAgo: {
    fontSize: typography.xs,
    color: colors.text.hint,
    marginTop: 1,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: 140,
  },
  locationText: {
    fontSize: typography.xs,
    color: colors.text.hint,
  },

  note: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    fontSize: typography.sm,
    color: colors.text.primary,
    lineHeight: typography.sm * 1.55,
  },

  photo: {
    width: '100%',
    height: 180,
    backgroundColor: colors.kokeTint,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
  },
  tagsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: TAG_BG,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.koke,
    letterSpacing: 0.2,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.xs,
  },
  likeCount: {
    fontSize: typography.sm,
    color: colors.text.hint,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Empty / loader
  loaderWrap: { marginTop: spacing.xl },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.sm * 1.5,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: FAB_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.85 },
});
