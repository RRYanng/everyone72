// ============================================================
// 记分卡 — 逐洞 3 步向导（组合层）
// UI 子组件全部拆分在同目录：
//   CourseStrip / WizardHeader / StepIndicator
//   StrokesStep / PuttsStep / TroubleStep (+ NumberButton)
//   Stat / StatDivider / MiniScorecardStrip / SubmitConfirmModal
// ============================================================

import React, { useState, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isDevMockActive } from '../../lib/mockUser';
import { COURSES } from '../../data/courses';
import { HoleScore } from '../../types';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, LoadingSpinner } from '../../components';
import { colors, spacing } from '../../theme';

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

  const course = COURSES.find(c => c.id === courseId)!;
  const holes  = course.holes.slice(0, totalHoles);

  const [scores, setScores] = useState<HoleScore[]>(
    holes.map(h => ({
      round_id: '',
      hole_number: h.hole_number,
      par: h.par,
      strokes: h.par,
      putts: 2,
      troubles: [],
    })),
  );
  const [currentHole, setCurrentHole] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

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

  const selectStrokes = (n: number) => { updateField(currentHole, { strokes: n }); setStep(2); };
  const selectPutts   = (n: number) => { updateField(currentHole, { putts: n });   setStep(3); };
  const toggleTrouble = (key: string) => {
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
});
