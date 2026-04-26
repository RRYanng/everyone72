import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface Props {
  label: string;
  value: string | number;
  /** 覆盖数字颜色（用于 vs Par 的 koke/kincha/aka 语义色） */
  color?: string;
  /** 大号模式（modal 里用） */
  big?: boolean;
}

export function Stat({ label, value, color, big }: Props) {
  return (
    <View style={styles.stat}>
      <Text
        style={[
          big ? styles.valueBig : styles.value,
          color ? { color } : null,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function StatDivider() {
  return <View style={styles.divider} accessible={false} />;
}

const styles = StyleSheet.create({
  stat: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  valueBig: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    letterSpacing: 0.4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.usuzumi,
  },
});

export default Stat;
