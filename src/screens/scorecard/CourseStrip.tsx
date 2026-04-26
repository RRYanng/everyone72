import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface Props {
  courseName: string;
  teeBox: string;
  totalHoles: number;
}

export function CourseStrip({ courseName, teeBox, totalHoles }: Props) {
  return (
    <View style={styles.strip}>
      <Text style={styles.name} numberOfLines={1}>{courseName}</Text>
      <Text style={styles.meta}>{teeBox} Tee · {totalHoles} Holes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  name: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});

export default CourseStrip;
