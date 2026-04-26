import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  strokes: number;
  par: number;
  /** 'full' 显示杆数 + 文字标签；'compact' 仅显示杆数 */
  variant?: 'full' | 'compact';
  /** 'hole'：单洞语义（Eagle/Birdie/Par/Bogey）；'round'：整轮尺度（vs par 差值） */
  scale?: 'hole' | 'round';
  style?: StyleProp<ViewStyle>;
}

type Tone = { bg: string; fg: string; label: string };

function formatDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function holeTone(diff: number): Tone {
  if (diff <= -2) return { bg: colors.kincha, fg: colors.shiro, label: 'Eagle' };
  if (diff === -1) return { bg: colors.koke, fg: colors.shiro, label: 'Birdie' };
  if (diff === 0)  return { bg: colors.usuzumi, fg: colors.text.primary, label: 'Par' };
  if (diff === 1)  return { bg: colors.aka, fg: colors.shiro, label: 'Bogey' };
  return { bg: colors.aka, fg: colors.shiro, label: `+${diff}` };
}

function roundTone(diff: number): Tone {
  // 整轮阈值：与 HomeScreen 保持一致
  if (diff <= 0)  return { bg: colors.kincha, fg: colors.shiro,        label: formatDiff(diff) };
  if (diff <= 5)  return { bg: colors.koke,    fg: colors.shiro,        label: formatDiff(diff) };
  if (diff <= 10) return { bg: colors.usuzumi, fg: colors.text.primary, label: formatDiff(diff) };
  return { bg: colors.aka, fg: colors.shiro, label: formatDiff(diff) };
}

/**
 * 成绩徽章：颜色 + 文字双重编码。
 * 不依赖颜色区分（色盲/黑白打印/高对比模式仍可辨认）。
 */
export function ScoreBadge({ strokes, par, variant = 'full', scale = 'hole', style }: Props) {
  const diff = strokes - par;
  const tone = scale === 'round' ? roundTone(diff) : holeTone(diff);
  const a11y =
    scale === 'round'
      ? `${strokes} strokes, ${tone.label} vs par ${par}`
      : `${strokes} strokes, ${tone.label}, par ${par}`;

  return (
    <View
      style={[styles.base, { backgroundColor: tone.bg }, style]}
      accessible
      accessibilityLabel={a11y}
      accessibilityRole="text"
    >
      <Text style={[styles.strokes, { color: tone.fg }]}>{strokes}</Text>
      {variant === 'full' ? (
        <Text style={[styles.label, { color: tone.fg }]}>{tone.label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 56,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokes: {
    fontSize: typography.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: typography.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

export default ScoreBadge;
