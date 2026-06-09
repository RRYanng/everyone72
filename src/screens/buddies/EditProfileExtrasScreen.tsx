// ============================================================
// 完善球友档案 —— 搭子/约局 v1(Phase 2 · Task 2.3)
// 字段:城市(必填) / 主场球场(可选) / 常打时段(多选) / 一句话简介(可选)
// 沿用日式极简设计系统,复用 ScreenHeader / Card / PrimaryButton / SecondaryButton。
// mount 时 getProfileExtras 预填;保存调 saveProfileExtras;城市为空禁用保存并提示。
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../hooks/useAuth';
import { getProfileExtras, saveProfileExtras } from '../../lib/profileExtras';
import { COURSES } from '../../data/courses';
import { Availability } from '../../types/buddies';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, PrimaryButton, SecondaryButton, LoadingSpinner } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const AVAILABILITY_OPTIONS: Availability[] = ['工作日早', '工作日晚', '周末早', '周末午'];
const COURSE_RESULT_LIMIT = 8;
const BIO_MAX = 120;

export default function EditProfileExtrasScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [city, setCity]               = useState('');
  const [homeCourseId, setHomeCourseId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bio, setBio]                 = useState('');

  const [courseQuery, setCourseQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // ── 预填已有档案 ───────────────────────────────────────────
  useEffect(() => {
    if (!user) { setInitialLoading(false); return; }
    let active = true;
    (async () => {
      const e = await getProfileExtras(user.id);
      if (active && e) {
        setCity(e.city ?? '');
        setHomeCourseId(e.home_course_id ?? null);
        setAvailability(e.availability ?? []);
        setBio(e.bio ?? '');
      }
      if (active) setInitialLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  // ── 主场球场搜索 ───────────────────────────────────────────
  const selectedCourse = homeCourseId
    ? COURSES.find(c => c.id === homeCourseId) ?? null
    : null;

  const q = courseQuery.trim().toLowerCase();
  const courseResults = q.length > 0
    ? COURSES.filter(c =>
        c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q),
      ).slice(0, COURSE_RESULT_LIMIT)
    : [];

  const toggleAvailability = (slot: Availability) => {
    setAvailability(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot],
    );
  };

  const cityFilled = city.trim().length > 0;

  // ── 保存 ───────────────────────────────────────────────────
  const handleSave = async () => {
    setError('');
    if (!cityFilled) { setError('城市为必填项。'); return; }
    if (!user) { setError('请先登录后再保存档案。'); return; }

    setSaving(true);
    const ok = await saveProfileExtras(user.id, {
      city: city.trim(),
      home_course_id: homeCourseId,
      availability: availability.length > 0 ? availability : null,
      bio: bio.trim().length > 0 ? bio.trim() : null,
    });
    setSaving(false);

    if (ok) {
      navigation.goBack();
    } else {
      setError('保存失败,请稍后重试。');
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="完善球友档案" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="完善球友档案" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          填好档案,更容易找到合得来的本地球搭子。城市是约局/看局的前提。
        </Text>

        {/* 城市(必填) */}
        <Text style={styles.label}>
          城市 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="例如:Irvine"
          placeholderTextColor={colors.text.hint}
          value={city}
          onChangeText={t => { setCity(t); setError(''); }}
          maxLength={40}
          accessibilityLabel="城市"
        />
        {!cityFilled ? (
          <Text style={styles.hint}>请填写城市后才能保存。</Text>
        ) : null}

        {/* 主场球场(可选) */}
        <Text style={styles.label}>主场球场(可选)</Text>
        {selectedCourse ? (
          <View style={styles.selectedRow}>
            <View style={styles.selectedMeta}>
              <Text style={styles.selectedName} numberOfLines={1}>{selectedCourse.name}</Text>
              <Text style={styles.selectedSub} numberOfLines={1}>
                {selectedCourse.city}, {selectedCourse.state}
              </Text>
            </View>
            <Pressable
              onPress={() => { setHomeCourseId(null); setCourseQuery(''); }}
              accessibilityRole="button"
              accessibilityLabel="清除主场球场"
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
              accessibilityLabel="搜索主场球场"
            />
            {courseResults.length > 0 ? (
              <Card style={styles.resultsCard}>
                {courseResults.map((c, idx) => (
                  <Pressable
                    key={c.id}
                    onPress={() => { setHomeCourseId(c.id); setCourseQuery(''); }}
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

        {/* 常打时段(多选) */}
        <Text style={styles.label}>常打时段(可多选)</Text>
        <View style={styles.tagRow} accessibilityRole="radiogroup">
          {AVAILABILITY_OPTIONS.map(slot => {
            const active = availability.includes(slot);
            return (
              <Pressable
                key={slot}
                onPress={() => toggleAvailability(slot)}
                accessibilityRole="checkbox"
                accessibilityLabel={slot}
                accessibilityState={{ checked: active }}
                style={({ pressed }) => [
                  styles.tag,
                  active && styles.tagActive,
                  pressed && !active && styles.pressed,
                ]}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>{slot}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* 一句话简介(可选) */}
        <Text style={styles.label}>一句话简介(可选)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="例如:周末爱打 18 洞,差点 15,求稳定球搭子"
          placeholderTextColor={colors.text.hint}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={BIO_MAX}
          textAlignVertical="top"
          accessibilityLabel="一句话简介"
        />
        <Text style={styles.charCount}>{bio.length}/{BIO_MAX}</Text>

        {/* 错误 */}
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* 操作 */}
        <View style={styles.submitWrap}>
          <PrimaryButton
            label="保存档案"
            onPress={handleSave}
            loading={saving}
            disabled={!cityFilled}
            accessibilityHint="保存球友档案并返回"
          />
          <View style={styles.cancelGap}>
            <SecondaryButton
              label="取消"
              onPress={() => navigation.goBack()}
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  pressed: { opacity: 0.6 },

  intro: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    lineHeight: typography.sm * 1.5,
    marginBottom: spacing.sm,
  },

  // Field labels
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
    letterSpacing: 0.2,
  },
  required: { color: colors.aka, fontWeight: '700' },
  hint: {
    fontSize: typography.xs,
    color: colors.text.hint,
    marginTop: spacing.xs,
  },

  // Inputs
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
  textarea: {
    minHeight: 96,
    paddingTop: spacing.md,
  },
  charCount: {
    fontSize: typography.xs,
    color: colors.text.hint,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Course search results
  resultsCard: {
    marginTop: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  resultRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  resultRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
  },
  resultName: {
    fontSize: typography.base,
    color: colors.text.primary,
    fontWeight: '500',
  },
  resultSub: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Selected course
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  selectedMeta: { flex: 1 },
  selectedName: {
    fontSize: typography.base,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectedSub: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.koke,
  },
  clearBtnText: {
    fontSize: typography.sm,
    color: colors.koke,
    fontWeight: '600',
  },

  // Availability tags
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.shiro,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
  },
  tagActive: {
    backgroundColor: '#F3F7F2',
    borderColor: colors.koke,
    borderWidth: 2,
  },
  tagText: {
    fontSize: typography.sm,
    color: colors.text.secondary,
  },
  tagTextActive: {
    color: colors.koke,
    fontWeight: '600',
  },

  // Error
  errorBox: {
    backgroundColor: colors.shiro,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.aka,
    padding: spacing.md,
    marginTop: spacing.base,
  },
  errorText: {
    color: colors.aka,
    fontSize: typography.sm,
  },

  submitWrap: { marginTop: spacing.xl },
  cancelGap: { marginTop: spacing.sm },
});
