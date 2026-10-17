// ============================================================
// 全局 ErrorBoundary:渲染期出错时显示可恢复的界面,而不是白屏。
// 同时把错误上报到监控(见 lib/monitoring.ts)。
// 兜底界面刻意不依赖导航、Auth 或任何自定义组件 —— 它们本身可能就是出错的原因。
// ============================================================
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureError } from '../lib/monitoring';
import { colors, radius, spacing, typography } from '../theme';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, { componentStack: info.componentStack });
  }

  private reset = () => this.setState({ error: null });

  private reload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
    else this.reset();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.wrap} accessibilityRole="alert">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Everyone 72 hit an unexpected problem. Your saved rounds are safe — try again, and if it keeps
          happening, reload the app.
        </Text>
        {__DEV__ ? <Text style={styles.detail}>{String(error.message)}</Text> : null}
        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
        {Platform.OS === 'web' ? (
          <Pressable
            onPress={this.reload}
            accessibilityRole="button"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Reload the app</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.washi,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  body: {
    fontSize: typography.base, color: colors.text.secondary,
    textAlign: 'center', lineHeight: typography.base * 1.5, maxWidth: 420,
  },
  detail: { fontSize: typography.xs, color: colors.aka, textAlign: 'center', maxWidth: 420 },
  button: {
    backgroundColor: colors.koke, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  buttonText: { color: colors.shiro, fontSize: typography.base, fontWeight: '600' },
  link: { padding: spacing.sm },
  linkText: { color: colors.koke, fontSize: typography.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
