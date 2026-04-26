import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PrimaryButton } from '../../components';

const TROUBLES = [
  { key: 'water',  emoji: '💧', label: 'Water'  },
  { key: 'ob',     emoji: '🚫', label: 'OB'     },
  { key: 'bunker', emoji: '🏖️', label: 'Bunker' },
  { key: 'rough',  emoji: '🌿', label: 'Rough'  },
  { key: 'other',  emoji: '⛰️', label: 'Other'  },
] as const;

interface Props {
  holeNumber: number;
  putts: number;
  selected: string[];
  onToggle: (k: string) => void;
  onBack: () => void;
  onAdvance: () => void;
  isLast: boolean;
  saving: boolean;
  error: string;
}

export function TroubleStep({
  holeNumber, putts, selected, onToggle,
  onBack, onAdvance, isLast, saving, error,
}: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`Hole ${holeNumber}. Tag any trouble encountered.`}
    >
      <Text style={styles.question}>Any trouble on this hole?</Text>
      <View style={styles.grid}>
        {TROUBLES.map(t => {
          const active = selected.includes(t.key);
          return (
            <Pressable
              key={t.key}
              onPress={() => onToggle(t.key)}
              accessibilityRole="checkbox"
              accessibilityLabel={t.label}
              accessibilityState={{ checked: active }}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emoji} accessible={false}>{t.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onBack}
        accessibilityRole="link"
        accessibilityLabel={`Edit putts, currently ${putts}`}
        style={({ pressed }) => [styles.editLink, pressed && styles.pressed]}
      >
        <Text style={styles.editLinkText}>← Edit putts ({putts})</Text>
      </Pressable>

      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          ⚠ {error}
        </Text>
      ) : null}

      <View style={styles.advanceWrap}>
        <PrimaryButton
          label={isLast ? 'Finish Round' : 'Next Hole →'}
          onPress={onAdvance}
          loading={saving}
          accessibilityHint={
            isLast
              ? 'Opens review modal to submit the round'
              : 'Saves this hole and moves to the next'
          }
        />
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.washi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
  },
  chipActive: {
    backgroundColor: colors.koke,
    borderColor: colors.koke,
  },
  emoji: { fontSize: typography.base },
  chipLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  chipLabelActive: { color: colors.shiro },
  editLink: { paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  editLinkText: {
    fontSize: typography.sm,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.aka,
    marginVertical: spacing.sm,
    textAlign: 'center',
  },
  advanceWrap: { marginTop: spacing.md },
  pressed: { opacity: 0.6 },
});

export default TroubleStep;
