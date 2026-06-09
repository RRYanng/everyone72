// 共享渲染：crew.emoji 字段可能是 Ionicon 名（"trophy-outline"）
// 或传统 emoji 字符（"⛳"）。本组件兼容两种。
import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface Props {
  value: string | null | undefined;
  size?: number;
  color?: string;
  textStyle?: StyleProp<TextStyle>;
}

/** 检测字符串是否符合 Ionicon 名称格式（kebab-case ASCII） */
export function isIconName(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^[a-z][a-z0-9-]*$/.test(s);
}

export function CrewIcon({ value, size = 24, color, textStyle }: Props) {
  if (isIconName(value)) {
    return (
      <Ionicons
        name={value as React.ComponentProps<typeof Ionicons>['name']}
        size={size}
        color={color ?? colors.koke}
      />
    );
  }
  return (
    <Text style={[{ fontSize: size }, textStyle]} accessible={false}>
      {value ?? ''}
    </Text>
  );
}

export default CrewIcon;
