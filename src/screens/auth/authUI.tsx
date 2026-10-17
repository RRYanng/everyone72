// ============================================================
// 登录 / 注册页共用的 Japandi 视觉外壳(风格来自 designbrief 的 japandi.md)。
//
// 只有视觉:这里没有任何认证逻辑,LoginScreen / RegisterScreen 的状态和提交函数保持原样。
//
// 要点(Japandi 三个不可省略的特征):
//   1. 暖色自然色板:沙、亚麻白、鼠尾草绿、陶土,中性色全部带暖色调,不用冷灰和纯白
//   2. 有手作感的不对称:有机形状(圆角各不相同)、宽屏左右不对称布局、文字左对齐
//   3. 极度克制又有温度:留白大、衬线轻字重标题、几乎没有阴影和边框
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { colors, fontFamily, radius, spacing, typography } from '../../theme';

// 插画用色:鼠尾草绿的三个深浅(只在这张插画里用)
const SAGE_LIGHT = '#CBD5C0';
const SAGE_MID   = '#AFC0A4';
const SAGE_DEEP  = '#8FA389';
const CLAY_SUN   = '#C4826E';
const WIDE_BREAKPOINT = 860;

// ── 插画:远山、晨光、旗杆和几块石头 ────────────────────────────
function CourseArt({ height, variant }: { height: number | string; variant: 'panel' | 'band' }) {
  // 宽屏左侧面板:整幅贴底;窄屏顶部横条:裁出晨光 + 山丘这一段,保证太阳不被裁掉
  const viewBox = variant === 'band' ? '0 24 400 300' : '0 0 400 420';
  const align = variant === 'band' ? 'xMidYMid slice' : 'xMidYMax slice';
  return (
    <Svg width="100%" height={height as number} viewBox={viewBox} preserveAspectRatio={align}>
      {/* 晨光(不是正圆:wabi-sabi) */}
      <Ellipse cx={268} cy={140} rx={58} ry={55} fill={CLAY_SUN} opacity={0.82} />
      <Ellipse cx={268} cy={140} rx={74} ry={71} fill={CLAY_SUN} opacity={0.12} />
      {/* 三层山丘 */}
      <Path d="M 0 250 C 70 205, 150 215, 215 238 C 285 262, 345 228, 400 214 L 400 420 L 0 420 Z" fill={SAGE_LIGHT} />
      <Path d="M 0 305 C 80 270, 160 292, 235 300 C 305 308, 355 286, 400 276 L 400 420 L 0 420 Z" fill={SAGE_MID} />
      <Path d="M 0 360 C 90 335, 190 352, 270 358 C 335 363, 372 350, 400 344 L 400 420 L 0 420 Z" fill={SAGE_DEEP} />
      {/* 旗杆和旗(细线) */}
      <Line x1={118} y1={352} x2={118} y2={268} stroke={colors.charcoal} strokeWidth={1.2} opacity={0.7} />
      <Path d="M 118 268 L 146 276 L 118 285 Z" fill={colors.clay} opacity={0.85} />
      {/* 石头 */}
      <Ellipse cx={288} cy={392} rx={22} ry={8} fill={colors.stone} opacity={0.9} />
      <Ellipse cx={318} cy={398} rx={11} ry={5} fill={colors.stone} opacity={0.75} />
      <Ellipse cx={60}  cy={396} rx={14} ry={6} fill={colors.stone} opacity={0.7} />
      {/* 一颗球 */}
      <Circle cx={170} cy={386} r={5} fill={colors.linen} opacity={0.95} />
    </Svg>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.wordmarkRow} accessible accessibilityRole="header" accessibilityLabel="Everyone 72">
      <View style={styles.wordmarkDot} />
      <Text style={[styles.wordmark, light && styles.wordmarkOnArt]}>Everyone 72</Text>
    </View>
  );
}

// ── 外壳 ──────────────────────────────────────────────────────
interface ShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: ShellProps) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  // 安静的淡入(400ms+),不弹跳
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [fade]);
  const enter = {
    opacity: fade,
    transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  const body = (
    <Animated.View style={[styles.column, enter]}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.formGap}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Animated.View>
  );

  if (wide) {
    return (
      <View style={styles.wideRoot}>
        <View style={styles.artPanel}>
          <View style={styles.artPanelHead}>
            <Wordmark />
            <Text style={styles.artQuote}>Every round, quietly remembered.</Text>
          </View>
          <View style={styles.artPanelArt} pointerEvents="none" accessible={false}>
            <CourseArt height="100%" variant="panel" />
          </View>
        </View>
        {/* RN-web 的 ScrollView 不认自己 style 里的 flex 比例,所以外面套一层 View 来分栏 */}
        <View style={styles.formPanel}>
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formPanelContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.narrowRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.narrowContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.band} accessible={false}>
          <View style={styles.bandArt} pointerEvents="none"><CourseArt height="100%" variant="band" /></View>
          <View style={styles.bandHead}><Wordmark /></View>
        </View>
        {body}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── 表单元件 ──────────────────────────────────────────────────
export function AuthField({
  label, trailing, ...input
}: { label: string; trailing?: React.ReactNode } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text.hint}
          accessibilityLabel={label}
          {...input}
        />
        {trailing}
      </View>
    </View>
  );
}

export function AuthNotice({ message }: { message: string }) {
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

export function AuthButton({
  label, onPress, loading, accessibilityLabel, style,
}: {
  label: string; onPress: () => void; loading?: boolean;
  accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!loading, busy: !!loading }}
      style={({ pressed }) => [styles.button, loading && styles.buttonBusy, pressed && !loading && styles.pressed, style]}
    >
      {loading ? <ActivityIndicator color={colors.linen} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function AuthLink({
  lead, action, onPress, accessibilityLabel,
}: { lead: string; action: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.linkText}>
        {lead} <Text style={styles.linkAction}>{action}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthLegal({ onPrivacy, onTerms }: { onPrivacy: () => void; onTerms: () => void }) {
  return (
    <View style={styles.legalRow}>
      <Pressable onPress={onPrivacy} accessibilityRole="link" style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.legalText}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.legalText}>·</Text>
      <Pressable onPress={onTerms} accessibilityRole="link" style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.legalText}>Terms of Service</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 宽屏:左窄右宽的不对称分栏
  wideRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.washi },
  artPanel: {
    flex: 5,
    backgroundColor: colors.sand,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
    overflow: 'hidden',
  },
  artPanelHead: { gap: spacing.md, zIndex: 1 },
  artPanelArt: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '22%' },
  artQuote: {
    fontFamily: fontFamily.displayItalic, fontSize: typography.xl, color: colors.inkSoft,
    letterSpacing: 0.2, lineHeight: typography.xl * 1.35, maxWidth: 300,
  },
  formPanel: { flex: 6, backgroundColor: colors.washi },
  formScroll: { flex: 1 },
  formPanelContent: {
    flexGrow: 1, justifyContent: 'center',
    paddingVertical: spacing['3xl'], paddingLeft: '11%', paddingRight: spacing['2xl'],
  },

  // 窄屏:上方一条插画带,下面是表单
  narrowRoot: { flex: 1, backgroundColor: colors.washi },
  narrowContent: { flexGrow: 1, paddingBottom: spacing['2xl'] },
  band: {
    height: 232,
    backgroundColor: colors.sand,
    borderBottomLeftRadius: 56,
    borderBottomRightRadius: 20,       // 左右圆角不同:手作感
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  bandArt: { ...StyleSheet.absoluteFillObject },
  bandHead: { paddingTop: spacing.xl, paddingHorizontal: spacing.lg },

  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmarkDot: { width: 9, height: 8, borderRadius: 5, backgroundColor: colors.clay },
  wordmark: { fontFamily: fontFamily.display, fontSize: typography.xl, color: colors.charcoal, letterSpacing: 0.8 },
  wordmarkOnArt: { color: colors.charcoal },

  column: { width: '100%', maxWidth: 400, paddingHorizontal: spacing.lg, alignSelf: 'flex-start' },
  title: {
    // Cormorant 的字面偏小,同样视觉大小要比 Georgia 大一号;轻字重靠大字号保证可读
    fontFamily: fontFamily.displayLight, fontSize: typography['3xl'] + 2,
    color: colors.charcoal, letterSpacing: 0.3, lineHeight: (typography['3xl'] + 2) * 1.1,
  },
  subtitle: {
    fontSize: typography.base, color: colors.inkSoft, lineHeight: typography.base * 1.7,
    marginTop: spacing.md, marginBottom: spacing.xl,
  },
  formGap: { gap: spacing.lg },
  footer: { marginTop: spacing.xl, gap: spacing.lg },

  field: { gap: spacing.xs + 2 },
  label: { fontSize: typography.xs, color: colors.inkSoft, letterSpacing: 0.4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.linen,
    borderRadius: radius.md + 2,
    borderWidth: 1, borderColor: colors.stone,
    paddingHorizontal: spacing.base,
  },
  input: {
    flex: 1, paddingVertical: spacing.md + 2, fontSize: typography.base, color: colors.charcoal,
    // react-native-web 默认的聚焦描边是冷色的;去掉,靠边框颜色表达聚焦
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },

  notice: {
    backgroundColor: colors.clayTint, borderRadius: radius.sm + 2,
    borderLeftWidth: 3, borderLeftColor: colors.clay,
    paddingVertical: spacing.md, paddingHorizontal: spacing.base,
  },
  noticeText: { color: colors.charcoal, fontSize: typography.sm, lineHeight: typography.sm * 1.6 },

  button: {
    backgroundColor: colors.charcoal, borderRadius: radius.sm + 2,   // 8px
    paddingVertical: spacing.md + 3, paddingHorizontal: spacing.xl,
    alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: spacing.xs,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: colors.linen, fontSize: typography.base, fontWeight: '500', letterSpacing: 0.3 },
  pressed: { opacity: 0.8 },

  link: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  linkText: { color: colors.inkSoft, fontSize: typography.sm },
  linkAction: { color: colors.clay, fontWeight: '600' },

  legalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legalText: { color: colors.inkSoft, fontSize: typography.xs },
});
