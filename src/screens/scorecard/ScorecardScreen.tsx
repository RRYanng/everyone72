// ============================================================
// 记分卡 — 逐洞 3 步向导（组合层）
// UI 子组件全部拆分在同目录：
//   CourseStrip / WizardHeader / StepIndicator
//   StrokesStep / PuttsStep / TroubleStep (+ NumberButton)
//   Stat / StatDivider / MiniScorecardStrip / SubmitConfirmModal
//
// 草稿持久化：每次输入自动保存到 localStorage / AsyncStorage，
// 刷新或意外退出后可恢复。
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Animated,
  Modal, BackHandler, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useScorecardDraft, ScorecardDraft } from '../../hooks/useScorecardDraft';
import { isDevMockActive, setLastMockRound } from '../../lib/mockUser';
import { COURSES } from '../../data/courses';
import { HoleScore } from '../../types';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, LoadingSpinner, PrimaryButton, SecondaryButton } from '../../components';
import { colors, spacing, typography } from '../../theme';

import { CourseStrip } from './CourseStrip';
import { WizardHeader } from './WizardHeader';
import { Stat, StatDivider } from './Stat';
import { StepIndicator } from './StepIndicator';
import { StrokesStep } from './StrokesStep';
import { PuttsStep } from './PuttsStep';
import { TroubleStep } from './TroubleStep';
import { MiniScorecardStrip } from './MiniScorecardStrip';
import { SubmitConfirmModal } from './SubmitConfirmModal';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'Scorecard'>;

export default function ScorecardScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { courseId, totalHoles, teeBox } = route.params;
  const { user } = useAuth();
  const { resolveDraft, saveDraft, saveDraftNow, clearDraft } = useScorecardDraft(courseId, user?.id);

  // round_date：本轮归属日期。进入时默认今天；若恢复草稿则沿用草稿的日期，
  // 以保证 Supabase upsert 始终命中同一行 (user_id, course_id, round_date)。
  const roundDateRef = useRef(new Date().toISOString().split('T')[0]);
  const pendingDraft = useRef<ScorecardDraft | null>(null);
  // 始终持有最新一拍草稿，供 confirmExit / beforeunload 同步 flush。
  const latestDraftRef = useRef<Omit<ScorecardDraft, 'savedAt'>>({
    courseId, teeBox, totalHoles, scores: [], currentHole: 0, step: 1,
    roundDate: roundDateRef.current,
  });

  const course = COURSES.find(c => c.id === courseId)!;
  const holes  = course.holes.slice(0, totalHoles);

  const makeDefaultScores = useCallback(() =>
    holes.map(h => ({
      round_id: '',
      hole_number: h.hole_number,
      par: h.par,
      strokes: h.par,
      putts: 2,
      troubles: [],
    })),
  [holes]);

  const [scores, setScores] = useState<HoleScore[]>(makeDefaultScores);
  const [currentHole, setCurrentHole] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const hasUserInput = useRef(false);
  const isSubmitted = useRef(false);

  // ── 草稿恢复：mount 时检测（本地 + 远程，自动取较新的一份） ──
  useEffect(() => {
    (async () => {
      const draft = await resolveDraft();
      if (draft && draft.totalHoles === totalHoles) {
        pendingDraft.current = draft;
        setShowDraftRecovery(true);
      }
    })();
  }, []);

  const restoreDraft = useCallback(() => {
    const draft = pendingDraft.current;
    if (draft) {
      setScores(draft.scores);
      setCurrentHole(draft.currentHole);
      setStep(draft.step);
      if (draft.roundDate) roundDateRef.current = draft.roundDate;
      hasUserInput.current = true; // 恢复后已有数据，允许继续自动保存与退出拦截
    }
    setShowDraftRecovery(false);
  }, []);

  const discardDraft = useCallback(async () => {
    await clearDraft();
    setShowDraftRecovery(false);
  }, [clearDraft]);

  // ── 自动保存：每次状态变化后 debounce 写入 ─────────────────
  useEffect(() => {
    const draft = {
      courseId,
      teeBox,
      totalHoles,
      scores,
      currentHole,
      step,
      roundDate: roundDateRef.current,
    };
    // 无论是否已有输入，都更新 ref，保证 flush 时拿到最新一拍。
    latestDraftRef.current = draft;
    if (!hasUserInput.current) return;
    saveDraft(draft);
  }, [scores, currentHole, step, saveDraft, courseId, teeBox, totalHoles]);

  // ── web 端：硬刷新/关页前同步 flush 本地草稿 ────────────────
  // localStorage 写是同步的，能赶在卸载前完成；远程 30s upsert 不强求。
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = () => {
      if (hasUserInput.current && !isSubmitted.current) {
        saveDraftNow(latestDraftRef.current);
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraftNow]);

  // ── 退出确认：拦截返回 ────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmitted.current || !hasUserInput.current) return;
      e.preventDefault();
      setShowExitConfirm(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Android 硬件返回键
  useEffect(() => {
    const handler = () => {
      if (hasUserInput.current && !isSubmitted.current) {
        setShowExitConfirm(true);
        return true; // 拦截
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', handler);
    return () => BackHandler.removeEventListener('hardwareBackPress', handler);
  }, []);

  const confirmExit = useCallback(async () => {
    setShowExitConfirm(false);
    isSubmitted.current = true; // 让 beforeRemove 不再拦截
    if (hasUserInput.current) {
      await saveDraftNow(latestDraftRef.current); // flush 最后一拍，避免快速退出丢失
    }
    navigation.goBack();
  }, [navigation, saveDraftNow]);

  const current = scores[currentHole];

  const goToHole = (nextIdx: number) => {
    const dir = nextIdx > currentHole ? 1 : -1;
    slideAnim.setValue(20 * dir);
    setCurrentHole(nextIdx);
    setStep(1);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  const updateField = (idx: number, field: Partial<HoleScore>) =>
    setScores(prev => prev.map((s, i) => i === idx ? { ...s, ...field } : s));

  const selectStrokes = (n: number) => { hasUserInput.current = true; updateField(currentHole, { strokes: n }); setStep(2); };
  const selectPutts   = (n: number) => { hasUserInput.current = true; updateField(currentHole, { putts: n });   setStep(3); };
  const toggleTrouble = (key: string) => {
    hasUserInput.current = true;
    const cur = current.troubles ?? [];
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
    updateField(currentHole, { troubles: next });
  };

  const advanceAfterTroubles = () => {
    if (currentHole < totalHoles - 1) goToHole(currentHole + 1);
    else setShowConfirm(true);
  };

  const totalStrokes = scores.reduce((s, h) => s + h.strokes, 0);
  const totalPutts   = scores.reduce((s, h) => s + h.putts, 0);
  const totalPar     = holes.reduce((s, h) => s + h.par, 0);
  const scoreVsPar   = totalStrokes - totalPar;
  const vsParColor =
    scoreVsPar < 0 ? colors.koke
    : scoreVsPar > 0 ? colors.kincha
    : colors.text.primary;
  const vsParFormatted = scoreVsPar > 0 ? `+${scoreVsPar}` : `${scoreVsPar}`;

  const saveRound = async () => {
    setShowConfirm(false);

    if (isDevMockActive()) {
      setSaving(true);
      // 把整轮数据写入 mock cache，让 AnalysisScreen 能读取真实结果
      setLastMockRound({
        courseId:     course.id,
        totalHoles,
        totalStrokes,
        totalPutts,
        scoreVsPar,
        teeBox,
        holes:        scores,
        createdAt:    new Date().toISOString(),
      });
      await clearDraft();
      isSubmitted.current = true;
      await new Promise(r => setTimeout(r, 300));
      navigation.replace('Analysis', { roundId: 'mock-round-new' });
      return;
    }

    if (!user) { setSaveError('Not logged in.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      await supabase.from('courses').upsert({
        id: course.id, name: course.name, city: course.city, state: course.state,
        course_rating: course.course_rating, slope_rating: course.slope_rating,
        total_par: course.total_par,
      });
      const { data: roundData, error: roundErr } = await supabase
        .from('rounds')
        .insert({
          user_id: user.id, course_id: course.id,
          date: new Date().toISOString().split('T')[0],
          tee_box: teeBox, total_holes: totalHoles,
          total_strokes: totalStrokes, total_putts: totalPutts, score_vs_par: scoreVsPar,
        })
        .select().single();
      if (roundErr || !roundData) throw new Error(roundErr?.message ?? 'Failed to create round');

      await supabase.from('hole_scores').insert(
        scores.map(s => ({
          round_id: roundData.id, hole_number: s.hole_number,
          par: s.par, strokes: s.strokes, putts: s.putts,
          troubles: s.troubles ?? [],
        })),
      );
      await clearDraft();
      isSubmitted.current = true;
      navigation.replace('Analysis', { roundId: roundData.id });
    } catch (err: any) {
      setSaveError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={`Hole ${current.hole_number} / ${totalHoles}`}
        onBack={() => navigation.goBack()}
      />

      <CourseStrip courseName={course.name} teeBox={teeBox} totalHoles={totalHoles} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <Stat label="Total" value={totalStrokes} />
            <StatDivider />
            <Stat label="vs Par" value={vsParFormatted} color={vsParColor} />
            <StatDivider />
            <Stat label="Putts" value={totalPutts} />
          </View>
        </Card>

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <Card style={styles.wizardCard}>
            <WizardHeader holeNumber={current.hole_number} par={current.par} strokes={current.strokes} />
            <StepIndicator step={step} />

            {step === 1 && (
              <StrokesStep
                holeNumber={current.hole_number}
                par={current.par}
                value={current.strokes}
                onSelect={selectStrokes}
              />
            )}
            {step === 2 && (
              <PuttsStep
                holeNumber={current.hole_number}
                strokes={current.strokes}
                value={current.putts}
                onSelect={selectPutts}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <TroubleStep
                holeNumber={current.hole_number}
                putts={current.putts}
                selected={current.troubles ?? []}
                onToggle={toggleTrouble}
                onBack={() => setStep(2)}
                onAdvance={advanceAfterTroubles}
                isLast={currentHole === totalHoles - 1}
                saving={saving}
                error={saveError}
              />
            )}
          </Card>
        </Animated.View>
      </ScrollView>

      <MiniScorecardStrip scores={scores} currentHole={currentHole} onJumpTo={goToHole} />

      <SubmitConfirmModal
        visible={showConfirm}
        totalStrokes={totalStrokes}
        totalPutts={totalPutts}
        scoreVsPar={scoreVsPar}
        saving={saving}
        onConfirm={saveRound}
        onCancel={() => setShowConfirm(false)}
      />

      {/* 草稿恢复 Modal */}
      <Modal visible={showDraftRecovery} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Resume Previous Round?</Text>
            <Text style={styles.modalHint}>
              You have an unfinished scorecard for this course. Would you like to continue where you left off?
            </Text>
            <PrimaryButton label="Resume" onPress={restoreDraft} />
            <View style={styles.modalBtnGap}>
              <SecondaryButton label="Start Fresh" onPress={discardDraft} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* 退出确认 Modal */}
      <Modal visible={showExitConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave Round?</Text>
            <Text style={styles.modalHint}>
              Your progress has been saved as a draft. You can resume this round later.
            </Text>
            <PrimaryButton label="Leave" onPress={confirmExit} />
            <View style={styles.modalBtnGap}>
              <SecondaryButton label="Keep Playing" onPress={() => setShowExitConfirm(false)} />
            </View>
          </Card>
        </View>
      </Modal>

      {saving && !showConfirm ? (
        <View
          style={styles.savingOverlay}
          accessible
          accessibilityLabel="Saving round"
          accessibilityState={{ busy: true }}
        >
          <LoadingSpinner />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
  },
  statsCard: { marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  wizardCard: { padding: spacing.lg },
  savingOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(28,28,30,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,28,30,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalHint: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.sm * 1.5,
  },
  modalBtnGap: { marginTop: spacing.sm },
});
