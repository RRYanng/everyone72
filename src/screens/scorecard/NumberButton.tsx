import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function NumberButton({ label, active, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, checked: active }}
      style={({ pressed }) => [
        styles.base,
        active && styles.active,
        pressed && !active && styles.pressed,
      ]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 64,
    height: 64,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.washi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.koke,
    borderColor: colors.koke,
  },
  pressed: { opacity: 0.6 },
  text: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  textActive: { color: colors.shiro },
});

export default NumberButton;
