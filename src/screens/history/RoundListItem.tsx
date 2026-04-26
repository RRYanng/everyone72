import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Round } from '../../types';
import { Card, ScoreBadge } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';

interface Props {
  round: Round;
  onPress: (roundId: string) => void;
}

export function RoundListItem({ round, onPress }: Props) {
  const course = (round as any).courses;
  const courseName = course?.name ?? 'Unknown Course';
  const totalPar = course?.total_par ?? (round.total_strokes - round.score_vs_par);
  const dateStr = new Date(round.created_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <Pressable
      onPress={() => onPress(round.id)}
      accessibilityRole="button"
      accessibilityLabel={
        `${courseName}, ${dateStr}, ${round.total_strokes} strokes, ` +
        `${round.score_vs_par > 0 ? 'plus' : round.score_vs_par < 0 ? 'minus' : 'even'} ` +
        `${Math.abs(round.score_vs_par)} vs par, ${round.total_putts} putts`
      }
      accessibilityHint="Opens round analysis"
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text>
            {course?.city ? (
              <Text style={styles.location} numberOfLines={1}>
                {course.city}, {course.state}
              </Text>
            ) : null}
            <Text style={styles.date}>{dateStr} · {round.total_holes} holes</Text>
            {round.ai_feedback ? (
              <View style={styles.aiBadge} accessible={false}>
                <Ionicons name="analytics" size={10} color={colors.koke} />
                <Text style={styles.aiBadgeText}>AI Analysis</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.right}>
            <ScoreBadge
              strokes={round.total_strokes}
              par={totalPar}
              scale="round"
              variant="full"
            />
            <Text style={styles.putts}>{round.total_putts} putts</Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.text.hint}
            style={styles.chevron}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  pressed: { opacity: 0.6 },
  card: { padding: spacing.base },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: { flex: 1 },
  courseName: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  location: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  date: {
    fontSize: typography.xs,
    color: colors.text.hint,
    marginTop: spacing.xs,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.koke,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.koke,
    letterSpacing: 0.3,
  },
  right: {
    alignItems: 'center',
    marginLeft: spacing.md,
    gap: spacing.xs,
  },
  putts: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    marginLeft: spacing.sm,
    alignSelf: 'center',
  },
});

export default RoundListItem;
