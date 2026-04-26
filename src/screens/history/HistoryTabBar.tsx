import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export type TabType = 'rounds' | 'diagnosis';

interface Props {
  active: TabType;
  onChange: (tab: TabType) => void;
}

export function HistoryTabBar({ active, onChange }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      <TabButton
        label="Rounds"
        active={active === 'rounds'}
        onPress={() => onChange('rounds')}
      />
      <TabButton
        label="My Diagnosis"
        active={active === 'diagnosis'}
        onPress={() => onChange('diagnosis')}
        badge="AI"
      />
    </View>
  );
}

function TabButton({
  label, active, onPress, badge,
}: { label: string; active: boolean; onPress: () => void; badge?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.tabInner}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>
          {label}
        </Text>
        {badge ? (
          <View style={styles.badge} accessible={false}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.washi,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
    paddingHorizontal: spacing.base,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.koke,
  },
  pressed: { opacity: 0.6 },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.hint,
    letterSpacing: 0.3,
  },
  tabTextActive: { color: colors.text.primary },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.koke,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.koke,
    letterSpacing: 0.5,
  },
});

export default HistoryTabBar;
