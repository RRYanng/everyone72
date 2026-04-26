import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { ScoreBadge } from '../../components';

interface Props {
  holeNumber: number;
  par: number;
  strokes: number;
}

export function WizardHeader({ holeNumber, par, strokes }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBlock}>
        <Text style={styles.headline}>Hole {holeNumber}</Text>
        <Text style={styles.meta}>Par {par}</Text>
      </View>
      <ScoreBadge strokes={strokes} par={par} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  titleBlock: { flex: 1 },
  headline: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
});

export default WizardHeader;
