// ============================================================
// AI 成绩分析界面
// 显示 Claude 对本轮成绩的分析反馈
// ============================================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { analyzeRound, generatePracticePlan } from '../../lib/claude';
import { Round, HoleScore, Course, PracticePlan } from '../../types';
import { SEED_COURSES } from '../../data/courses';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'Analysis'>;

// 成绩分布统计
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
    { label: 'Eagle+', count: counts.eagle, color: '#d4af37' },
    { label: 'Birdie', count: counts.birdie, color: '#4caf50' },
    { label: 'Par', count: counts.par, color: '#888' },
    { label: 'Bogey', count: counts.bogey, color: '#ff9800' },
    { label: 'Double+', count: counts.double + counts.worse, color: '#f44336' },
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

    const foundCourse = SEED_COURSES.find(c => c.id === roundData.course_id) || null;

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
    if (vs_par <= 0) return '#d4af37';
    if (vs_par <= 5) return '#4caf50';
    if (vs_par <= 10) return '#ff9800';
    return '#f44336';
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()} style={{ width: 40 }}>
          <Ionicons name="home-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Round Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 成绩总览卡片 */}
        <View style={styles.roundCard}>
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
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: scoreColor(round?.score_vs_par ?? 0) }]}>
                {(round?.score_vs_par ?? 0) > 0 ? '+' : ''}{round?.score_vs_par}
              </Text>
              <Text style={styles.scoreSmallLabel}>vs Par</Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreBig}>{round?.total_putts}</Text>
              <Text style={styles.scoreSmallLabel}>Putts</Text>
            </View>
          </View>

          {/* 成绩分布 */}
          {holeScores.length > 0 && <ScoreSummary scores={holeScores} />}
        </View>

        {/* AI 分析区域 */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Ionicons name="analytics" size={20} color="#1a472a" />
            <Text style={styles.aiTitle}>AI Coach Feedback</Text>
            <Text style={styles.aiPowered}>Powered by Claude</Text>
          </View>

          {loadingAI ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator color="#1a472a" />
              <Text style={styles.aiLoadingText}>Analyzing your round...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: feedbackOpacity, transform: [{ translateY: cardSlide }] }}>
              <Text style={styles.aiFeedback}>{feedback || 'No analysis available.'}</Text>
            </Animated.View>
          )}
        </View>

        {/* 练习计划卡片 */}
        {(loadingPlan || practicePlan) && (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>📅</Text>
              <Text style={styles.planTitle}>Your Practice Plan</Text>
              {planSaved && <Text style={styles.planSaved}>✓ Saved</Text>}
            </View>
            {loadingPlan && !practicePlan ? (
              <View style={styles.planLoading}>
                <ActivityIndicator size="small" color="#d4af37" />
                <Text style={styles.planLoadingText}>Building your weekly plan...</Text>
              </View>
            ) : (
              <Text style={styles.planText}>{practicePlan}</Text>
            )}
          </View>
        )}

        {/* 每洞详细成绩 */}
        <Text style={styles.sectionTitle}>Hole by Hole</Text>
        <View style={styles.holesTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.7 }]}>Par</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Score</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Putts</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.6 }]}>±</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.4 }]}>Trouble</Text>
          </View>
          {holeScores.map(h => {
            const diff = h.strokes - h.par;
            const diffColor = diff < 0 ? '#4caf50' : diff === 0 ? '#555' : diff === 1 ? '#ff9800' : '#f44336';
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
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{h.strokes}</Text>
                <Text style={[styles.tableCell, { flex: 0.8, color: puttWarn ? '#f44336' : '#333', fontWeight: puttWarn ? 'bold' : 'normal' }]}>
                  {h.putts}{puttWarn ? '⚠️' : ''}
                </Text>
                <Text style={[styles.tableCell, { flex: 0.6, color: diffColor, fontWeight: 'bold' }]}>
                  {diff > 0 ? '+' : ''}{diff}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.4, fontSize: 13 }]}>{troubleStr}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1a472a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  roundCard: {
    backgroundColor: '#1a472a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  courseName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  courseInfo: { color: '#a8d5b5', fontSize: 12, marginTop: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, marginBottom: 16 },
  scoreBlock: { alignItems: 'center' },
  scoreBig: { color: '#d4af37', fontSize: 32, fontWeight: 'bold' },
  scoreSmallLabel: { color: '#a8d5b5', fontSize: 12, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 14,
  },
  summaryItem: { alignItems: 'center' },
  summaryCount: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { color: '#a8d5b5', fontSize: 10, marginTop: 2 },
  aiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  aiTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a472a', flex: 1 },
  aiPowered: { fontSize: 10, color: '#aaa' },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  aiLoadingText: { color: '#888', fontSize: 14 },
  aiFeedback: { fontSize: 15, color: '#333', lineHeight: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#1a472a',
    marginBottom: 10, marginTop: 4,
  },
  holesTable: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a472a',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tableHeaderText: { color: '#a8d5b5', fontWeight: '700', fontSize: 12 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16 },
  tableRowAlt: { backgroundColor: '#f9f9f6' },
  tableCell: { flex: 1, fontSize: 14, color: '#333', textAlign: 'center' },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  planIcon: { fontSize: 20 },
  planTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a472a', flex: 1 },
  planSaved: { fontSize: 12, color: '#4caf50', fontWeight: '600' },
  planLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  planLoadingText: { color: '#888', fontSize: 14 },
  planText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    fontFamily: undefined,
  },
});
