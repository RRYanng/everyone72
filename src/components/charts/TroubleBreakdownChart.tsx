import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';

interface Props { width?: number; }

export default function TroubleBreakdownChart({ width }: Props) {
  const w = width ?? Dimensions.get('window').width - 80;
  const h = 160;
  const rounds = ['Apr 5', 'Mar 29', 'Mar 22', 'Mar 15', 'Mar 8'];
  const water =  [3, 2, 4, 3, 2];
  const bunker = [2, 0, 2, 2, 0];
  const ob =     [0, 1, 0, 1, 0];
  const maxVal = 7;
  const gap = (w - 40) / rounds.length;
  const barW = gap * 0.6;
  const scale = (h - 30) / maxVal;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Trouble Breakdown</Text>
      <Text style={styles.insight}>79% of water hazards happen on Par 4 second shots</Text>
      <Svg width={w} height={h + 20}>
        {rounds.map((label, i) => {
          const x = 20 + i * gap + gap * 0.2;
          const wH = water[i] * scale;
          const bH = bunker[i] * scale;
          const oH = ob[i] * scale;
          const baseY = h - 20;
          return (
            <G key={i}>
              <Rect x={x} y={baseY - wH} width={barW} height={wH || 0.1} fill="#1565c0" rx={2} />
              <Rect x={x} y={baseY - wH - bH} width={barW} height={bH || 0.1} fill="#d4af37" rx={2} />
              <Rect x={x} y={baseY - wH - bH - oH} width={barW} height={oH || 0.1} fill="#c62828" rx={2} />
              <SvgText
                x={x + barW / 2}
                y={baseY + 14}
                textAnchor="middle"
                fontSize={9}
                fill="#666"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        {([['#1565c0', 'Water'], ['#d4af37', 'Bunker'], ['#c62828', 'OB']] as [string, string][]).map(([color, label]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
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
  insight: { fontSize: 12, color: '#666', marginBottom: 12 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#555' },
});
