// ============================================================
// 记分卡界面 — 逐步引导式输入
// Step 1: 总杆数  Step 2: 推杆数  Step 3: 球场障碍
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Modal, Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { SEED_COURSES } from '../../data/courses';
import { HoleScore } from '../../types';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'Scorecard'>;

const STROKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const PUTT_OPTIONS   = [0, 1, 2, 3, 4];

const TROUBLES = [
  { key: 'water',  emoji: '💧', label: 'Water'  },
  { key: 'ob',     emoji: '🚫', label: 'OB'     },
  { key: 'bunker', emoji: '🏖️', label: 'Bunker' },
  { key: 'rough',  emoji: '🌿', label: 'Rough'  },
  { key: 'other',  emoji: '⛰️', label: 'Other'  },
];

const scoreLabel = (strokes: number, par: number) => {
  const diff = strokes - par;
  if (diff <= -2) return { label: 'Eagle',  bg: '#d4af37', color: '#fff' };
  if (diff === -1) return { label: 'Birdie', bg: '#4caf50', color: '#fff' };
  if (diff === 0)  return { label: 'Par',    bg: '#e0e0e0', color: '#555' };
  if (diff === 1)  return { label: 'Bogey',  bg: '#ff9800', color: '#fff' };
  if (diff === 2)  return { label: 'Double', bg: '#f44336', color: '#fff' };
  return { label: `+${diff}`, bg: '#b71c1c', color: '#fff' };
};

export default function ScorecardScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { courseId, totalHoles, teeBox } = route.params;
  const { user } = useAuth();

  const course = SEED_COURSES.find(c => c.id === courseId)!;
  const holes  = course.holes.slice(0, totalHoles);

  const [scores, setScores] = useState<HoleScore[]>(
    holes.map(h => ({ round_id: '', hole_number: h.hole_number, par: h.par, strokes: h.par, putts: 2, troubles: [] }))
  );
  const [currentHole, setCurrentHole] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const goToHole = (nextIdx: number) => {
    const dir = nextIdx > currentHole ? 1 : -1;
    slideAnim.setValue(30 * dir);
    setCurrentHole(nextIdx);
    setStep(1);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  const updateField = (idx: number, field: Partial<HoleScore>) =>
    setScores(prev => prev.map((s, i) => i === idx ? { ...s, ...field } : s));

  const selectStrokes = (n: number) => { updateField(currentHole, { strokes: n }); setStep(2); };
  const selectPutts   = (n: number) => { updateField(currentHole, { putts: n });   setStep(3); };

  const toggleTrouble = (key: string) => {
    const cur = scores[currentHole].troubles ?? [];
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
    updateField(currentHole, { troubles: next });
  };

  const advanceAfterTroubles = () => {
    if (currentHole < totalHoles - 1) {
      goToHole(currentHole + 1);
    } else {
      setShowConfirm(true);
    }
  };

  const totalStrokes = scores.reduce((s, h) => s + h.strokes, 0);
  const totalPutts   = scores.reduce((s, h) => s + h.putts, 0);
  const totalPar     = holes.reduce((s, h) => s + h.par, 0);
  const scoreVsPar   = totalStrokes - totalPar;

  const saveRound = async () => {
    setShowConfirm(false);
    if (!user) { setSaveError('Not logged in.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      await supabase.from('courses').upsert({
        id: course.id, name: course.name, city: course.city, state: course.state,
        course_rating: course.course_rating, slope_rating: course.slope_rating, total_par: course.total_par,
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
        }))
      );
      navigation.replace('Analysis', { roundId: roundData.id });
    } catch (err: any) {
      setSaveError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  const current = scores[currentHole];
  const { label, bg, color } = scoreLabel(current.strokes, current.par);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{course.name}</Text>
          <Text style={styles.headerSub}>{teeBox} Tee · {totalHoles} Holes</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Score banner */}
      <View style={styles.scoreBanner}>
        <View style={styles.scoreStat}>
          <Text style={styles.scoreStatNum}>{totalStrokes}</Text>
          <Text style={styles.scoreStatLabel}>Total</Text>
        </View>
        <View style={styles.scoreStat}>
          <Text style={[styles.scoreStatNum, { color: scoreVsPar > 0 ? '#ff9800' : '#4caf50' }]}>
            {scoreVsPar > 0 ? '+' : ''}{scoreVsPar}
          </Text>
          <Text style={styles.scoreStatLabel}>vs Par</Text>
        </View>
        <View style={styles.scoreStat}>
          <Text style={styles.scoreStatNum}>{totalPutts}</Text>
          <Text style={styles.scoreStatLabel}>Putts</Text>
        </View>
      </View>

      {/* Hole picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.holePicker}>
        {scores.map((s, idx) => {
          const diff = s.strokes - s.par;
          const dotColor = diff <= -1 ? '#4caf50' : diff === 0 ? '#888' : diff === 1 ? '#ff9800' : '#f44336';
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.holeDot, currentHole === idx && styles.holeDotActive]}
              onPress={() => goToHole(idx)}
            >
              <Text style={[styles.holeDotNum, currentHole === idx && styles.holeDotNumActive]}>
                {s.hole_number}
              </Text>
              {s.strokes !== s.par && (
                <View style={[styles.holeDotIndicator, { backgroundColor: dotColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hole wizard card */}
      <Animated.View style={[styles.holeCard, { transform: [{ translateX: slideAnim }] }]}>
        {/* Card header */}
        <View style={styles.holeTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.holeNum}>Hole {current.hole_number}</Text>
            <Text style={styles.holePar}>Par {current.par}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicatorRow}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
          ))}
          <Text style={styles.stepLabel}>
            {step === 1 ? 'Strokes' : step === 2 ? 'Putts' : 'Trouble?'}
          </Text>
        </View>

        {/* ── Step 1: Strokes ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepQuestion}>How many strokes?</Text>
            <View style={styles.optionGrid}>
              {STROKE_OPTIONS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.optionBtn, current.strokes === n && styles.optionBtnActive]}
                  onPress={() => selectStrokes(n)}
                >
                  <Text style={[styles.optionBtnText, current.strokes === n && styles.optionBtnTextActive]}>
                    {n === 8 ? '8+' : n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 2: Putts ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepQuestion}>How many of those were putts?</Text>
            <View style={[styles.optionGrid, { justifyContent: 'center' }]}>
              {PUTT_OPTIONS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.optionBtn, styles.optionBtnLg, current.putts === n && styles.optionBtnActive]}
                  onPress={() => selectPutts(n)}
                >
                  <Text style={[styles.optionBtnText, current.putts === n && styles.optionBtnTextActive]}>
                    {n === 4 ? '4+' : n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.editLink}>
              <Text style={styles.editLinkText}>← Edit strokes ({current.strokes})</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Trouble ── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepQuestion}>Any trouble on this hole?</Text>
            <View style={styles.troubleGrid}>
              {TROUBLES.map(t => {
                const active = (current.troubles ?? []).includes(t.key);
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.troubleTag, active && styles.troubleTagActive]}
                    onPress={() => toggleTrouble(t.key)}
                  >
                    <Text style={styles.troubleEmoji}>{t.emoji}</Text>
                    <Text style={[styles.troubleLabel, active && styles.troubleLabelActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setStep(2)} style={styles.editLink}>
              <Text style={styles.editLinkText}>← Edit putts ({current.putts})</Text>
            </TouchableOpacity>

            {saveError !== '' && <Text style={styles.errorText}>⚠️ {saveError}</Text>}

            <TouchableOpacity
              style={[styles.advanceBtn, saving && { opacity: 0.6 }]}
              onPress={advanceAfterTroubles}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : currentHole < totalHoles - 1 ? (
                <>
                  <Text style={styles.advanceBtnText}>Next Hole</Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.advanceBtnText}>Finish Round</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Mini scorecard */}
      <ScrollView style={styles.miniCard} horizontal showsHorizontalScrollIndicator={false}>
        {scores.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => goToHole(idx)}
            style={[styles.miniHole, currentHole === idx && styles.miniHoleActive]}
          >
            <Text style={styles.miniHoleNum}>{s.hole_number}</Text>
            <Text style={styles.miniPar}>P{s.par}</Text>
            <Text style={[
              styles.miniScore,
              s.strokes < s.par ? { color: '#4caf50' } :
              s.strokes > s.par ? { color: '#f44336' } : { color: '#555' },
            ]}>
              {s.strokes}
            </Text>
            {(s.troubles ?? []).length > 0 && <View style={styles.miniTroubleDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Finish confirm modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Round?</Text>
            <View style={styles.modalStats}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatNum}>{totalStrokes}</Text>
                <Text style={styles.modalStatLabel}>Total</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={[styles.modalStatNum, { color: scoreVsPar > 0 ? '#ff9800' : '#4caf50' }]}>
                  {scoreVsPar > 0 ? '+' : ''}{scoreVsPar}
                </Text>
                <Text style={styles.modalStatLabel}>vs Par</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatNum}>{totalPutts}</Text>
                <Text style={styles.modalStatLabel}>Putts</Text>
              </View>
            </View>
            <Text style={styles.modalHint}>
              Your scorecard will be analyzed by AI Coach ⛳
            </Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={saveRound}>
              <Text style={styles.modalConfirmText}>Save & Get AI Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirm(false)}>
              <Text style={styles.modalCancelText}>Keep Editing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    backgroundColor: '#1a472a', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8,
  },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: '#a8d5b5', fontSize: 11, marginTop: 2 },
  scoreBanner: {
    backgroundColor: '#1a472a', flexDirection: 'row',
    justifyContent: 'space-around', paddingVertical: 12, paddingBottom: 16,
  },
  scoreStat: { alignItems: 'center' },
  scoreStatNum: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  scoreStatLabel: { color: '#a8d5b5', fontSize: 11, marginTop: 2 },
  holePicker: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 8, flexGrow: 0 },
  holeDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0',
    marginHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  holeDotActive: { backgroundColor: '#1a472a' },
  holeDotNum: { fontSize: 13, fontWeight: '600', color: '#555' },
  holeDotNumActive: { color: '#fff' },
  holeDotIndicator: { position: 'absolute', bottom: 2, width: 6, height: 6, borderRadius: 3 },
  holeCard: {
    backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  holeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  holeNum: { fontSize: 22, fontWeight: 'bold', color: '#1a472a' },
  holePar: { fontSize: 14, color: '#888', marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { fontSize: 14, fontWeight: 'bold' },
  // Step indicator
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  stepDotActive: { backgroundColor: '#1a472a' },
  stepLabel: { fontSize: 12, color: '#888', marginLeft: 4, fontWeight: '600' },
  // Question text
  stepQuestion: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 14 },
  // Option buttons (strokes + putts)
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn: {
    width: 54, height: 54, borderRadius: 12,
    backgroundColor: '#f5f5f0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  optionBtnLg: { width: 60, height: 60 },
  optionBtnActive: { backgroundColor: '#1a472a', borderColor: '#1a472a' },
  optionBtnText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  optionBtnTextActive: { color: '#fff' },
  // Trouble tags
  troubleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  troubleTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f5f5f0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  troubleTagActive: { backgroundColor: '#1a472a', borderColor: '#1a472a' },
  troubleEmoji: { fontSize: 16 },
  troubleLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  troubleLabelActive: { color: '#fff' },
  // Back edit link
  editLink: { paddingVertical: 6 },
  editLinkText: { fontSize: 13, color: '#888' },
  errorText: { color: '#f44336', fontSize: 13, textAlign: 'center', marginVertical: 6 },
  // Advance button
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1a472a', borderRadius: 12, padding: 14, marginTop: 8,
  },
  advanceBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  // Mini scorecard
  miniCard: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
    paddingVertical: 8, paddingHorizontal: 6, flexGrow: 0,
  },
  miniHole: {
    alignItems: 'center', width: 44, marginHorizontal: 2,
    paddingVertical: 6, borderRadius: 8,
  },
  miniHoleActive: { backgroundColor: '#e8f5e9' },
  miniHoleNum: { fontSize: 11, color: '#888', fontWeight: '600' },
  miniPar: { fontSize: 10, color: '#aaa' },
  miniScore: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  miniTroubleDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#ff9800', marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a472a', textAlign: 'center', marginBottom: 16 },
  modalStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  modalStat: { alignItems: 'center' },
  modalStatNum: { fontSize: 28, fontWeight: 'bold', color: '#1a472a' },
  modalStatLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  modalHint: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalConfirmBtn: {
    backgroundColor: '#1a472a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10,
  },
  modalConfirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCancelBtn: { padding: 12, alignItems: 'center' },
  modalCancelText: { color: '#888', fontSize: 14 },
});
