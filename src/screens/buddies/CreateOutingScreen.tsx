// ============================================================
// 发一个局 —— 搭子/约局 v1(Phase 4 · Task 4.2)
// 表单不含城市:city 由 createOuting 内部从 profile.city 取(城市同源)。
// 字段:球场(搜索选)/ 日期 / 开球时间 / 人数 2-4 / 差点偏好 / 加入方式 / 备注。
// 沿用日式极简设计系统与 CreateCrew 表单模式。
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../hooks/useAuth';
import { createOuting, NewOutingInput } from '../../lib/outings';
import { COURSES } from '../../data/courses';
import { JoinMode } from '../../types/buddies';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, PrimaryButton, SecondaryButton } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const COURSE_RESULT_LIMIT = 8;
const SLOT_OPTIONS = [2, 3, 4] as const;
const SKILL_OPTIONS: { key: string; label: string }[] = [
  { key: 'any',     label: '不限差点' },
  { key: 'near_me', label: '和我接近' },
];
const JOIN_OPTIONS: { key: JoinMode; label: string; hint: string }[] = [
  { key: 'instant', label: '直接加入', hint: '别人点加入即可进局' },
  { key: 'approve', label: '需要审批', hint: '你逐个通过申请' },
];
const NOTE_MAX = 120;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export default function CreateOutingScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [courseId, setCourseId]       = useState<string | null>(null);
  const [courseQuery, setCourseQuery] = useState('');
  const [playDate, setPlayDate]       = useState('');
  const [teeTime, setTeeTime]         = useState('');
  const [slots, setSlots]             = useState<number>(2);
  const [skillPref, setSkillPref]     = useState<string>('any');
  const [joinMode, setJoinMode]       = useState<JoinMode>('instant');
  const [note, setNote]               = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const selectedCourse = courseId ? COURSES.find(c => c.id === courseId) ?? null : null;
  const q = courseQuery.trim().toLowerCase();
  const courseResults = q.length > 0
    ? COURSES.filter(c =>
        c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q),
      ).slice(0, COURSE_RESULT_LIMIT)
    : [];

  // 本地年月日,避免加州傍晚被 UTC 误判成"明天"
  const n = new Date();
  const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

  const validate = (): string | null => {
    if (!courseId) return '请选择球场。';
    if (!DATE_RE.test(playDate)) return '请填写开球日期(格式 YYYY-MM-DD)。';
    if (playDate < todayStr) return '开球日期不能早于今天。';
    if (teeTime.trim() && !TIME_RE.test(teeTime.trim())) return '开球时间格式应为 HH:MM。';
    return null;
  };

  const handleCreate = async () => {
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    if (!user) { setError('请先登录后再发局。'); return; }

    setSaving(true);
    const input: NewOutingInput = {
      course_id:  courseId!,
      play_date:  playDate,
      tee_time:   teeTime.trim() ? teeTime.trim() : null,
      slots_total: slots,
      skill_pref: skillPref,
      note:       note.trim() ? note.trim() : null,
      join_mode:  joinMode,
    };
    const outing = await createOuting(user.id, input);
    setSaving(false);

    if (!outing) {
      setError('发局失败。请确认已在档案里设置城市,然后重试。');
      return;
    }
    navigation.replace('OutingDetail', { outingId: outing.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="发一个局" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 球场(必选) */}
        <Text style={styles.label}>球场 <Text style={styles.required}>*</Text></Text>
        {selectedCourse ? (
          <View style={styles.selectedRow}>
            <View style={styles.selectedMeta}>
              <Text style={styles.selectedName} numberOfLines={1}>{selectedCourse.name}</Text>
              <Text style={styles.selectedSub} numberOfLines={1}>
                {selectedCourse.city}, {selectedCourse.state}
              </Text>
            </View>
            <Pressable
              onPress={() => { setCourseId(null); setCourseQuery(''); }}
              accessibilityRole="button"
              accessibilityLabel="更换球场"
              hitSlop={8}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
            >
              <Text style={styles.clearBtnText}>更换</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="搜索球场名称或城市"
              placeholderTextColor={colors.text.hint}
              value={courseQuery}
              onChangeText={setCourseQuery}
              accessibilityLabel="搜索球场"
            />
            {courseResults.length > 0 ? (
              <Card style={styles.resultsCard}>
                {courseResults.map((c, idx) => (
                  <Pressable
                    key={c.id}
                    onPress={() => { setCourseId(c.id); setCourseQuery(''); setError(''); }}
                    accessibilityRole="button"
                    accessibilityLabel={`选择 ${c.name}`}
                    style={({ pressed }) => [
                      styles.resultRow,
                      idx > 0 && styles.resultRowDivider,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.resultName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.resultSub} numberOfLines={1}>{c.city}, {c.state}</Text>
                  </Pressable>
                ))}
              </Card>
            ) : q.length > 0 ? (
              <Text style={styles.hint}>没有匹配的球场。</Text>
            ) : null}
          </>
        )}

        {/* 日期 */}
        <Text style={styles.label}>开球日期 <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={`例如 ${todayStr}`}
          placeholderTextColor={colors.text.hint}
          value={playDate}
          onChangeText={t => { setPlayDate(t); setError(''); }}
          autoCapitalize="none"
          accessibilityLabel="开球日期,格式 YYYY-MM-DD"
        />

        {/* 开球时间(可选) */}
        <Text style={styles.label}>开球时间(可选)</Text>
        <TextInput
          style={styles.input}
          placeholder="例如 08:00"
          placeholderTextColor={colors.text.hint}
          value={teeTime}
          onChangeText={t => { setTeeTime(t); setError(''); }}
          accessibilityLabel="开球时间,格式 HH:MM"
        />

        {/* 人数 */}
        <Text style={styles.label}>总人数(含你)</Text>
        <View style={styles.segRow}>
          {SLOT_OPTIONS.map(n => {
            const active = slots === n;
            return (
              <Pressable
                key={n}
                onPress={() => setSlots(n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${n} 人`}
                style={({ pressed }) => [styles.seg, active && styles.segActive, pressed && !active && styles.pressed]}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{n} 人</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 差点偏好 */}
        <Text style={styles.label}>差点偏好</Text>
        <View style={styles.segRow}>
          {SKILL_OPTIONS.map(opt => {
            const active = skillPref === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setSkillPref(opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt.label}
                style={({ pressed }) => [styles.seg, active && styles.segActive, pressed && !active && styles.pressed]}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 加入方式 */}
        <Text style={styles.label}>加入方式</Text>
        <View style={styles.joinRow}>
          {JOIN_OPTIONS.map(opt => {
            const active = joinMode === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setJoinMode(opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt.label}
                style={({ pressed }) => [styles.joinCard, active && styles.joinCardActive, pressed && !active && styles.pressed]}
              >
                <Text style={[styles.joinTitle, active && styles.joinTitleActive]}>{opt.label}</Text>
                <Text style={styles.joinHint}>{opt.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 备注(可选) */}
        <Text style={styles.label}>备注(可选)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="例如:节奏快一点,自带球车"
          placeholderTextColor={colors.text.hint}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          maxLength={NOTE_MAX}
          textAlignVertical="top"
          accessibilityLabel="备注"
        />
        <Text style={styles.charCount}>{note.length}/{NOTE_MAX}</Text>

        {/* 错误 */}
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* 操作 */}
        <View style={styles.submitWrap}>
          <PrimaryButton
            label="发布"
            onPress={handleCreate}
            loading={saving}
            accessibilityHint="发布球局并进入详情页"
          />
          <View style={styles.cancelGap}>
            <SecondaryButton label="取消" onPress={() => navigation.goBack()} disabled={saving} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  pressed: { opacity: 0.6 },

  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
    letterSpacing: 0.2,
  },
  required: { color: colors.aka, fontWeight: '700' },
  hint: { fontSize: typography.xs, color: colors.text.hint, marginTop: spacing.xs },

  input: {
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    color: colors.text.primary,
    minHeight: 52,
  },
  textarea: { minHeight: 96, paddingTop: spacing.md },
  charCount: { fontSize: typography.xs, color: colors.text.hint, textAlign: 'right', marginTop: spacing.xs },

  // Course results
  resultsCard: { marginTop: spacing.sm, padding: 0, overflow: 'hidden' },
  resultRow: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  resultRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.usuzumi },
  resultName: { fontSize: typography.base, color: colors.text.primary, fontWeight: '500' },
  resultSub: { fontSize: typography.xs, color: colors.text.secondary, marginTop: 2 },

  // Selected course
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.shiro, borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  selectedMeta: { flex: 1 },
  selectedName: { fontSize: typography.base, color: colors.text.primary, fontWeight: '500' },
  selectedSub: { fontSize: typography.xs, color: colors.text.secondary, marginTop: 2 },
  clearBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.koke,
  },
  clearBtnText: { fontSize: typography.sm, color: colors.koke, fontWeight: '600' },

  // Segmented pills (slots / skill)
  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.shiro,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi,
  },
  segActive: { backgroundColor: '#F3F7F2', borderColor: colors.koke, borderWidth: 2 },
  segText: { fontSize: typography.sm, color: colors.text.secondary },
  segTextActive: { color: colors.koke, fontWeight: '600' },

  // Join mode cards
  joinRow: { flexDirection: 'row', gap: spacing.sm },
  joinCard: {
    flex: 1,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.shiro,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi,
  },
  joinCardActive: { backgroundColor: '#F3F7F2', borderColor: colors.koke, borderWidth: 2 },
  joinTitle: { fontSize: typography.sm, fontWeight: '600', color: colors.text.secondary },
  joinTitleActive: { color: colors.koke },
  joinHint: { fontSize: typography.xs, color: colors.text.hint, marginTop: 2 },

  // Error
  errorBox: {
    backgroundColor: colors.shiro, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.aka,
    padding: spacing.md, marginTop: spacing.base,
  },
  errorText: { color: colors.aka, fontSize: typography.sm },

  submitWrap: { marginTop: spacing.xl },
  cancelGap: { marginTop: spacing.sm },
});
