import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { HoleScore } from '../../types';

interface Props {
  scores: HoleScore[];
  currentHole: number;
  onJumpTo: (idx: number) => void;
}

function scoreColor(strokes: number, par: number): string {
  const d = strokes - par;
  if (d <= -1) return colors.koke;
  if (d === 0) return colors.text.secondary;
  if (d === 1) return colors.kincha;
  return colors.aka;
}

export function MiniScorecardStrip({ scores, currentHole, onJumpTo }: Props) {
  return (
    <View style={styles.strip}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {scores.map((s, idx) => {
          const active = currentHole === idx;
          const hasTrouble = (s.troubles ?? []).length > 0;
          return (
            <Pressable
              key={idx}
              onPress={() => onJumpTo(idx)}
              accessibilityRole="button"
              accessibilityLabel={
                `Hole ${s.hole_number}, par ${s.par}, ${s.strokes} strokes` +
                (hasTrouble ? ', trouble logged' : '')
              }
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.cell,
                active && styles.cellActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.num, active && styles.numActive]}>{s.hole_number}</Text>
              <Text style={styles.par}>P{s.par}</Text>
              <Text style={[styles.score, { color: scoreColor(s.strokes, s.par) }]}>
                {s.strokes}
              </Text>
              {hasTrouble
                ? <View style={styles.troubleDot} accessible={false} />
                : <View style={styles.placeholder} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
    backgroundColor: colors.shiro,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cell: {
    width: 48,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  cellActive: {
    backgroundColor: colors.washi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.koke,
  },
  num: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  numActive: { color: colors.koke },
  par: { fontSize: 10, color: colors.text.hint, marginTop: 1 },
  score: {
    fontSize: typography.base,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  troubleDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.kincha,
    marginTop: 3,
  },
  placeholder: { width: 4, height: 4, marginTop: 3 },
  pressed: { opacity: 0.6 },
});

export default MiniScorecardStrip;
