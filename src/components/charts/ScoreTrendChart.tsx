import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface Props { width?: number; }

export default function ScoreTrendChart({ width }: Props) {
  const chartWidth = width ?? Dimensions.get('window').width - 48;
  const scores = [90, 95, 94, 88, 92];
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Score Trend</Text>
      <Text style={styles.insight}>Best round: Oak Creek (88) · Avg: {avg}</Text>
      <LineChart
        data={{
          labels: ['Mar 8', 'Mar 15', 'Mar 22', 'Mar 29', 'Apr 5'],
          datasets: [{ data: scores }],
        }}
        width={chartWidth}
        height={180}
        chartConfig={{
          backgroundGradientFrom: '#f8fdf8',
          backgroundGradientTo: '#f0f7f0',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(212,175,55,${opacity})`,
          labelColor: (opacity = 1) => `rgba(50,50,50,${opacity})`,
          propsForDots: { r: '5', strokeWidth: '2', stroke: '#1a472a' },
        }}
        bezier
        style={{ borderRadius: 8 }}
        withInnerLines={false}
      />
      <Text style={styles.avg}>── Avg {avg} ──</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1a472a', marginBottom: 4 },
  insight: { fontSize: 12, color: '#666', marginBottom: 12 },
  avg: { fontSize: 11, color: '#d4af37', textAlign: 'center', marginTop: 4 },
});
