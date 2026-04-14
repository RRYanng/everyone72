import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';

interface Props { width?: number; }

export default function ParTypeRadarChart({ width }: Props) {
  const w = width ?? Dimensions.get('window').width - 80;
  const size = Math.min(w, 240);
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size * 0.38;
  const maxVal = 2.5;
  const labelOffset = 20;

  const data = [
    { label: 'Par 3', val: 0.5 },
    { label: 'Par 4', val: 1.8 },
    { label: 'Par 5', val: 1.0 },
  ];

  const pts = data.map((d, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / 3) * i;
    const dist = (d.val / maxVal) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
      ax: cx + r * Math.cos(angle),
      ay: cy + r * Math.sin(angle),
      lx: cx + (r + labelOffset) * Math.cos(angle),
      ly: cy + (r + labelOffset) * Math.sin(angle),
      label: d.label,
      val: d.val,
      angle,
    };
  });

  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const outerPoints = pts.map(p => `${p.ax},${p.ay}`).join(' ');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Par Type Performance</Text>
      <Text style={styles.insight}>Par 4s are your biggest weakness (+1.8 avg over par)</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size + 20}>
          {/* Outer reference triangle */}
          <Polygon points={outerPoints} fill="none" stroke="#ddd" strokeWidth={1.5} />
          {/* Grid lines from center to vertices */}
          {pts.map((p, i) => (
            <Line key={i} x1={cx} y1={cy} x2={p.ax} y2={p.ay} stroke="#eee" strokeWidth={1} />
          ))}
          {/* Data polygon */}
          <Polygon points={polyPoints} fill="rgba(212,175,55,0.4)" stroke="#d4af37" strokeWidth={2} />
          {/* Vertex dots */}
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#d4af37" />
          ))}
          {/* Axis labels */}
          {pts.map((p, i) => (
            <SvgText
              key={`label-${i}`}
              x={p.lx}
              y={p.ly}
              textAnchor="middle"
              fontSize={11}
              fill="#333"
              fontWeight="600"
            >
              {p.label}
            </SvgText>
          ))}
          {/* Value labels near each vertex */}
          {pts.map((p, i) => (
            <SvgText
              key={`val-${i}`}
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#1a472a"
              fontWeight="700"
            >
              +{p.val}
            </SvgText>
          ))}
        </Svg>
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
});
