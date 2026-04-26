import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, LoadingSpinner } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { TroubleStats } from '../../types';

interface Props {
  stats: TroubleStats;
  insight: string;
  loadingInsight: boolean;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function TroubleInsightsCard({ stats, insight, loadingInsight }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = ([
    { icon: 'water-outline',        label: 'Water',  count: stats.water },
    { icon: 'close-circle-outline', label: 'OB',     count: stats.ob },
    { icon: 'ellipse-outline',      label: 'Bunker', count: stats.bunker },
    { icon: 'leaf-outline',         label: 'Rough',  count: stats.rough },
  ] as { icon: IconName; label: string; count: number }[]).filter(i => i.count > 0);

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => setExpanded(e => !e)}
        accessibilityRole="button"
        accessibilityLabel={`Trouble insights, last ${stats.totalRounds} rounds`}
        accessibilityHint={expanded ? 'Collapse details' : 'Expand details'}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <Text style={styles.headerIcon} accessible={false}>🔍</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Trouble Insights</Text>
          <Text style={styles.sub}>
            Last {stats.totalRounds} rounds · tap to {expanded ? 'collapse' : 'expand'}
          </Text>
        </View>
        <Text style={styles.chevron} accessible={false}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.statsRow}>
            {items.map(item => (
              <View key={item.label} style={styles.statItem} accessible
                accessibilityLabel={`${item.count} ${item.label.toLowerCase()} incidents`}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={colors.text.secondary}
                  accessible={false}
                />
                <Text style={styles.statCount}>{item.count}×</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.parRow}>
            <ParCell label="Par 3" value={stats.byPar.par3} />
            <ParCell label="Par 4" value={stats.byPar.par4} />
            <ParCell label="Par 5" value={stats.byPar.par5} />
          </View>

          <View style={styles.aiBox}>
            <Text style={styles.aiTitle} accessibilityRole="header">
              AI Strategy Advice
            </Text>
            {loadingInsight ? (
              <View style={styles.aiLoading}>
                <LoadingSpinner size="small" />
              </View>
            ) : (
              <Text style={styles.aiText}>{insight || 'No data yet.'}</Text>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}

function ParCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.parCell} accessible
      accessibilityLabel={`${label}: ${value} incidents`}
    >
      <Text style={styles.parLabel}>{label}</Text>
      <Text style={styles.parValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  headerIcon: { fontSize: typography.lg },
  headerText: { flex: 1 },
  title: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sub: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: typography.xs,
    color: colors.text.hint,
  },

  body: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
    paddingTop: spacing.base,
  },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.base,
  },
  statItem: { alignItems: 'center', gap: spacing.xs },
  statCount: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.aka,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.text.secondary,
  },

  parRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  parCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    borderRadius: radius.sm,
  },
  parLabel: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  parValue: {
    fontSize: typography.base,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  aiBox: {
    backgroundColor: colors.washi,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.koke,
  },
  aiTitle: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.koke,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  aiText: {
    fontSize: typography.sm,
    color: colors.text.primary,
    lineHeight: typography.sm * 1.6,
  },
  aiLoading: {
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
});

export default TroubleInsightsCard;
