// DemoScreen — Public demo page. No auth required.
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation';
import ScoreTrendChart from '../../components/charts/ScoreTrendChart';
import TroubleBreakdownChart from '../../components/charts/TroubleBreakdownChart';
import ParTypeRadarChart from '../../components/charts/ParTypeRadarChart';
import PuttingPieChart from '../../components/charts/PuttingPieChart';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Demo'>;

const { width } = Dimensions.get('window');
const isWide = width > 768;

const DIAGNOSIS = {
  coreIssue: `Your primary weakness isn't your swing — it's your Par 4 second-shot decision making. In the last 5 rounds, you've hit 14 water hazards, and 11 of them (79%) were on Par 4 second shots.`,
  dataEvidence: `• Par 4 average: +1.8 vs par (worst performance category)\n• Par 4 second-shot water rate: 38% (industry amateur average: 12%)\n• When you avoid water on Par 4s, your average drops from 4.8 to 4.1\n• Putting: 2.0 putts/hole average (target: 1.8)`,
  rootCause: `Three possible causes ranked by likelihood:\n\n1. CLUB SELECTION (most likely): You're attacking greens with a 3-wood or hybrid when you should be laying up with a mid-iron\n\n2. AIM ALIGNMENT: Your miss pattern is consistently right-side, suggesting open stance or early hip rotation\n\n3. RISK TOLERANCE: You may be aiming at pins instead of green centers`,
  practicePlan: `Week 1 — Decision Making\n  Mon: 30 min mental game review — label each Par 4 from last 5 rounds: "attack" or "layup"\n  Wed: Range session, 50 balls with 7-iron from 150 yards, focus on green center\n  Sat: Play 9 holes with rule: NO 3-wood on second shot. Track water hits.\n\nWeek 2 — Execution\n  Tue: Putting drill — 6–10 foot putts, 50 reps, target 70% make rate\n  Thu: Iron practice — 30 balls with 6-iron, square clubface at impact\n  Sun: Full round with new Par 4 strategy, compare vs baseline\n\nExpected outcome: Par 4 avg drops from +1.8 → +0.9, saving ~6 strokes/round`,
};

const SECTION_COLORS = {
  coreIssue:    { bg: '#fff5f5', border: '#f44336', icon: '🎯' },
  dataEvidence: { bg: '#f0f4ff', border: '#1565c0', icon: '📊' },
  rootCause:    { bg: '#f5f0ff', border: '#7b1fa2', icon: '🔬' },
  practicePlan: { bg: '#f0fff4', border: '#2e7d32', icon: '🏋️' },
};

const DIAGNOSIS_TITLES: Record<keyof typeof SECTION_COLORS, string> = {
  coreIssue:    'Core Issue',
  dataEvidence: 'Data Evidence',
  rootCause:    'Root Cause',
  practicePlan: 'Practice Plan',
};

export default function DemoScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO · Sample Data</Text>
        </View>
        <Text style={styles.heroTitle}>This is what Alex's{'\n'}AI diagnosis looks like.</Text>
        <Text style={styles.heroSub}>
          Real data. Real AI analysis. Real actionable plans.{'\n'}
          Scroll to see how Everyone 72 helps amateur golfers actually improve.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Landing')}>
          <Ionicons name="arrow-back" size={16} color="#d4af37" />
          <Text style={styles.backBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      {/* ── User Card ── */}
      <View style={styles.section}>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>AC</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Alex Chen</Text>
            <Text style={styles.userSub}>Amateur golfer · Irvine, CA</Text>
          </View>
          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Text style={styles.userStatNum}>15.2</Text>
              <Text style={styles.userStatLabel}>Handicap</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatNum}>5</Text>
              <Text style={styles.userStatLabel}>Rounds</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatNum}>91.8</Text>
              <Text style={styles.userStatLabel}>Avg Score</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Charts ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTag}>DATA VISUALIZATION</Text>
        <Text style={styles.sectionTitle}>5 rounds of data. One clear pattern.</Text>
        <View style={isWide ? styles.chartGrid : undefined}>
          <ScoreTrendChart />
          <TroubleBreakdownChart />
          <ParTypeRadarChart />
          <PuttingPieChart />
        </View>
      </View>

      {/* ── AI Diagnosis ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTag}>AI DIAGNOSIS REPORT</Text>
        <Text style={styles.sectionTitle}>Generated by Claude AI</Text>
        <View style={styles.aiNote}>
          <Ionicons name="sparkles" size={14} color="#d4af37" />
          <Text style={styles.aiNoteText}>
            This report is generated from hole-by-hole scorecard data — not just totals.
            The AI analyzes putting patterns, trouble distribution, and scoring by hole type.
          </Text>
        </View>
        {(Object.entries(DIAGNOSIS) as [keyof typeof SECTION_COLORS, string][]).map(([key, text]) => {
          const s = SECTION_COLORS[key];
          return (
            <View key={key} style={[styles.diagCard, { backgroundColor: s.bg, borderLeftColor: s.border }]}>
              <View style={styles.diagHeader}>
                <Text style={styles.diagIcon}>{s.icon}</Text>
                <Text style={[styles.diagTitle, { color: s.border }]}>{DIAGNOSIS_TITLES[key]}</Text>
              </View>
              <Text style={styles.diagText}>{text}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Bottom CTA ── */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Want your own diagnosis?</Text>
        <Text style={styles.ctaSub}>
          Sign up free. Enter 5 rounds. Get a report just like this one.{'\n'}No hardware. No subscription.
        </Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.ctaBtnText}>Start My Diagnosis Free →</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  container: { paddingBottom: 0 },

  // Hero
  hero: {
    backgroundColor: '#1a472a',
    paddingHorizontal: isWide ? 80 : 24,
    paddingTop: 56,
    paddingBottom: 48,
    alignItems: 'center',
  },
  demoBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderWidth: 1,
    borderColor: '#d4af37',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 24,
  },
  demoBadgeText: { color: '#d4af37', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: {
    fontSize: isWide ? 40 : 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: isWide ? 50 : 36,
    marginBottom: 16,
  },
  heroSub: {
    fontSize: isWide ? 17 : 14,
    color: '#a8d5b5',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 560,
    marginBottom: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.5)',
    borderRadius: 8,
  },
  backBtnText: { color: '#d4af37', fontSize: 14, fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: isWide ? 80 : 20, paddingVertical: 40 },
  sectionTag: { fontSize: 11, fontWeight: '700', color: '#1a472a', letterSpacing: 2, marginBottom: 8 },
  sectionTitle: { fontSize: isWide ? 26 : 20, fontWeight: '800', color: '#111', marginBottom: 24 },

  // User card
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: isWide ? 'row' : 'column',
    alignItems: isWide ? 'center' : 'flex-start',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a472a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#d4af37', fontSize: 20, fontWeight: '800' },
  userInfo: { flex: isWide ? 1 : undefined },
  userName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  userSub: { fontSize: 13, color: '#888', marginTop: 2 },
  userStats: { flexDirection: 'row', gap: isWide ? 32 : 24 },
  userStat: { alignItems: 'center' },
  userStatNum: { fontSize: 22, fontWeight: '900', color: '#1a472a' },
  userStatLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  // Charts
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  // AI note
  aiNote: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  aiNoteText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 18 },

  // Diagnosis cards
  diagCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 4,
  },
  diagHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  diagIcon: { fontSize: 18 },
  diagTitle: { fontSize: 15, fontWeight: '800' },
  diagText: { fontSize: 14, color: '#333', lineHeight: 22 },

  // CTA
  cta: {
    backgroundColor: '#1a472a',
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 72,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: isWide ? 34 : 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 14 },
  ctaSub: { fontSize: 16, color: '#a8d5b5', textAlign: 'center', lineHeight: 26, marginBottom: 32 },
  ctaBtn: { backgroundColor: '#d4af37', paddingHorizontal: 36, paddingVertical: 18, borderRadius: 14 },
  ctaBtnText: { color: '#1a472a', fontSize: 17, fontWeight: '800' },
});
