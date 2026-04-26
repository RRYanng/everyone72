import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { NumberButton } from './NumberButton';

const STROKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

interface Props {
  holeNumber: number;
  par: number;
  value: number;
  onSelect: (n: number) => void;
}

export function StrokesStep({ holeNumber, par, value, onSelect }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`Hole ${holeNumber}, par ${par}. Select stroke count.`}
    >
      <Text style={styles.question}>How many strokes?</Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {STROKE_OPTIONS.map(n => (
          <NumberButton
            key={n}
            label={n === 8 ? '8+' : String(n)}
            active={value === n}
            onPress={() => onSelect(n)}
            accessibilityLabel={`${n === 8 ? '8 or more' : n} strokes`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  question: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});

export default StrokesStep;
