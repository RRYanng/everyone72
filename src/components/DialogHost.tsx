// 应用内对话框的显示层(网页端用;见 lib/dialog.ts)。挂在 App 根部一次即可。
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dialogQueue } from '../lib/dialog';
import type { DialogRequest } from '../lib/dialogQueue';
import { colors, radius, spacing, typography } from '../theme';

export default function DialogHost() {
  const [current, setCurrent] = useState<DialogRequest | null>(dialogQueue.current());

  useEffect(() => {
    const sync = () => setCurrent(dialogQueue.current());
    const unsubscribe = dialogQueue.subscribe(sync);
    sync();   // 挂载之前如果已经有排队的请求
    return unsubscribe;
  }, []);

  if (!current) return null;
  const cancelable = current.cancelLabel !== null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => dialogQueue.settle(false)}>
      <Pressable
        style={styles.backdrop}
        onPress={() => dialogQueue.settle(!cancelable)}
        accessibilityLabel="Dismiss dialog"
      >
        {/* 内层 Pressable 吃掉点击,避免点卡片本身也关闭 */}
        <Pressable style={styles.card} accessibilityRole="alert" onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={styles.buttons}>
            {cancelable ? (
              <Pressable
                onPress={() => dialogQueue.settle(false)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>{current.cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => dialogQueue.settle(true)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                current.destructive ? styles.destructive : styles.confirm,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.confirmText}>{current.confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,42,38,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: typography.lg, fontWeight: '700', color: colors.text.primary },
  message: { fontSize: typography.sm, color: colors.text.secondary, lineHeight: typography.sm * 1.5 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  button: {
    minWidth: 88,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancel: { backgroundColor: colors.washi, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi },
  cancelText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  confirm: { backgroundColor: colors.koke },
  destructive: { backgroundColor: colors.aka },
  confirmText: { color: colors.shiro, fontSize: typography.sm, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
