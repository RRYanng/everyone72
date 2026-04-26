import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Card, PrimaryButton, SecondaryButton } from '../../components';
import { Stat, StatDivider } from './Stat';

interface Props {
  visible: boolean;
  totalStrokes: number;
  totalPutts: number;
  scoreVsPar: number;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SubmitConfirmModal({
  visible, totalStrokes, totalPutts, scoreVsPar,
  saving, onConfirm, onCancel,
}: Props) {
  const vsParColor =
    scoreVsPar < 0 ? colors.koke
    : scoreVsPar > 0 ? colors.kincha
    : colors.text.primary;
  const vsParFormatted = scoreVsPar > 0 ? `+${scoreVsPar}` : `${scoreVsPar}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">Submit Round?</Text>
          <View style={styles.stats}>
            <Stat label="Total" value={totalStrokes} big />
            <StatDivider />
            <Stat label="vs Par" value={vsParFormatted} color={vsParColor} big />
            <StatDivider />
            <Stat label="Putts" value={totalPutts} big />
          </View>
          <Text style={styles.hint}>
            Your scorecard will be analyzed by the AI Coach.
          </Text>
          <PrimaryButton
            label="Save & Get AI Analysis"
            onPress={onConfirm}
            loading={saving}
            accessibilityHint="Submits the round and opens the AI analysis screen"
          />
          <View style={styles.cancelWrap}>
            <SecondaryButton label="Keep Editing" onPress={onCancel} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28,28,30,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  hint: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.sm * 1.5,
  },
  cancelWrap: { marginTop: spacing.sm },
});

export default SubmitConfirmModal;
