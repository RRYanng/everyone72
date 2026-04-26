import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  /** 左侧图标：建议传入 <Ionicons /> 或 emoji 文本 */
  leftIcon?: React.ReactNode;
  onPress?: () => void;
  /** 默认显示右箭头；若为 link/switch 等可关闭 */
  showArrow?: boolean;
  /** 末项可传 false 移除分割线 */
  divider?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title, subtitle, leftIcon, onPress,
  showArrow = true, divider = true,
  accessibilityHint, style,
}: Props) {
  const pressable = !!onPress;
  const a11yLabel = subtitle ? `${title}. ${subtitle}` : title;

  const content = (
    <View style={[styles.row, divider && styles.divider, style]}>
      {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
      <View style={styles.textArea}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {showArrow && pressable ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.text.hint}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </View>
  );

  if (!pressable) {
    return <View accessible accessibilityLabel={a11yLabel}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    backgroundColor: colors.shiro,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
  },
  leftIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textArea: { flex: 1 },
  title: {
    fontSize: typography.base,
    color: colors.text.primary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  pressed: { backgroundColor: colors.washi },
});

export default ListItem;
