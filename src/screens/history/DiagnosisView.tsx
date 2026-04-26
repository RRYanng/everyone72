// Diagnosis Tab 内容：loading / error / report 三态
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiagnosisReport } from '../../lib/claude';
import { Card, LoadingSpinner, PrimaryButton, SecondaryButton } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { DiagnosisSectionCard } from './DiagnosisSectionCard';
import { CoachCTACard } from './CoachCTACard';

interface Props {
  report: DiagnosisReport | null;
  loading: boolean;
  error: string;
  roundsAnalyzed: number;
  onRetry: () => void;
  onCoachCTA: () => void;
}

export function DiagnosisView({
  report, loading, error, roundsAnalyzed, onRetry, onCoachCTA,
}: Props) {
  if (loading) {
    return (
      <View style={styles.stateBox} accessible accessibilityLabel="Analyzing your game" accessibilityState={{ busy: true }}>
        <LoadingSpinner size="large" />
        <Text style={styles.stateTitle}>Analyzing your game…</Text>
        <Text style={styles.stateSub}>
          Claude is reviewing your last {roundsAnalyzed} rounds of data
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateBox} accessible accessibilityLiveRegion="polite">
        <Text style={styles.errorEmoji} accessible={false}>⚠</Text>
        <Text style={styles.stateSub}>{error}</Text>
        <View style={styles.retryWrap}>
          <SecondaryButton
            label="Try Again"
            onPress={onRetry}
            accessibilityHint="Retries the diagnosis generation"
          />
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.stateBox} accessible accessibilityLabel="Preparing diagnosis" accessibilityState={{ busy: true }}>
        <LoadingSpinner size="large" />
        <Text style={styles.stateTitle}>Preparing diagnosis…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner */}
      <Card style={styles.banner}>
        <Text style={styles.bannerIcon} accessible={false}>🏥</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle} accessibilityRole="header">
            Your Golf Diagnosis
          </Text>
          <Text style={styles.bannerSub}>
            Based on your last {roundsAnalyzed} rounds · AI-powered analysis
          </Text>
        </View>
      </Card>

      {report.coreIssue ? (
        <DiagnosisSectionCard
          icon="🎯"
          accent={colors.aka}
          title="Core Issue"
          content={report.coreIssue}
        />
      ) : null}
      {report.dataEvidence ? (
        <DiagnosisSectionCard
          icon="📊"
          accent={colors.koke}
          title="Data Evidence"
          content={report.dataEvidence}
        />
      ) : null}
      {report.rootCause ? (
        <DiagnosisSectionCard
          icon="🔬"
          accent={colors.kincha}
          title="Root Cause Hypothesis"
          content={report.rootCause}
        />
      ) : null}
      {report.practicePlan ? (
        <DiagnosisSectionCard
          icon="🏋️"
          accent={colors.koke}
          title="Specific Practice Plan"
          content={report.practicePlan}
        />
      ) : null}

      <CoachCTACard onPress={onCoachCTA} />

      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Regenerate diagnosis"
        accessibilityHint="Re-runs the AI analysis over your recent rounds"
        style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
      >
        <Ionicons name="refresh" size={14} color={colors.text.secondary} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={styles.refreshText}>Regenerate diagnosis</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        AI analysis is for practice guidance only. Not a substitute for professional coaching.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  stateTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  stateSub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.sm * 1.5,
  },
  errorEmoji: {
    fontSize: typography['2xl'],
    color: colors.aka,
  },
  retryWrap: {
    marginTop: spacing.sm,
    minWidth: 180,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.koke,
  },
  bannerIcon: { fontSize: typography.xl },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.text.primary,
  },
  bannerSub: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  refreshText: {
    fontSize: typography.xs,
    color: colors.text.secondary,
  },
  pressed: { opacity: 0.6 },

  disclaimer: {
    fontSize: typography.xs,
    color: colors.text.hint,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: typography.xs * 1.6,
    marginBottom: spacing.sm,
  },
});

export default DiagnosisView;
