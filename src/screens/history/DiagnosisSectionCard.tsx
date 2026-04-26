import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';

interface Props {
  icon: string;
  /** 强调色：用于左侧色条 + 标题颜色 */
  accent: string;
  title: string;
  content: string;
}

export function DiagnosisSectionCard({ icon, accent, title, content }: Props) {
  return (
    <Card
      style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 3 }]}
      accessibilityLabel={`${title}. ${content}`}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap} accessible={false}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <Text style={[styles.title, { color: accent }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <Text style={styles.content}>{content}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.usuzumi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: typography.base },
  title: {
    fontSize: typography.base,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    fontSize: typography.sm,
    color: colors.text.primary,
    lineHeight: typography.sm * 1.6,
  },
});

export default DiagnosisSectionCard;
