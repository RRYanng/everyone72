import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { BestScores, formatBestScores } from '../../lib/roundStats';

interface Props {
  roundsCount: number;
  avgScore: string | null;
  best: BestScores;
  handicap: number | null;
}

export function HistoryStatsBar({ roundsCount, avgScore, best, handicap }: Props) {
  const handicapStr =
    handicap !== null ? (handicap >= 0 ? `+${handicap}` : `${handicap}`) : '—';

  return (
    <View style={styles.wrap}>
      <Card
        style={styles.card}
        accessibilityLabel={
          `${roundsCount} rounds, average ${avgScore ?? 'unavailable'}, ` +
          `${formatBestScores(best)}, handicap ${handicapStr}`
        }
      >
        <View style={styles.row}>
          <Stat label="Rounds" value={roundsCount} />
          <Divider />
          <Stat label="Avg Score" value={avgScore ?? '—'} />
          <Divider />
          <Stat label="Handicap" value={handicapStr} />
        </View>
        <View style={styles.bestRow}>
          <Text style={styles.bestText}>{formatBestScores(best)}</Text>
        </View>
      </Card>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} accessible={false} />;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  card: { paddingVertical: spacing.base },
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: typography.xl,
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
  bestRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
    alignItems: 'center',
  },
  bestText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.usuzumi,
  },
});

export default HistoryStatsBar;
