// ============================================================
// 编辑已保存的成绩
//
// 只能改:每洞杆数 / 推杆 / 障碍,以及发球台。球场、洞数、标准杆、日期不能改。
// 保存走服务端 update_round():总杆 / 推杆 / 相对标准杆由服务端重新汇总,
// 旧的 AI 分析被清空,回到分析页后会重新生成。
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { HoleScore } from '../../types';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, LoadingSpinner, PrimaryButton } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { HoleEdit, roundTotals, hasRoundChanged } from '../../lib/roundStats';
import { updateRound, roundActionMessage } from '../../lib/roundActions';
import { confirmAction } from '../../lib/dialog';
import { track } from '../../lib/analytics';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteT  = RouteProp<RootStackParamList, 'EditRound'>;

const TEE_BOXES = ['Red', 'Gold', 'White', 'Blue', 'Black'];
const TROUBLES = [
  { key: 'water',  emoji: '💧', label: 'Water'  },
  { key: 'ob',     emoji: '🚫', label: 'OB'     },
  { key: 'bunker', emoji: '🏖️', label: 'Bunker' },
  { key: 'rough',  emoji: '🌿', label: 'Rough'  },
  { key: 'other',  emoji: '⛰️', label: 'Other'  },
] as const;

const MAX_STROKES = 20;
const MAX_PUTTS = 10;

export default function EditRoundScreen() {
  const navigation = useNavigation<NavProp>();
  const { roundId } = useRoute<RouteT>().params;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [courseLine, setCourseLine] = useState('');
  const [teeBox, setTeeBox] = useState('White');
  const [original, setOriginal] = useState<HoleEdit[]>([]);
  const [holes, setHoles] = useState<HoleEdit[]>([]);
  const [originalTee, setOriginalTee] = useState('White');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: round, error } = await supabase
        .from('rounds')
        .select('id, tee_box, date, courses(name)')
        .eq('id', roundId)
        .maybeSingle();
      const { data: hs, error: hErr } = await supabase
        .from('hole_scores')
        .select('hole_number, par, strokes, putts, troubles')
        .eq('round_id', roundId)
        .order('hole_number');
      if (error || hErr || !round || !hs || hs.length === 0) {
        setLoadError('Could not load this round.');
        setLoading(false);
        return;
      }
      const edits: HoleEdit[] = (hs as HoleScore[]).map(h => ({
        hole_number: h.hole_number, par: h.par, strokes: h.strokes, putts: h.putts,
        troubles: h.troubles ?? [],
      }));
      setOriginal(edits);
      setHoles(edits.map(h => ({ ...h, troubles: [...(h.troubles ?? [])] })));
      const tee = (round as any).tee_box ?? 'White';
      setTeeBox(tee);
      setOriginalTee(tee);
      setCourseLine(`${(round as any).courses?.name ?? 'Round'} · ${edits.length} holes`);
      setLoading(false);
    })();
  }, [roundId]);

  const totals  = useMemo(() => roundTotals(holes), [holes]);
  const changed = useMemo(
    () => hasRoundChanged(original, holes) || teeBox !== originalTee,
    [original, holes, teeBox, originalTee],
  );

  const patch = (n: number, fn: (h: HoleEdit) => HoleEdit) =>
    setHoles(prev => prev.map(h => (h.hole_number === n ? fn(h) : h)));

  const changeStrokes = (n: number, d: number) => patch(n, h => {
    const strokes = Math.min(MAX_STROKES, Math.max(1, h.strokes + d));
    return { ...h, strokes, putts: Math.min(h.putts, strokes, MAX_PUTTS) };   // 推杆不能多于杆数
  });
  const changePutts = (n: number, d: number) => patch(n, h => ({
    ...h, putts: Math.min(Math.min(h.strokes, MAX_PUTTS), Math.max(0, h.putts + d)),
  }));
  const toggleTrouble = (n: number, key: string) => patch(n, h => {
    const cur = h.troubles ?? [];
    return { ...h, troubles: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] };
  });

  const goBack = async () => {
    if (changed && !(await confirmAction('Discard changes?', 'Your edits to this round have not been saved.', 'Discard', true))) return;
    navigation.goBack();
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateRound(roundId, teeBox, holes);
      track('round_edited');
      // 回到首页栈顶再进分析页:不留下一个显示旧成绩的分析页。
      // 旧的 AI 分析已被服务端清空,分析页会重新生成(并更新练习计划)。
      navigation.popToTop();
      navigation.navigate('Analysis', { roundId });
    } catch (err) {
      setSaveError(roundActionMessage(err));
      setSaving(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><LoadingSpinner fullscreen /></SafeAreaView>;
  }
  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Edit Round" onBack={() => navigation.goBack()} />
        <Text style={styles.errorText}>{loadError}</Text>
      </SafeAreaView>
    );
  }

  const vs = totals.vsPar;
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Edit Round" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.courseLine}>{courseLine}</Text>

        <Card style={styles.totalsCard}>
          <View style={styles.totalsRow} accessibilityLabel={`Total ${totals.strokes}, ${vs > 0 ? '+' : ''}${vs} vs par, ${totals.putts} putts`}>
            <Total label="Total" value={String(totals.strokes)} />
            <Total label="vs Par" value={`${vs > 0 ? '+' : ''}${vs}`} />
            <Total label="Putts" value={String(totals.putts)} />
          </View>
          <Text style={styles.note}>
            Saving updates your stats and clears this round's AI analysis; it is regenerated the next time you open it.
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>Tee</Text>
        <View style={styles.chipRow}>
          {TEE_BOXES.map(t => (
            <Pressable
              key={t}
              onPress={() => setTeeBox(t)}
              accessibilityRole="radio"
              accessibilityState={{ selected: teeBox === t }}
              accessibilityLabel={`${t} tee`}
              style={[styles.chip, teeBox === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, teeBox === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {holes.map(h => {
          const diff = h.strokes - h.par;
          return (
            <Card key={h.hole_number} style={styles.holeCard}>
              <View style={styles.holeHeader}>
                <Text style={styles.holeTitle}>Hole {h.hole_number}</Text>
                <Text style={styles.holePar}>Par {h.par}  ·  {diff > 0 ? '+' : ''}{diff}</Text>
              </View>
              <View style={styles.steppers}>
                <Stepper
                  label="Strokes" value={h.strokes}
                  onMinus={() => changeStrokes(h.hole_number, -1)} onPlus={() => changeStrokes(h.hole_number, 1)}
                  minusDisabled={h.strokes <= 1} plusDisabled={h.strokes >= MAX_STROKES}
                  a11y={`Hole ${h.hole_number} strokes`}
                />
                <Stepper
                  label="Putts" value={h.putts}
                  onMinus={() => changePutts(h.hole_number, -1)} onPlus={() => changePutts(h.hole_number, 1)}
                  minusDisabled={h.putts <= 0} plusDisabled={h.putts >= Math.min(h.strokes, MAX_PUTTS)}
                  a11y={`Hole ${h.hole_number} putts`}
                />
              </View>
              <View style={styles.chipRow}>
                {TROUBLES.map(t => {
                  const on = (h.troubles ?? []).includes(t.key);
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => toggleTrouble(h.hole_number, t.key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`Hole ${h.hole_number} ${t.label}`}
                      style={[styles.chip, on && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextActive]}>{t.emoji} {t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}

        {saveError ? <Text style={styles.errorText} accessibilityRole="alert">{saveError}</Text> : null}
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={save}
          loading={saving}
          disabled={!changed}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalCol}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

function Stepper({
  label, value, onMinus, onPlus, minusDisabled, plusDisabled, a11y,
}: {
  label: string; value: number; onMinus: () => void; onPlus: () => void;
  minusDisabled: boolean; plusDisabled: boolean; a11y: string;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={onMinus} disabled={minusDisabled} accessibilityRole="button"
          accessibilityLabel={`Decrease ${a11y}`} hitSlop={6}
          style={[styles.stepBtn, minusDisabled && styles.stepBtnDisabled]}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue} accessibilityLabel={`${a11y}: ${value}`}>{value}</Text>
        <Pressable onPress={onPlus} disabled={plusDisabled} accessibilityRole="button"
          accessibilityLabel={`Increase ${a11y}`} hitSlop={6}
          style={[styles.stepBtn, plusDisabled && styles.stepBtnDisabled]}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  courseLine: { fontSize: typography.sm, color: colors.text.secondary, marginBottom: spacing.md },
  totalsCard: { padding: spacing.base, marginBottom: spacing.md },
  totalsRow: { flexDirection: 'row' },
  totalCol: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: typography.xl, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  totalLabel: { fontSize: typography.xs, color: colors.text.secondary, marginTop: spacing.xs },
  note: { fontSize: typography.xs, color: colors.text.hint, marginTop: spacing.md, textAlign: 'center' },
  sectionLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full,
    backgroundColor: colors.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi,
  },
  chipActive: { backgroundColor: colors.kokeTint, borderColor: colors.koke },
  chipText: { fontSize: typography.sm, color: colors.text.secondary },
  chipTextActive: { color: colors.text.primary, fontWeight: '600' },
  holeCard: { padding: spacing.base, marginBottom: spacing.md },
  holeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  holeTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text.primary },
  holePar: { fontSize: typography.sm, color: colors.text.secondary },
  steppers: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  stepper: { flex: 1 },
  stepperLabel: { fontSize: typography.xs, color: colors.text.secondary, marginBottom: spacing.xs },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.shiro, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: typography.lg, color: colors.text.primary, lineHeight: typography.lg + 2 },
  stepValue: { fontSize: typography.lg, fontWeight: '700', color: colors.text.primary, minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] },
  errorText: { color: colors.aka, fontSize: typography.sm, marginTop: spacing.md, textAlign: 'center' },
});
