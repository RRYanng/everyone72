// ============================================================
// 首页 — Golf Journal 风格（编辑式 + 水彩插画）
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path, Circle, Ellipse, Line, Rect, Defs, LinearGradient, Stop,
} from 'react-native-svg';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCountUp } from '../../hooks/useCountUp';
import { LoadingSpinner } from '../../components';
import { Round, PracticePlan, UserStats } from '../../types';
import { getUserStats } from '../../lib/streak';
import { stripMarkdown } from '../../lib/stripMarkdown';
import {
  isDevMockActive,
  MOCK_PROFILE, MOCK_ROUNDS, MOCK_ACTIVE_PLAN, MOCK_USER_STATS,
} from '../../lib/mockUser';
import { RootStackParamList } from '../../navigation';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';
import { findAnyDraft, ScorecardDraft } from '../../hooks/useScorecardDraft';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ── File-level visual constants ────────────────────────────
const ICON_BG     = '#F0EDE8';  // 卡片内 stat 图标圆形 bg（比 washi 略深）
const GRASS_LIGHT = '#D8E8D0';  // 远景草地（最浅）
const GRASS_MID   = '#C8DFC8';  // 中景草地
const SAND        = '#E8DFC8';  // 沙坑
const TREE_GREEN  = '#A8C8A0';  // 树木 / 叶子（与 colors.kokeLight 同）

// 每条 round 的缩略图 URL（按 course_id 映射）
const ROUND_THUMBS: Record<string, string> = {
  'pebble-beach':       'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=80&q=60',
  'torrey-pines-south': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=80&q=60',
  'bethpage-black':     'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=80&q=60',
};
const FALLBACK_THUMB = ROUND_THUMBS['pebble-beach'];

// 把 markdown plan 拆成 3 个独立 bullet 行，每行单独渲染。
function splitPlanIntoLines(text: string): string[] {
  return text
    .split('\n')
    .filter(line => !line.match(/^\s*#{1,6}\s+/))           // 去掉 heading
    .map(line => line
      .replace(/^\s*[-*+]\s+/, '')                          // 去掉列表标记
      .replace(/\*\*([^*]+)\*\*/g, '$1')                    // 去掉粗体
      .replace(/^\s*\*([^*\n]+)\*\s*$/, '$1')               // 去掉整行斜体
      .trim())
    .filter(line => line.length > 0)
    .slice(0, 3);
}

// ── Component ──────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [recentRounds, setRecentRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [username, setUsername] = useState('');
  const [activePlan, setActivePlan] = useState<PracticePlan | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [draftInfo, setDraftInfo] = useState<ScorecardDraft | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRecentRounds();
      fetchActivePlan();
      fetchUserStats();
    }
    // Check for unfinished draft
    findAnyDraft().then(d => setDraftInfo(d));
  }, [user]);

  const fetchProfile = async () => {
    if (isDevMockActive()) {
      setUsername(MOCK_PROFILE.username);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user!.id)
      .maybeSingle();
    if (data) setUsername(data.username ?? '');
  };

  const fetchRecentRounds = async () => {
    if (isDevMockActive()) {
      setRecentRounds(MOCK_ROUNDS);
      setLoading(false);
      return;
    }
    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, city, state)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (data) setRecentRounds(data as Round[]);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('fetch') || msg.includes('Failed') || msg.includes('network')) {
        setFetchError('Unable to connect. Your Supabase project may be paused.');
      } else {
        setFetchError(msg || 'Failed to load data.');
      }
    }
    setLoading(false);
  };

  const fetchActivePlan = async () => {
    if (!user) return;
    if (isDevMockActive()) {
      setActivePlan(MOCK_ACTIVE_PLAN);
      return;
    }
    const { data } = await supabase
      .from('practice_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setActivePlan(data as PracticePlan);
  };

  const fetchUserStats = async () => {
    if (!user) return;
    if (isDevMockActive()) {
      setUserStats(MOCK_USER_STATS);
      return;
    }
    const stats = await getUserStats(user.id);
    if (stats) setUserStats(stats);
  };

  const displayRounds = recentRounds.slice(0, 3);
  const avgScore = displayRounds.length > 0
    ? Math.round(displayRounds.reduce((s, r) => s + r.total_strokes, 0) / displayRounds.length)
    : null;

  const animRounds   = useCountUp(!loading ? recentRounds.length : null, 600);
  const animAvgScore = useCountUp(!loading && avgScore !== null ? avgScore : null, 700);
  const animAvgPutts = useCountUp(
    !loading && displayRounds.length > 0
      ? Math.round(displayRounds.reduce((s, r) => s + r.total_putts, 0) / displayRounds.length)
      : null,
    650,
  );

  const handicap = (() => {
    if (recentRounds.length === 0) return null;
    const diffs = [...recentRounds].map(r => r.score_vs_par).sort((a, b) => a - b);
    const take = Math.min(Math.ceil(diffs.length / 2), 8);
    const best = diffs.slice(0, take);
    const avg = best.reduce((s, d) => s + d, 0) / best.length;
    return Math.round(avg * 10) / 10;
  })();

  const handicapStr =
    handicap === null ? '—'
    : handicap > 0    ? `+${handicap}`
    : `${handicap}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap} accessible={false}>
              <Ionicons name="golf-outline" size={20} color={colors.koke} />
            </View>
            <View>
              <Text style={styles.brandName} accessibilityRole="header">Golf Journal</Text>
              <Text style={styles.brandTagline}>Play. Track. Improve.</Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            hitSlop={8}
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
          >
            <View style={styles.settingsRing}>
              <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
            </View>
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting} accessibilityRole="header">
            {username || 'Hello'} 👋
          </Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>

        {/* Stats card */}
        <View
          style={styles.statsCard}
          accessibilityLabel={
            `${animRounds ?? '—'} rounds, average ${animAvgScore ?? '—'}, ` +
            `average putts ${animAvgPutts ?? '—'}, handicap ${handicapStr}`
          }
        >
          <StatCol label="Rounds"    value={animRounds   ?? '—'} icon="flag-outline" />
          <StatVDivider />
          <StatCol label="Avg Score" value={animAvgScore ?? '—'} icon="bar-chart-outline" />
          <StatVDivider />
          <StatCol label="Avg Putts" value={animAvgPutts ?? '—'} icon="golf-outline" />
          <StatVDivider />
          <StatCol label="Handicap"  value={handicapStr}        icon="person-outline" />
        </View>

        {/* Streak */}
        {userStats && userStats.current_streak > 0 ? (
          <View
            style={styles.streakCard}
            accessibilityLabel={`${userStats.current_streak} day practice streak`}
          >
            <Text style={styles.streakEmoji} accessible={false}>🔥</Text>
            <Text style={styles.streakText}>
              {userStats.current_streak}-day practice streak
            </Text>
            {userStats.badges.length > 0 ? (
              <View style={styles.streakBadges} accessible={false}>
                {userStats.badges.slice(-3).map(b => (
                  <Text key={b.id} style={styles.streakBadge}>{b.emoji}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Draft Recovery Banner */}
        {draftInfo && (
          <Pressable
            onPress={() => {
              setDraftInfo(null);
              navigation.navigate('Scorecard', {
                courseId: draftInfo.courseId,
                totalHoles: draftInfo.totalHoles as 9 | 18,
                teeBox: draftInfo.teeBox,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Resume unfinished round"
            style={({ pressed }) => [styles.draftBanner, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.kincha} />
            <View style={styles.draftBannerContent}>
              <Text style={styles.draftBannerTitle}>Unfinished Round</Text>
              <Text style={styles.draftBannerSub}>Tap to continue where you left off</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.hint} />
          </Pressable>
        )}

        {/* Connection Error Banner */}
        {fetchError ? (
          <Pressable
            onPress={() => { setFetchError(''); fetchRecentRounds(); }}
            style={({ pressed }) => [styles.errorBanner, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="cloud-offline-outline" size={20} color={colors.aka} />
            <View style={styles.draftBannerContent}>
              <Text style={styles.errorBannerTitle}>{fetchError}</Text>
              <Text style={styles.draftBannerSub}>Tap to retry</Text>
            </View>
            <Ionicons name="refresh-outline" size={18} color={colors.text.hint} />
          </Pressable>
        ) : null}

        {/* Start New Round button */}
        <Pressable
          onPress={() => navigation.navigate('CourseSearch')}
          accessibilityRole="button"
          accessibilityLabel="Start New Round"
          accessibilityHint="Select a golf course and record your scores"
          style={({ pressed }) => [styles.startBtn, pressed && styles.pressedStart]}
        >
          <Ionicons name="golf-outline" size={20} color={colors.shiro} accessible={false} />
          <Text style={styles.startBtnText}>Start New Round</Text>
        </Pressable>

        {/* Practice Plan with watercolor illustration */}
        {activePlan ? (
          <View style={styles.planCard}>
            <View style={styles.planPlantWrap} pointerEvents="none" accessible={false}>
              <PlantWatercolor />
            </View>
            <View style={styles.planCourseWrap} pointerEvents="none" accessible={false}>
              <CourseWatercolor />
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <CourseLeftFade />
              </View>
            </View>
            <View style={styles.planContent}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle} accessibilityRole="header">
                  This Week's Practice Plan
                </Text>
                <View style={styles.aiBadge} accessible={false}>
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              </View>
              {splitPlanIntoLines(activePlan.plan_text).map((line, i) => (
                <Text
                  key={i}
                  style={[styles.planLine, i > 0 && styles.planLineGap]}
                  numberOfLines={2}
                >
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recent Rounds */}
        <Text style={styles.sectionTitle} accessibilityRole="header">Recent Rounds</Text>

        {loading ? (
          <LoadingSpinner style={styles.loaderWrap} />
        ) : displayRounds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No rounds yet.</Text>
            <Text style={styles.emptySub}>Tap Start New Round to record your first game.</Text>
          </View>
        ) : (
          <View style={styles.roundsList}>
            {displayRounds.map((round, i) => (
              <RoundRow
                key={round.id}
                round={round}
                isLast={i === displayRounds.length - 1}
                onPress={() => navigation.navigate('Analysis', { roundId: round.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Subcomponents ──────────────────────────────────────────

function StatCol({
  label, value, icon,
}: { label: string; value: string | number; icon: IconName }) {
  return (
    <View style={styles.statCol}>
      <View style={styles.statText}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <View style={styles.statIcon} accessible={false}>
        <Ionicons name={icon} size={16} color={colors.koke} />
      </View>
    </View>
  );
}

function StatVDivider() {
  return <View style={styles.statVDivider} accessible={false} />;
}

function RoundRow({
  round, isLast, onPress,
}: { round: Round; isLast: boolean; onPress: () => void }) {
  const course = (round as any).courses;
  const courseName = course?.name ?? 'Unknown Course';
  const location = course?.city && course?.state ? `${course.city}, ${course.state}` : '';
  const dateStr = new Date(round.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });
  const vs = round.score_vs_par;
  const vsFormatted = vs > 0 ? `+${vs}` : `${vs}`;
  const scoreColor =
    vs <= 0  ? colors.kincha
    : vs <= 5  ? colors.koke
    : vs <= 10 ? colors.text.primary
    : colors.aka;
  const thumb = ROUND_THUMBS[round.course_id ?? ''] ?? FALLBACK_THUMB;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        `${courseName}, ${location}, ${dateStr}, ${round.total_strokes} strokes, ${vsFormatted} vs par`
      }
      accessibilityHint="Open round analysis"
      style={({ pressed }) => [
        styles.roundRow,
        !isLast && styles.roundDivider,
        pressed && styles.pressedRow,
      ]}
    >
      <Image
        source={{ uri: thumb }}
        style={styles.roundThumb}
        accessible={false}
      />
      <View style={styles.roundMid}>
        <Text style={styles.roundCourse} numberOfLines={1}>{courseName}</Text>
        <Text style={styles.roundMeta} numberOfLines={1}>
          {location}{location ? ' · ' : ''}{dateStr}
        </Text>
      </View>
      <View style={styles.roundRight}>
        <Text style={[styles.roundScore, { color: scoreColor }]}>{round.total_strokes}</Text>
        <Text style={[styles.roundVs, { color: scoreColor }]}>{vsFormatted}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.text.hint}
        style={styles.roundChevron}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

// ── Watercolor SVG illustrations ──────────────────────────

function PlantWatercolor() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 90 200" preserveAspectRatio="xMidYMid meet">
      {/* Stem */}
      <Path
        d="M 55 200 Q 50 140, 35 90 Q 25 50, 18 8"
        stroke={TREE_GREEN}
        strokeWidth={1.8}
        fill="none"
        opacity={0.85}
      />
      {/* Bottom leaf (left, big) */}
      <Path
        d="M 45 145 Q 0 138, 8 175 Q 35 168, 45 145 Z"
        fill={TREE_GREEN}
        opacity={0.75}
      />
      {/* Lower-mid leaf (right) */}
      <Path
        d="M 42 110 Q 80 102, 78 132 Q 55 128, 42 110 Z"
        fill={TREE_GREEN}
        opacity={0.7}
      />
      {/* Mid leaf (left) */}
      <Path
        d="M 32 70 Q -2 62, 4 95 Q 28 90, 32 70 Z"
        fill={TREE_GREEN}
        opacity={0.7}
      />
      {/* Upper-mid leaf (right) */}
      <Path
        d="M 28 38 Q 60 32, 58 60 Q 38 55, 28 38 Z"
        fill={TREE_GREEN}
        opacity={0.65}
      />
      {/* Top leaf (small, left) */}
      <Path
        d="M 22 12 Q 0 8, 4 30 Q 20 28, 22 12 Z"
        fill={TREE_GREEN}
        opacity={0.6}
      />
    </Svg>
  );
}

function CourseWatercolor() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 340 170"
      preserveAspectRatio="xMaxYMax slice"
    >
      {/* Distant ridge */}
      <Path
        d="M 0 60 Q 60 30, 130 50 Q 200 25, 270 45 Q 320 35, 340 50 L 340 95 L 0 95 Z"
        fill={GRASS_LIGHT}
        opacity={0.65}
      />
      {/* Mid hills */}
      <Path
        d="M 0 80 Q 90 60, 180 75 Q 260 65, 340 75 L 340 130 L 0 130 Z"
        fill={GRASS_MID}
        opacity={0.85}
      />
      {/* Foreground green */}
      <Path
        d="M 0 115 Q 120 95, 240 108 Q 300 105, 340 115 L 340 170 L 0 170 Z"
        fill={GRASS_MID}
      />
      {/* Trees on left horizon */}
      <Circle cx={60}  cy={82}  r={10} fill={TREE_GREEN} opacity={0.7} />
      <Circle cx={75}  cy={86}  r={7}  fill={TREE_GREEN} opacity={0.6} />
      {/* Trees on right horizon */}
      <Circle cx={270} cy={75}  r={9}  fill={TREE_GREEN} opacity={0.7} />
      <Circle cx={282} cy={80}  r={11} fill={TREE_GREEN} opacity={0.6} />
      <Circle cx={295} cy={84}  r={6}  fill={TREE_GREEN} opacity={0.55} />
      {/* Putting green (light tone) */}
      <Ellipse cx={185} cy={138} rx={70} ry={14} fill={GRASS_MID} opacity={0.7} />
      {/* Bunker */}
      <Ellipse cx={265} cy={148} rx={42} ry={9} fill={SAND} />
      {/* Flag pole */}
      <Line x1={185} y1={138} x2={185} y2={102} stroke={colors.text.secondary} strokeWidth={1} />
      {/* Flag (red triangle) */}
      <Path d="M 185 102 L 205 107 L 185 112 Z" fill={colors.aka} opacity={0.85} />
    </Svg>
  );
}

// 独立的左→右渐变层，覆盖在 CourseWatercolor 上方，将左边缘融入卡片底色。
function CourseLeftFade() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="courseFade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"    stopColor={colors.washi} stopOpacity="1" />
          <Stop offset="0.45" stopColor={colors.washi} stopOpacity="0.6" />
          <Stop offset="0.85" stopColor={colors.washi} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill="url(#courseFade)" />
    </Svg>
  );
}

// ── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  pressed: { opacity: 0.6 },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  brandTagline: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Greeting
  greetingBlock: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography['2xl'],
    fontFamily: fontFamily.serif,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: typography.sm,
    color: colors.kincha,
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },

  // ── Stats card
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shiro,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    paddingVertical: spacing.base,
    marginBottom: spacing.md,
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  statText: { alignItems: 'center' },
  statValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.usuzumi,
  },

  // ── Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shiro,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  streakEmoji: { fontSize: typography.lg },
  streakText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  streakBadges: { flexDirection: 'row', gap: spacing.xs },
  streakBadge: { fontSize: typography.base },

  // ── Start New Round
  startBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.koke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pressedStart: { opacity: 0.85 },
  startBtnText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.shiro,
    letterSpacing: 0.3,
  },


  // ── Practice Plan card
  planCard: {
    backgroundColor: colors.washi,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    minHeight: 160,
    position: 'relative',
  },
  planPlantWrap: {
    position: 'absolute',
    left: 0,
    top: '10%',
    height: '80%',
    width: 64,
  },
  planCourseWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    overflow: 'hidden',
  },
  planContent: {
    padding: spacing.base,
    paddingLeft: 64,
    paddingRight: spacing.base,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  planTitle: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  aiBadge: {
    backgroundColor: colors.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  planLine: {
    fontSize: typography.sm - 1,
    color: colors.text.secondary,
    lineHeight: (typography.sm - 1) * 1.5,
  },
  planLineGap: {
    marginTop: 4,
  },

  // ── Recent Rounds
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  loaderWrap: { marginTop: spacing.lg },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.text.primary,
    fontWeight: '500',
  },
  emptySub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
  },

  roundsList: {
    backgroundColor: colors.shiro,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    overflow: 'hidden',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pressedRow: { backgroundColor: colors.washi },
  roundDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
  },
  roundThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.kokeTint,
  },
  roundMid: { flex: 1 },
  roundCourse: {
    fontSize: typography.sm + 1,
    fontWeight: '600',
    color: colors.text.primary,
  },
  roundMeta: {
    fontSize: typography.xs + 1,
    color: colors.text.secondary,
    marginTop: 2,
  },
  roundRight: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  roundScore: {
    fontSize: typography.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  roundVs: {
    fontSize: typography.xs + 1,
    fontWeight: '500',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  roundChevron: {
    marginLeft: spacing.sm,
  },
});
