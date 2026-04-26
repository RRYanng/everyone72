// Everyone72 设计 Token
// 日式极简 (Ma) × 精准运动感 × 编辑式留白
// 禁止在业务代码里写内联 hex；所有视觉常量一律从这里取值。

import { Platform } from 'react-native';

export const colors = {
  sumi: '#2C2A26',        // 墨色（warm-black）：主文字 / 图标
  washi: '#F5F0E8',       // 和纸（warm cream）：页面背景
  koke: '#7A9E7A',        // 苔色：品牌 / CTA / 成功
  kokeTint: '#D8E8D0',    // 苔色 · 浅：装饰有机形状 / 图片占位
  kokeLight: '#A8C8A0',   // 苔色 · 中：SVG 植物装饰线条
  kincha: '#C9A84C',      // 金茶：高亮 / 强调 / eagle
  usuzumi: '#E2DDD6',     // 薄墨（warm hairline）：边框 / 分割线
  aka: '#E05C48',         // 赤：错误 / bogey / double+
  shiro: '#FFFFFF',       // 白：卡片背景
  pill: '#EEE8DF',        // 浅米 pill 背景（review/tag 标签）
  sumiDivider: '#3C3A36', // 深色 footer 上的分割线
  text: {
    primary: '#2C2A26',
    secondary: '#7A7670',
    hint: '#A8A49E',      // 节标签 / disclaimer
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 52,  // editorial hero title
  '5xl': 64,  // display stat
} as const;

export const fontFamily = {
  /** Editorial serif — hero titles, big quotes */
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, serif',
  }) as string,
} as const;

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export const theme = { colors, spacing, radius, typography, fontFamily, animation };
export default theme;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
