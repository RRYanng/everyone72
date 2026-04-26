import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Round } from '../../types';
import { Card } from '../../components';
import { colors, spacing, typography } from '../../theme';

const SCREEN_W = Dimensions.get('window').width;

// theme hex → rgba 供 chart-kit 的 opacity callback 使用
const HIT = hexToRgb(colors.text.hint);   // 坐标轴 / 网格
const KIN = hexToRgb(colors.kincha);      // 折线 / 顶点描边

interface Props {
  /** 要显示的轮次（时间升序，最旧在前） */
  rounds: Round[];
  /** 用于计算第一条 label 的起始轮次号 */
  totalRoundsCount: number;
}

export function ScoreTrendCard({ rounds, totalRoundsCount }: Props) {
  if (rounds.length < 2) return null;

  const chartData = {
    labels: rounds.map((_, i) =>
      i === 0 || i === rounds.length - 1 || rounds.length <= 5
        ? `R${totalRoundsCount - rounds.length + i + 1}` : ''
    ),
    datasets: [{
      data: rounds.map(r => r.total_strokes),
      color: (opacity = 1) => `rgba(${KIN}, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  return (
    <Card
      style={styles.card}
      accessibilityLabel={`Score trend over last ${rounds.length} rounds`}
    >
      <Text style={styles.title} accessibilityRole="header">Score Trend</Text>
      <LineChart
        data={chartData}
        width={SCREEN_W - spacing.base * 2 - spacing.base * 2}
        height={160}
        chartConfig={{
          backgroundColor: colors.shiro,
          backgroundGradientFrom: colors.shiro,
          backgroundGradientTo: colors.shiro,
          backgroundGradientFromOpacity: 1,
          backgroundGradientToOpacity: 1,
          decimalPlaces: 0,
          color:      (opacity = 1) => `rgba(${HIT}, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(${HIT}, ${opacity})`,
          propsForBackgroundLines: { stroke: colors.usuzumi },
          propsForDots: { r: '4', strokeWidth: '2', stroke: colors.kincha },
          style: { borderRadius: 0 },
        }}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={true}
      />
      <Text style={styles.hint}>
        Last {rounds.length} rounds (oldest → newest)
      </Text>
    </Card>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  title: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: 0,
    marginLeft: -spacing.sm,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.text.hint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default ScoreTrendCard;
