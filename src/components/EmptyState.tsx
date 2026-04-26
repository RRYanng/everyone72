import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  title: string;
  description?: string;
  /** 装饰图标（例：<Ionicons name="leaf-outline" />）；建议无语义，仅视觉 */
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title, description, icon, actionLabel, onAction, style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {icon ? (
        <View
          style={styles.icon}
          accessible={false}
          importantForAccessibility="no"
        >
          {icon}
        </View>
      ) : null}
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  icon: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  desc: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.sm * 1.5,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    maxWidth: 280,
  },
});

export default EmptyState;
