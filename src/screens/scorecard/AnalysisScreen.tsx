// ============================================================
// AI 成绩分析界面 — 日式极简风格
// 显示 Claude 对本轮成绩的分析反馈
// ============================================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';

import { supabase } from '../../lib/supabase';
import { analyzeRound, generatePracticePlan } from '../../lib/claude';
import { Round, HoleScore, Course, PracticePlan } from '../../types';
import { COURSES } from '../../data/courses';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, LoadingSpinner } from '../../components';
import {
  isDevMockActive, getLastMockRound, MOCK_ANALYSIS_FEEDBACK, MOCK_ACTIVE_PLAN,
} from '../../lib/mockUser';
import { colors, spacing, typography, fontFamily, radius } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'Analysis'>;

// ── Watercolor SVG — 小型球场装饰 ──────────────────────────
const GRASS_LIGHT = '#D8E8D0';
const GRASS_MID   = '#C8DFC8';
const TREE_GREEN  = '#A8C8A0';

function MiniCourseWatercolor() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice">
      <Path
        d="M 0 30 Q 40 15, 90 25 Q 140 18, 200 28 L 200 50 L 0 50 Z"
        fill={GRASS_LIGHT} opacity={0.6}
      />
      <Path
        d="M 0 40 Q 60 30, 120 38 Q 170 34, 200 40 L 200 80 L 0 80 Z"
        fill={GRASS_MID} opacity={0.8}
      />
      <Circle cx={50} cy={38} r={5} fill={TREE_GREEN} opacity={0.6} />
      <Circle cx={155} cy={35} r={6} fill={TREE_GREEN} opacity={0.55} />
      <Line x1={100} y1={55} x2={100} y2={38} stroke={colors.text.hint} strokeWidth={0.8} />
      <Path d="M 100 38 L 112 41 L 100 44 Z" fill={colors.aka} opacity={0.75} />
    </Svg>
  );
}

// ── 成绩分布统计 ──────────────────────────────────────────────
function ScoreSummary({ scores }: { scores: HoleScore[] }) {
  const counts = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 };
  scores.forEach(s => {
    const d = s.strokes - s.par;
    if (d <= -2) counts.eagle++;
    else if (d === -1) counts.birdie++;
    else if (d === 0) counts.par++;
    else if (d === 1) counts.bogey++;
    else if (d === 2) counts.double++;
    else counts.worse++;
  });

  const items = [
    { label: 'Eagle+', count: counts.eagle, color: colors.kincha },
    { label: 'Birdie', count: counts.birdie, color: colors.koke },
    { label: 'Par', count: counts.par, color: colors.text.secondary },
    { label: 'Bogey', count: counts.bogey, color: colors.kincha },
    { label: 'Double+', count: counts.double + counts.worse, color: colors.aka },
  ];

  return (
    <View style={styles.summaryRow}>
      {items.map(item => (
        <View key={item.label} style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: item.color }]}>{item.count}</Text>
          <Text style={styles.summaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function AnalysisScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { roundId } = route.params;

  const [round, setRound] = useState<Round | null>(null);
  const [holeScores, setHoleScores] = useState<HoleScore[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [practicePlan, setPracticePlan] = useState<string>('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  // AI 文字渐显动画
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchRoundData();
  }, []);

  const fetchRoundData = async () => {
    // ── DEV mock：跳过 Supabase，使用 ScorecardScreen 写入的真实轮次数据 ──
    if (isDevMockActive()) {
      const last = getLastMockRound();
      if (last) {
        const fakeRound = {
          id: roundId,
          user_id: 'dev-mock-user-0000',
          course_id: last.courseId,
          tee_box: last.teeBox,
          total_holes: last.totalHoles,
          total_strokes: last.totalStrokes,
          total_putts: last.totalPutts,
          score_vs_par: last.scoreVsPar,
          ai_feedback: MOCK_ANALYSIS_FEEDBACK,
          created_at: last.createdAt,
        } as unknown as Round;
        const foundCourse = COURSES.find(c => c.id === last.courseId) || null;
        setRound(fakeRound);
        setHoleScores(last.holes as HoleScore[]);
        setCourse(foundCourse);
        setFeedback(MOCK_ANALYSIS_FEEDBACK);
        setPracticePlan(MOCK_ACTIVE_PLAN.plan_text);
        setPlanSaved(true);
        setLoadingData(false);
        Animated.parallel([
          Animated.timing(feedbackOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
          Animated.timing(cardSlide, { toValue: 0, duration: 350, delay: 200, useNativeDriver: true }),
        ]).start();
        return;
      }
      // 没有 last round（比如直接刷新了 Analysis 页）—— 回退到第一条 mock round
      setLoadingData(false);
      setFeedback('No round data available in DEV mode. Start a new round to see analysis.');
      return;
    }

    // 获取 round 数据
    const { data: roundData } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (!roundData) {
      setLoadingData(false);
      Alert.alert('Error', 'Round not found.');
      return;
    }

    // 获取每洞成绩
    const { data: holesData } = await supabase
      .from('hole_scores')
      .select('*')
      .eq('round_id', roundId)
      .order('hole_number');

    const foundCourse = COURSES.find(c => c.id === roundData.course_id) || null;

    setRound(roundData as Round);
    setHoleScores((holesData || []) as HoleScore[]);
    setCourse(foundCourse);
    setLoadingData(false);

    // 如果已有分析结果，直接显示（带渐显动画）
    if (roundData.ai_feedback) {
      setFeedback(roundData.ai_feedback);
      Animated.parallel([
        Animated.timing(feedbackOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 350, delay: 200, useNativeDriver: true }),
      ]).start();
    } else if (foundCourse && holesData?.length) {
      // 否则触发 AI 分析
      runAIAnalysis(roundData as Round, holesData as HoleScore[], foundCourse);
    }
  };

  const runAIAnalysis = async (r: Round, holes: HoleScore[], c: Course) => {
    setLoadingAI(true);
    try {
      const result = await analyzeRound(r, holes, c);
      setFeedback(result);
      // 文字渐显动画
      feedbackOpacity.setValue(0);
      cardSlide.setValue(16);
      Animated.parallel([
        Animated.timing(feedbackOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();

      // 保存 AI 分析结果到数据库
      await supabase
        .from('rounds')
        .update({ ai_feedback: result })
        .eq('id', r.id);

      // 生成练习计划（不阻塞主分析显示）
      generateAndSavePlan(r, holes, c, result);
    } catch (err) {
      console.error('AI analysis error:', err);
      setFeedback('Unable to generate AI analysis. Please check your API key and try again.');
    }
    setLoadingAI(false);
  };

  const generateAndSavePlan = async (r: Round, holes: HoleScore[], c: Course, feedback: string) => {
    setLoadingPlan(true);
    try {
      // 构建历史摘要（简单版）
      const historySummary = `Latest round feedback: ${feedback.slice(0, 200)}...`;
      const planText = await generatePracticePlan(r, holes, c, historySummary);
      setPracticePlan(planText);

      // 存入数据库
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 先把旧的活跃计划设为 inactive
        await supabase.from('practice_plans')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);

        // 插入新计划
        await supabase.from('practice_plans').insert({
          user_id:    user.id,
          round_id:   r.id,
          plan_text:  planText,
          week_start: new Date().toISOString().split('T')[0],
          is_active:  true,
        });
        setPlanSaved(true);
      }
    } catch (err) {
      console.warn('[PracticePlan] generation error:', err);
    }
    setLoadingPlan(false);
  };

  const scoreColor = (vs_par: number) => {
    if (vs_par <= 0) return colors.kincha;
    if (vs_par <= 5)  return colors.koke;
    if (vs_par <= 10) return colors.text.primary;
    return colors.aka;
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ScreenHeader — 与其他页面一致 */}
      <ScreenHeader
        title="Round Analysis"
        onBack={() => navigation.popToTop()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 成绩总览卡片 — 带水彩装饰 */}
        <Card style={styles.roundCard}>
          {/* 水彩背景装饰 */}
          <View style={styles.watercolorWrap} pointerEvents="none" accessible={false}>
            <MiniCourseWatercolor />
          </View>

          <Text style={styles.courseName}>{course?.name ?? 'Unknown Course'}</Text>
          <Text style={styles.courseInfo}>
            {course?.city}, {course?.state}
            {'  ·  '}
            {round ? new Date(round.created_at).toLocaleDateString() : ''}
          </Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: scoreColor(round?.score_vs_par ?? 0) }]}>
                {round?.total_strokes}
              </Text>
              <Text style={styles.scoreSmallLabel}>Total</Text>
            </View>
            <View style={styles.scoreVDivider} />
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: scoreColor(round?.score_vs_par ?? 0) }]}>
                {(round?.score_vs_par ?? 0) > 0 ? '+' : ''}{round?.score_vs_par}
              </Text>
              <Text style={styles.scoreSmallLabel}>vs Par</Text>
            </View>
            <View style={styles.scoreVDivider} />
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreBig}>{round?.total_putts}</Text>
              <Text style={styles.scoreSmallLabel}>Putts</Text>
            </View>
          </View>

          {/* 成绩分布 */}
          {holeScores.length > 0 && <ScoreSummary scores={holeScores} />}
        </Card>

        {/* AI 分析区域 */}
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Ionicons name="analytics-outline" size={18} color={colors.koke} />
            <Text style={styles.aiTitle}>AI Coach Feedback</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>Claude</Text>
            </View>
          </View>

          {loadingAI ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator color={colors.koke} />
              <Text style={styles.aiLoadingText}>Analyzing your round...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: feedbackOpacity, transform: [{ translateY: cardSlide }] }}>
              <Text style={styles.aiFeedback}>{feedback || 'No analysis available.'}</Text>
            </Animated.View>
          )}
        </Card>

        {/* 练习计划卡片 */}
        {(loadingPlan || practicePlan) && (
          <Card style={styles.planCard}>
            <View style={styles.planHeader}>
              <Ionicons name="calendar-outline" size={18} color={colors.kincha} />
              <Text style={styles.planTitle}>Your Practice Plan</Text>
              {planSaved && (
                <View style={styles.savedBadge}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.koke} />
                  <Text style={styles.savedText}>Saved</Text>
                </View>
              )}
            </View>
            {loadingPlan && !practicePlan ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={colors.kincha} />
                <Text style={styles.aiLoadingText}>Building your weekly plan...</Text>
              </View>
            ) : (
              <Text style={styles.planText}>{practicePlan}</Text>
            )}
          </Card>
        )}

        {/* 每洞详细成绩 */}
        <Text style={styles.sectionTitle} accessibilityRole="header">Hole by Hole</Text>

        <Card style={styles.holesCard}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.headerCell, { flex: 0.7 }]}>Par</Text>
            <Text style={[styles.headerCell]}>Score</Text>
            <Text style={[styles.headerCell, { flex: 0.8 }]}>Putts</Text>
            <Text style={[styles.headerCell, { flex: 0.6 }]}>±</Text>
            <Text style={[styles.headerCell, { flex: 1.4 }]}>Trouble</Text>
          </View>

          {holeScores.map(h => {
            const diff = h.strokes - h.par;
            const diffColor =
              diff < 0    ? colors.koke
              : diff === 0 ? colors.text.secondary
              : diff === 1 ? colors.kincha
              : colors.aka;
            const puttWarn = h.putts >= 3;
            const troubleEmojis: Record<string, string> = {
              water: '💧', ob: '🚫', bunker: '🏖️', rough: '🌿', other: '⛰️',
            };
            const troubleStr = h.troubles?.length
              ? h.troubles.map(t => troubleEmojis[t] || t).join('')
              : '—';
            return (
              <View key={h.hole_number} style={[styles.tableRow, h.hole_number % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 0.5, fontWeight: '600' }]}>{h.hole_number}</Text>
                <Text style={[styles.tableCell, { flex: 0.7 }]}>{h.par}</Text>
                <Text style={[styles.tableCell, { fontWeight: '700' }]}>{h.strokes}</Text>
                <Text style={[styles.tableCell, { flex: 0.8, color: puttWarn ? colors.aka : colors.text.primary, fontWeight: puttWarn ? '700' : '400' }]}>
                  {h.putts}{puttWarn ? ' ⚠️' : ''}
                </Text>
                <Text style={[styles.tableCell, { flex: 0.6, color: diffColor, fontWeight: '700' }]}>
                  {diff > 0 ? '+' : ''}{diff}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.4, fontSize: typography.xs + 1 }]}>{troubleStr}</Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles — 日式极简设计系统 ──────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // ── Round card
  roundCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
    position: 'relative',
    overflow: 'hidden',
  },
  watercolorWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '50%',
    height: 80,
    opacity: 0.5,
  },
  courseName: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  courseInfo: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  scoreBlock: { alignItems: 'center' },
  scoreBig: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  scoreSmallLabel: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    letterSpacing: 0.3,
  },
  scoreVDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.usuzumi,
  },

  // ── Score summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
    paddingTop: spacing.md,
  },
  summaryItem: { alignItems: 'center' },
  summaryCount: {
    fontSize: typography.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.text.hint,
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── AI analysis card
  aiCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  aiTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
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
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  aiLoadingText: {
    color: colors.text.secondary,
    fontSize: typography.sm,
  },
  aiFeedback: {
    fontSize: typography.sm + 1,
    color: colors.text.primary,
    lineHeight: (typography.sm + 1) * 1.6,
  },

  // ── Practice plan card
  planCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.kincha,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  planTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontSize: typography.xs,
    color: colors.koke,
    fontWeight: '600',
  },
  planText: {
    fontSize: typography.sm,
    color: colors.text.primary,
    lineHeight: typography.sm * 1.6,
  },

  // ── Section title
  sectionTitle: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },

  // ── Holes table
  holesCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.washi,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
  },
  headerCell: {
    flex: 1,
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.text.hint,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
  },
  tableRowAlt: {
    backgroundColor: colors.washi,
  },
  tableCell: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
