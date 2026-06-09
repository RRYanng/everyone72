// ============================================================
// 创建 Crew — Golf Journal 设计语言
// 名称 + Ionicon + 描述
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isDevMockActive } from '../../lib/mockUser';
import { PrimaryButton, ScreenHeader } from '../../components';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';
import { CrewIcon } from './CrewIcon';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// 20 outline 图标，覆盖运动 / 成就 / 自然 / 几何
const ICON_OPTIONS: IconName[] = [
  'golf-outline',       'trophy-outline',     'flame-outline',     'flash-outline',
  'star-outline',       'medal-outline',      'ribbon-outline',    'locate-outline',
  'barbell-outline',    'people-outline',     'compass-outline',   'sparkles-outline',
  'trending-up-outline','rocket-outline',     'leaf-outline',      'shield-outline',
  'school-outline',     'map-outline',        'sunny-outline',     'heart-outline',
];

const DEFAULT_ICON: IconName = 'golf-outline';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function CreateCrewScreen() {
  const navigation = useNavigation<NavProp>();
  const { user }   = useAuth();

  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [icon, setIcon]       = useState<IconName>(DEFAULT_ICON);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter a crew name.'); return; }
    if (name.trim().length > 40) { setError('Crew name must be 40 characters or less.'); return; }

    setLoading(true);

    // DEV mock: 跳过 Supabase（mock user 不存在于真实 auth 表，FK 约束会失败）
    if (isDevMockActive()) {
      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
      navigation.replace('CrewDetail', { crewId: `mock-crew-${Date.now()}` });
      return;
    }

    if (!user) {
      setError('You must be signed in to create a crew.');
      setLoading(false);
      return;
    }

    // 生成唯一邀请码（碰撞重试）
    let inviteCode = generateInviteCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const { data: existing } = await supabase
        .from('crews')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    // 创建 crew
    const { data: crew, error: crewErr } = await supabase
      .from('crews')
      .insert({
        name:        name.trim(),
        description: desc.trim(),
        emoji:       icon,                // 存 Ionicon 名（CrewIcon 兼容渲染）
        creator_id:  user.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (crewErr || !crew) {
      // 真实错误日志，方便 debug RLS / schema 问题
      console.error('[CreateCrew] insert error:', crewErr);
      setError(crewErr?.message ?? 'Failed to create crew. Please try again.');
      setLoading(false);
      return;
    }

    // Add creator as owner member
    const { error: memberErr } = await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: user.id, role: 'owner' });
    if (memberErr) console.error('[CreateCrew] member insert error:', memberErr);

    setLoading(false);
    navigation.replace('CrewDetail', { crewId: crew.id });
  };

  const charCount = name.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Create a Crew" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon picker */}
        <Text style={styles.label}>Choose an icon</Text>
        <View style={styles.iconGrid} accessibilityRole="radiogroup">
          {ICON_OPTIONS.map(name => {
            const active = icon === name;
            return (
              <Pressable
                key={name}
                onPress={() => setIcon(name)}
                accessibilityRole="radio"
                accessibilityLabel={name.replace('-outline', '').replace('-', ' ')}
                accessibilityState={{ selected: active, checked: active }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  active && styles.iconBtnActive,
                  pressed && !active && styles.pressed,
                ]}
              >
                <Ionicons
                  name={name}
                  size={20}
                  color={active ? colors.koke : colors.text.secondary}
                  accessible={false}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Name */}
        <Text style={styles.label}>
          Crew Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Weekend Warriors"
          placeholderTextColor={colors.text.hint}
          value={name}
          onChangeText={t => { setName(t); setError(''); }}
          maxLength={40}
          accessibilityLabel="Crew name"
        />
        <Text style={styles.charCount}>{charCount}/40</Text>

        {/* Description */}
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="What's this crew about?"
          placeholderTextColor={colors.text.hint}
          value={desc}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          maxLength={120}
          accessibilityLabel="Crew description"
          textAlignVertical="top"
        />

        {/* Preview */}
        <View style={styles.preview} accessible accessibilityLabel={`Preview: ${name || 'My Crew'}, with ${icon.replace('-outline', '')} icon`}>
          <View style={styles.previewIconWrap}>
            <CrewIcon value={icon} size={28} color={colors.koke} />
          </View>
          <View style={styles.previewMeta}>
            <Text style={styles.previewName} numberOfLines={1}>{name || 'My Crew'}</Text>
            <Text style={styles.previewSub}>1/8 members · Invite code generated on create</Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <View style={styles.submitWrap}>
          <PrimaryButton
            label="Create Crew"
            onPress={handleCreate}
            loading={loading}
            accessibilityHint="Creates the crew and opens its detail page"
          />
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

  // Icon picker grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.shiro,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: colors.koke,
    borderWidth: 2,
    backgroundColor: '#F3F7F2',
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

  // Preview card
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    padding: spacing.base,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  previewIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.kokeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMeta: { flex: 1 },
  previewName: {
    fontSize: typography.base,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
  },
  previewSub: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
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
});
