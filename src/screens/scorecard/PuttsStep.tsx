import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { NumberButton } from './NumberButton';

const PUTT_OPTIONS = [0, 1, 2, 3, 4] as const;

interface Props {
  holeNumber: number;
  strokes: number;
  value: number;
  onSelect: (n: number) => void;
  onBack: () => void;
}

export function PuttsStep({ holeNumber, strokes, value, onSelect, onBack }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`Hole ${holeNumber}, ${strokes} strokes. Select putt count.`}
    >
      <Text style={styles.question}>How many of those were putts?</Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {PUTT_OPTIONS.map(n => (
          <NumberButton
            key={n}
            label={n === 4 ? '4+' : String(n)}
            active={value === n}
            onPress={() => onSelect(n)}
            accessibilityLabel={`${n === 4 ? '4 or more' : n} putts`}
          />
        ))}
      </View>
      <Pressable
        onPress={onBack}
        accessibilityRole="link"
        accessibilityLabel={`Edit strokes, currently ${strokes}`}
        style={({ pressed }) => [styles.editLink, pressed && styles.pressed]}
      >
        <Text style={styles.editLinkText}>← Edit strokes ({strokes})</Text>
      </Pressable>
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
  editLink: { paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  editLinkText: {
    fontSize: typography.sm,
    color: colors.text.secondary,
  },
  pressed: { opacity: 0.6 },
});

export default PuttsStep;
