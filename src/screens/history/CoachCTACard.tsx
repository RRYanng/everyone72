import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, PrimaryButton } from '../../components';
import { colors, spacing, typography } from '../../theme';

interface Props {
  onPress: () => void;
}

export function CoachCTACard({ onPress }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Want a coach to help you fix this?
      </Text>
      <Text style={styles.sub}>
        We'll match you with a local PGA instructor who specializes in exactly your weaknesses.
      </Text>
      <View style={styles.btnWrap}>
        <PrimaryButton
          label="Get matched with a local pro →"
          onPress={onPress}
          accessibilityHint="Opens the coach waitlist signup"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.koke,
  },
  title: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    lineHeight: typography.sm * 1.5,
    marginTop: spacing.sm,
  },
  btnWrap: {
    marginTop: spacing.base,
  },
});

export default CoachCTACard;
