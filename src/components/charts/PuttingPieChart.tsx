import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface Props { width?: number; }

export default function PuttingPieChart({ width }: Props) {
  const w = width ?? Dimensions.get('window').width - 48;
  const data = [
    { name: '1 Putt',   population: 18, color: '#1a472a', legendFontColor: '#333', legendFontSize: 12 },
    { name: '2 Putts',  population: 62, color: '#2d7a45', legendFontColor: '#333', legendFontSize: 12 },
    { name: '3 Putts',  population: 18, color: '#68b884', legendFontColor: '#333', legendFontSize: 12 },
    { name: '4+ Putts', population: 2,  color: '#b8dfc9', legendFontColor: '#333', legendFontSize: 12 },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Putting Breakdown</Text>
      <Text style={styles.insight}>18% 3-putt rate (target: &lt;10%). Your #2 focus area.</Text>
      <View style={{ position: 'relative' }}>
        <PieChart
          data={data}
          width={w}
          height={160}
          chartConfig={{ color: (opacity = 1) => `rgba(26,71,42,${opacity})` }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute={false}
        />
        <View style={styles.centerLabel}>
          <Text style={styles.centerText}>2.0</Text>
          <Text style={styles.centerSub}>avg</Text>
        </View>
      </View>
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
  insight: { fontSize: 12, color: '#666', marginBottom: 8 },
  centerLabel: {
    position: 'absolute',
    left: '18%',
    top: '25%',
    alignItems: 'center',
  },
  centerText: { fontSize: 20, fontWeight: '900', color: '#1a472a' },
  centerSub: { fontSize: 11, color: '#666' },
});
