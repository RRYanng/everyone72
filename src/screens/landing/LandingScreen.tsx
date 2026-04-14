// ============================================================
// Landing Page — 公开首页，引导用户注册
// 适用于 Web 部署，展示 App 核心功能
// ============================================================

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Landing'>;

const { width } = Dimensions.get('window');
const isWide = width > 768;

// ── Hero value-prop cards ──────────────────────────────────────────────────
const VALUE_PROPS = [
  {
    icon: '🎯',
    title: 'AI Diagnosis',
    desc: 'Real root-cause analysis, not just stats. Find out exactly what\'s holding you back.',
  },
  {
    icon: '📋',
    title: 'Personalized Practice Plans',
    desc: 'Get a specific weekly drill schedule based on your actual game, not generic tips.',
  },
  {
    icon: '⛳',
    title: 'No Hardware Required',
    desc: 'Free forever. No $300 sensors. No $99/year subscription. Just better golf.',
  },
];

// ── Feature cards data ─────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '📋' as const,
    title: 'Hole-by-Hole Scorecard',
    desc: 'Log strokes, putts, and trouble tags with a fast 3-step input. No more messy paper cards.',
    color: '#e8f5e9',
    accent: '#2e7d32',
  },
  {
    icon: '🤖' as const,
    title: 'AI Golf Coach',
    desc: 'Claude AI analyzes every round. Identifies 3-putt patterns, trouble holes, and gives targeted drills.',
    color: '#fff8e1',
    accent: '#f57f17',
  },
  {
    icon: '📊' as const,
    title: 'Stats That Matter',
    desc: 'Track your handicap trend, average score, and putting improvement across every round.',
    color: '#e3f2fd',
    accent: '#1565c0',
  },
  {
    icon: '🏌️' as const,
    title: 'Play With Friends',
    desc: 'Share practice sessions, compete on weekly leaderboards, and motivate each other to improve.',
    color: '#fce4ec',
    accent: '#c62828',
  },
  {
    icon: '⛳' as const,
    title: '500+ US Courses',
    desc: 'Search from a database of 500+ real US golf courses with accurate ratings and slope.',
    color: '#f3e5f5',
    accent: '#6a1b9a',
  },
  {
    icon: '📸' as const,
    title: 'Practice Feed',
    desc: 'Log your range sessions with photos. Keep your improvement visible and shareable.',
    color: '#e0f2f1',
    accent: '#00695c',
  },
];

const TESTIMONIALS = [
  {
    text: '"Finally found something my whole golf group uses. The AI analysis is surprisingly useful."',
    author: 'David K., 14 handicap',
  },
  {
    text: '"Cut 3 strokes off my average in 6 weeks just by following the AI putting tips."',
    author: 'Sarah M., 22 handicap',
  },
  {
    text: '"Super fast to log a round — I do it while walking to the next tee box."',
    author: 'James T., 8 handicap',
  },
];

export default function LandingScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* ── Nav Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.nav}>
        <View style={styles.navBrand}>
          <Text style={styles.navLogo}>⛳</Text>
          <Text style={styles.navName}>Everyone 72</Text>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.navSignIn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.navSignInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navSignUp}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.navSignUpText}>Sign Up Free</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>🆕  Free to use · No credit card</Text>
        </View>

        <Text style={styles.heroTitle}>
          Stop guessing.{'\n'}
          <Text style={styles.heroTitleAccent}>Start fixing.</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          The only AI golf coach that diagnoses why you're not improving — and builds a plan to fix it.{' '}
          Free. No hardware. No subscription.
        </Text>

        <View style={styles.heroButtons}>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.ctaPrimaryText}>Get Your First Diagnosis Free →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.ctaSecondaryText}>Already have an account</Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          {[
            { num: '500+', label: 'US Courses' },
            { num: 'AI', label: 'Powered by Claude' },
            { num: '100%', label: 'Free to Start' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Value Props ───────────────────────────────────────────────────── */}
      <View style={styles.valuePropSection}>
        {VALUE_PROPS.map((v) => (
          <View key={v.title} style={styles.valuePropCard}>
            <Text style={styles.valuePropIcon}>{v.icon}</Text>
            <Text style={styles.valuePropTitle}>{v.title}</Text>
            <Text style={styles.valuePropDesc}>{v.desc}</Text>
          </View>
        ))}
      </View>

      {/* ── Scorecard Preview ─────────────────────────────────────────────── */}
      <View style={styles.previewSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTag}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Three taps per hole. Full analysis after 18.</Text>
        </View>

        <View style={styles.stepsRow}>
          {[
            { step: '1', icon: '🏌️', label: 'Pick your strokes', sub: '1 tap to log how many shots you took' },
            { step: '2', icon: '⛳', label: 'Count your putts', sub: 'Track putts separately for AI putting analysis' },
            { step: '3', icon: '🤖', label: 'Get AI coaching', sub: 'Finish the round, see your personalized report' },
          ].map((s) => (
            <View key={s.step} style={styles.stepCard}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.step}</Text>
              </View>
              <Text style={styles.stepIcon}>{s.icon}</Text>
              <Text style={styles.stepLabel}>{s.label}</Text>
              <Text style={styles.stepSub}>{s.sub}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Features Grid ─────────────────────────────────────────────────── */}
      <View style={styles.featuresSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTag}>FEATURES</Text>
          <Text style={styles.sectionTitle}>Everything you need to play better</Text>
        </View>

        <View style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[
                styles.featureCard,
                { backgroundColor: f.color, borderColor: f.accent + '30' },
              ]}
            >
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureTitle, { color: f.accent }]}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── AI Section ────────────────────────────────────────────────────── */}
      <View style={styles.aiSection}>
        <View style={styles.aiCard}>
          <Text style={styles.aiTag}>⚡ POWERED BY CLAUDE AI</Text>
          <Text style={styles.aiTitle}>Your personal golf coach, after every round.</Text>
          <Text style={styles.aiBody}>
            After you finish logging your round, Everyone 72 sends your full scorecard to Claude —
            Anthropic's state-of-the-art AI — and gets back a personalized coaching report in seconds.
          </Text>

          <View style={styles.aiFeatures}>
            {[
              '⚠️  Flags 3-putt holes by name',
              '🌊  Identifies your trouble patterns (water, OB, bunker)',
              '🎯  Gives 2-3 specific practice drills',
              '📈  Scores you against course difficulty (rating + slope)',
            ].map((item) => (
              <Text key={item} style={styles.aiFeatureItem}>{item}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={styles.aiCta}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.aiCtaText}>Try AI Analysis Free →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <View style={styles.testimonialsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTag}>WHAT GOLFERS SAY</Text>
          <Text style={styles.sectionTitle}>Real feedback from real players</Text>
        </View>
        <View style={styles.testimonialsRow}>
          {TESTIMONIALS.map((t) => (
            <View key={t.author} style={styles.testimonialCard}>
              <Text style={styles.testimonialStars}>⭐⭐⭐⭐⭐</Text>
              <Text style={styles.testimonialText}>{t.text}</Text>
              <Text style={styles.testimonialAuthor}>— {t.author}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <View style={styles.finalCta}>
        <Text style={styles.finalCtaTitle}>Ready to break your scoring barrier?</Text>
        <Text style={styles.finalCtaSub}>
          Free to sign up. No credit card required.{'\n'}Start tracking your first round in under 2 minutes.
        </Text>
        <TouchableOpacity
          style={styles.finalCtaBtn}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.finalCtaBtnText}>Get Your First Diagnosis Free →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.finalSignIn}>Already a member? Sign in</Text>
        </TouchableOpacity>
      </View>

      {/* ── Footer Tagline ────────────────────────────────────────────────── */}
      <View style={styles.footerTaglineSection}>
        <Text style={styles.footerTaglineCopy}>
          Built by a golfer, for golfers who want to actually get better — not just track numbers.
        </Text>
      </View>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>⛳ Everyone 72</Text>
        <Text style={styles.footerTagline}>Play better. Track smarter.</Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerCopy}>© 2026 Everyone 72. All rights reserved.</Text>
      </View>

    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 0 },

  // Nav
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isWide ? 48 : 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogo: { fontSize: 24 },
  navName: { fontSize: 20, fontWeight: '800', color: '#1a472a' },
  navActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  navSignIn: { paddingHorizontal: 14, paddingVertical: 8 },
  navSignInText: { fontSize: 14, color: '#1a472a', fontWeight: '600' },
  navSignUp: {
    backgroundColor: '#1a472a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navSignUpText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Hero
  hero: {
    backgroundColor: '#1a472a',
    paddingHorizontal: isWide ? 80 : 24,
    paddingTop: 56,
    paddingBottom: 64,
    alignItems: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroBadgeText: { color: '#a8d5b5', fontSize: 13, fontWeight: '600' },
  heroTitle: {
    fontSize: isWide ? 52 : 36,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: isWide ? 62 : 44,
    marginBottom: 20,
  },
  heroTitleAccent: { color: '#d4af37' },
  heroSubtitle: {
    fontSize: isWide ? 20 : 17,
    color: '#a8d5b5',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 600,
    marginBottom: 36,
  },
  heroButtons: { flexDirection: isWide ? 'row' : 'column', gap: 12, alignItems: 'center' },
  ctaPrimary: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: '#1a472a', fontSize: 16, fontWeight: '800' },
  ctaSecondary: { paddingHorizontal: 20, paddingVertical: 16 },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecorationLine: 'underline' },
  statsBar: {
    flexDirection: 'row',
    marginTop: 48,
    gap: isWide ? 64 : 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 32,
    width: '100%',
    justifyContent: 'center',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '900', color: '#d4af37' },
  statLabel: { fontSize: 12, color: '#a8d5b5', marginTop: 4 },

  // Value Props
  valuePropSection: {
    flexDirection: isWide ? 'row' : 'column',
    gap: 16,
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 40,
    backgroundColor: '#0f2d1a',
    justifyContent: 'center',
  },
  valuePropCard: {
    flex: isWide ? 1 : undefined,
    backgroundColor: '#1a472a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  valuePropIcon: { fontSize: 28, marginBottom: 10 },
  valuePropTitle: { fontSize: 16, fontWeight: '800', color: '#d4af37', marginBottom: 8 },
  valuePropDesc: { fontSize: 14, color: '#a8d5b5', lineHeight: 21 },

  // Footer tagline
  footerTaglineSection: {
    backgroundColor: '#fff',
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 28,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerTaglineCopy: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    maxWidth: 520,
  },

  // Section headers
  sectionHeader: { alignItems: 'center', marginBottom: 40 },
  sectionTag: { fontSize: 12, fontWeight: '700', color: '#1a472a', letterSpacing: 2, marginBottom: 10 },
  sectionTitle: {
    fontSize: isWide ? 32 : 24,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    maxWidth: 500,
  },

  // How it works
  previewSection: {
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 64,
    backgroundColor: '#f9fafb',
  },
  stepsRow: {
    flexDirection: isWide ? 'row' : 'column',
    gap: 20,
    justifyContent: 'center',
  },
  stepCard: {
    flex: isWide ? 1 : undefined,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a472a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepIcon: { fontSize: 32, marginBottom: 12 },
  stepLabel: { fontSize: 16, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  stepSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  // Features
  featuresSection: {
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 64,
    backgroundColor: '#fff',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  featureCard: {
    width: isWide ? '30%' : '100%',
    minWidth: isWide ? 260 : undefined,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  featureIcon: { fontSize: 32, marginBottom: 12 },
  featureTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#4b5563', lineHeight: 20 },

  // AI Section
  aiSection: {
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 64,
    backgroundColor: '#1a472a',
  },
  aiCard: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  aiTag: { fontSize: 12, color: '#d4af37', fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  aiTitle: {
    fontSize: isWide ? 36 : 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    lineHeight: isWide ? 44 : 34,
  },
  aiBody: { fontSize: 16, color: '#a8d5b5', lineHeight: 26, marginBottom: 28 },
  aiFeatures: { gap: 12, marginBottom: 32 },
  aiFeatureItem: { fontSize: 15, color: '#d1fae5', lineHeight: 22 },
  aiCta: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  aiCtaText: { color: '#1a472a', fontSize: 16, fontWeight: '800' },

  // Testimonials
  testimonialsSection: {
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 64,
    backgroundColor: '#f9fafb',
  },
  testimonialsRow: {
    flexDirection: isWide ? 'row' : 'column',
    gap: 20,
  },
  testimonialCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  testimonialStars: { fontSize: 14, marginBottom: 12 },
  testimonialText: { fontSize: 14, color: '#374151', lineHeight: 22, fontStyle: 'italic', marginBottom: 14 },
  testimonialAuthor: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },

  // Final CTA
  finalCta: {
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 80,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: isWide ? 38 : 28,
    fontWeight: '900',
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
  },
  finalCtaSub: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 36,
  },
  finalCtaBtn: {
    backgroundColor: '#1a472a',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  finalCtaBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  finalSignIn: { color: '#9ca3af', fontSize: 14, textDecorationLine: 'underline' },

  // Footer
  footer: {
    backgroundColor: '#111',
    paddingHorizontal: isWide ? 80 : 24,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  footerBrand: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  footerTagline: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  footerLinks: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  footerLink: { color: '#6b7280', fontSize: 13, textDecorationLine: 'underline' },
  footerDot: { color: '#444', fontSize: 13 },
  footerCopy: { color: '#4b5563', fontSize: 12 },
});
