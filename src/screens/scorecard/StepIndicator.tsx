import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type Step = 1 | 2 | 3;

const LABELS: Record<Step, string> = {
  1: 'Strokes',
  2: 'Putts',
  3: 'Trouble',
};

export function StepIndicator({ step }: { step: Step }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Step ${step} of 3: ${LABELS[step]}`}
    >
      {[1, 2, 3].map(s => (
        <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
      ))}
      <Text style={styles.label}>Step {step} / 3 · {LABELS[step]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.usuzumi,
  },
  dotActive: { backgroundColor: colors.koke },
  label: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
});

export default StepIndicator;
