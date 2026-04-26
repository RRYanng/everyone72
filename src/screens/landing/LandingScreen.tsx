// ============================================================
// Landing Page — SHIZUKA GOLF 日系编辑风
// Nav · Hero(SVG 曲线+植物) · 3-col Feature Card · FEATURES · WHAT THEY SAY · Dark Footer
// ============================================================

import React from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation';
import { activateDevMock } from '../../lib/mockUser';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Landing'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const { width } = Dimensions.get('window');
const MAX_W = 1200;
const BREAKPOINT = 768;
const isWide = width > BREAKPOINT;
const HORIZ_PCT = '8%';

// Hero 相对高度：桌面撑满可视区，移动端自然撑开
const HERO_MIN_HEIGHT = isWide ? 640 : undefined;

// ── Image assets (Unsplash public photos) ─────────────────
const HERO_IMG      = 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&q=80';
const FEATURE_IMG_A = 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&q=80';
const FEATURE_IMG_B = 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80';

// 半透明遮罩：图片上的均匀 darken，保证与暖米色调和谐
const IMAGE_OVERLAY = 'rgba(44, 42, 38, 0.10)';

export default function LandingScreen() {
  const navigation = useNavigation<NavProp>();
  const goRegister = () => navigation.navigate('Register');
  const goLogin    = () => navigation.navigate('Login');
  const goPrivacy  = () => navigation.navigate('PrivacyPolicy');
  const goTerms    = () => navigation.navigate('Terms');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {__DEV__ ? <DevBar /> : null}

      <TopNav onSignIn={goLogin} onGetStarted={goRegister} />
      <Hero onGetStarted={goRegister} />
      <FeatureCard3Col />
      <FeaturesSection onLearnMore={goRegister} />
      <WhatTheySay onSeeAll={goRegister} />
      <Footer
        onSignIn={goLogin}
        onPrivacy={goPrivacy}
        onTerms={goTerms}
      />
    </ScrollView>
  );
}

// ── Top Nav ───────────────────────────────────────────────────

function TopNav({ onSignIn, onGetStarted }: {
  onSignIn: () => void; onGetStarted: () => void;
}) {
  return (
    <View style={styles.nav}>
      <View style={styles.navInner}>
        {/* Brand + underline */}
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <Ionicons name="golf-outline" size={20} color={colors.koke} accessible={false} />
            <Text style={styles.brandText} accessibilityRole="header">Everyone 72</Text>
          </View>
          <View style={styles.brandUnderline} accessible={false} />
        </View>

        {/* Center links (wide only) */}
        {isWide ? (
          <View style={styles.navLinks}>
            {['Home', 'Features', 'How It Works', 'About'].map(label => (
              <Pressable
                key={label}
                accessibilityRole="link"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.navLinkWrap, pressed && styles.pressed]}
              >
                <Text style={styles.navLinkText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Right side */}
        <View style={styles.navRight}>
          {isWide ? (
            <Pressable
              onPress={onSignIn}
              accessibilityRole="link"
              accessibilityLabel="Sign in"
              style={({ pressed }) => [styles.navIcon, pressed && styles.pressed]}
            >
              <Ionicons name="person-outline" size={20} color={colors.text.primary} accessible={false} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            style={({ pressed }) => [styles.navCta, pressed && styles.pressed]}
          >
            <Text style={styles.navCtaText}>Get Started</Text>
          </Pressable>
          {!isWide ? (
            <View style={styles.hamburger} accessible={false}>
              <Ionicons name="menu-outline" size={26} color={colors.text.primary} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <View style={styles.hero}>
      {/* Organic shape on right with real photo + mask + gradient (wide only) */}
      {isWide ? (
        <View style={styles.heroRightShape} pointerEvents="none">
          <Image
            source={{ uri: HERO_IMG }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessible
            accessibilityLabel="Golf course landscape"
          />
          {/* Solid uniform darken for overall tonal harmony */}
          <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />
          {/* SVG overlay: washi-colored mask outside curve + gradient inside curve */}
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 600 700"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"   stopColor={colors.sumi} stopOpacity="0" />
                <Stop offset="0.7" stopColor={colors.sumi} stopOpacity="0" />
                <Stop offset="1"   stopColor={colors.sumi} stopOpacity="0.25" />
              </LinearGradient>
            </Defs>
            {/* Mask: hide image OUTSIDE curve with page bg */}
            <Path
              d="M 0 0 L 220 0 Q 0 350, 220 700 L 0 700 Z"
              fill={colors.washi}
            />
            {/* Bottom fade gradient INSIDE curve */}
            <Path
              d="M 220 0 Q 0 350, 220 700 L 600 700 L 600 0 Z"
              fill="url(#heroGrad)"
            />
          </Svg>
        </View>
      ) : null}

      {/* Plant decoration bottom-left (wide only) */}
      {isWide ? (
        <View style={styles.plantLeft} pointerEvents="none" accessible={false}>
          <PlantSprig />
        </View>
      ) : null}

      <View style={styles.heroContent}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle} accessibilityRole="header">
            Your pocket{'\n'}golf coach.
          </Text>
          <Text style={styles.heroSubtitle}>
            Most golfers practice more but improve less. Everyone72 analyzes every round to tell you exactly what's holding you back.
          </Text>
          <Pressable
            onPress={onGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get your free diagnosis"
            accessibilityHint="Create a free account"
            style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}
          >
            <Text style={styles.heroCtaText}>Get your free diagnosis</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.shiro} accessible={false} />
          </Pressable>
        </View>

        {/* Mobile: real image below text */}
        {!isWide ? (
          <View style={styles.heroMobileImg}>
            <Image
              source={{ uri: HERO_IMG }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessible
              accessibilityLabel="Golf course landscape"
            />
            <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />
          </View>
        ) : null}
      </View>

      {/* SCROLL indicator (wide only) */}
      {isWide ? (
        <View style={styles.scrollIndicator} accessible={false}>
          <Text style={styles.scrollText}>SCROLL</Text>
          <View style={styles.scrollLine} />
        </View>
      ) : null}
    </View>
  );
}

function PlantSprig() {
  return (
    <Svg width={120} height={220} viewBox="0 0 120 220" fill="none">
      {/* Main stem */}
      <Path d="M 55 220 Q 45 130, 25 40" stroke={colors.kokeLight} strokeWidth={1.2} fill="none" />
      {/* Leaf 1 — lower right */}
      <Path d="M 48 155 Q 88 150, 88 180 Q 68 182, 48 155 Z" stroke={colors.kokeLight} strokeWidth={1} fill="none" />
      {/* Leaf 2 — middle left */}
      <Path d="M 40 100 Q 5 95, 5 125 Q 25 128, 40 100 Z" stroke={colors.kokeLight} strokeWidth={1} fill="none" />
      {/* Leaf 3 — upper right */}
      <Path d="M 30 55 Q 72 48, 72 78 Q 52 80, 30 55 Z" stroke={colors.kokeLight} strokeWidth={1} fill="none" />
    </Svg>
  );
}

// ── 3-col Feature Card ────────────────────────────────────────

const FEATURE_ICONS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'sparkles-outline',      title: 'AI Diagnosis',
    desc: "Know exactly why your score isn't improving." },
  { icon: 'clipboard-outline',     title: 'Practice Plans',
    desc: 'A weekly drill schedule built for your game.' },
  { icon: 'trending-up-outline',   title: 'Track Progress',
    desc: 'See your improvement round by round.' },
];

function FeatureCard3Col() {
  return (
    <View style={styles.featureCardOuter}>
      <View style={styles.featureCard}>
        {FEATURE_ICONS.map((f, i) => (
          <React.Fragment key={f.title}>
            {i > 0 && isWide ? <View style={styles.featureCardDivider} accessible={false} /> : null}
            <View
              style={styles.featureCol}
              accessible
              accessibilityLabel={`${f.title}. ${f.desc}`}
            >
              <View style={styles.featureIconCircle} accessible={false}>
                <Ionicons name={f.icon} size={20} color={colors.text.secondary} />
              </View>
              <Text style={styles.featureColTitle}>{f.title}</Text>
              <Text style={styles.featureColDesc}>{f.desc}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ── FEATURES Section (left text + right 2 placeholders + arrow) ───────

function FeaturesSection({ onLearnMore }: { onLearnMore: () => void }) {
  return (
    <View style={styles.sectionOuter}>
      {/* Plant decoration on right side, wide only */}
      {isWide ? (
        <View style={styles.plantRight} pointerEvents="none" accessible={false}>
          <PlantSprig />
        </View>
      ) : null}

      <View style={styles.sectionInner}>
        <View style={styles.featuresRow}>
          <View style={styles.featuresLeft}>
            <SectionLabel>FEATURES</SectionLabel>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Everything your coach{'\n'}would tell you.
            </Text>
            <Text style={styles.sectionDesc}>
              From stroke patterns to putting habits, Everyone72 analyzes the data most golfers never see.
            </Text>
            <Pressable
              onPress={onLearnMore}
              accessibilityRole="link"
              accessibilityLabel="See how it works"
              style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}
            >
              <Text style={styles.textLinkLabel}>See how it works →</Text>
            </Pressable>
          </View>

          <View style={styles.featuresRight}>
            <View style={styles.placeholderBlockA}>
              <Image
                source={{ uri: FEATURE_IMG_A }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessible
                accessibilityLabel="Player on the green"
              />
              <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />
            </View>
            <View style={styles.placeholderBlockB}>
              <Image
                source={{ uri: FEATURE_IMG_B }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessible
                accessibilityLabel="Golf course landscape"
              />
              <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Learn more"
                style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-forward" size={16} color={colors.text.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── WHAT THEY SAY ─────────────────────────────────────────────

const REVIEWS = [
  { date: '2026.04.01', category: 'Handicap Drop',
    text: 'Dropped from 18 to 14 in 8 weeks using the AI practice plan.' },
  { date: '2026.03.15', category: 'Course Management',
    text: 'Finally understood why I kept losing strokes on Par 4s.' },
  { date: '2026.03.01', category: 'Putting',
    text: 'Cut my 3-putts in half after following the weekly drill plan.' },
];

function WhatTheySay({ onSeeAll }: { onSeeAll: () => void }) {
  return (
    <View style={styles.sectionOuter}>
      <View style={styles.sectionInner}>
        <View style={styles.whatHeader}>
          <View style={styles.whatHeaderLeft}>
            <SectionLabel>WHAT THEY SAY</SectionLabel>
            <Text style={styles.whatTitle} accessibilityRole="header">
              What our golfers say
            </Text>
          </View>
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="link"
            accessibilityLabel="See all reviews"
            style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}
          >
            <Text style={styles.textLinkLabel}>See all reviews →</Text>
          </Pressable>
        </View>

        <View style={styles.reviewList}>
          {REVIEWS.map((r, i) => (
            <ReviewRow key={r.date} {...r} first={i === 0} />
          ))}
        </View>
      </View>
    </View>
  );
}

function ReviewRow({
  date, category, text, first,
}: { date: string; category: string; text: string; first: boolean }) {
  return (
    <View
      style={[styles.reviewRow, first && styles.reviewRowFirst]}
      accessible
      accessibilityLabel={`${date}, ${category}. ${text}`}
    >
      <View style={styles.reviewPills}>
        <Pill>{date}</Pill>
        <Pill>{category}</Pill>
      </View>
      <Text style={styles.reviewText} numberOfLines={isWide ? 1 : 2}>
        {text}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={18}
        color={colors.text.hint}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

// ── Footer (dark) ─────────────────────────────────────────────

const FOOTER_LINKS = {
  Product: ['Features', 'How It Works', 'Pricing', 'Download'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Legal:   ['Privacy Policy', 'Terms of Service'],
};

function Footer({
  onSignIn, onPrivacy, onTerms,
}: { onSignIn: () => void; onPrivacy: () => void; onTerms: () => void }) {
  const linkPress = (label: string) => {
    if (label === 'Privacy Policy') return onPrivacy;
    if (label === 'Terms of Service') return onTerms;
    if (label === 'Sign in' || label === 'About') return onSignIn;
    return () => {};
  };

  return (
    <View style={styles.footer}>
      <View style={styles.footerInner}>
        <View style={styles.footerTop}>
          {/* Brand column */}
          <View style={styles.footerBrandCol}>
            <View style={styles.footerBrandRow}>
              <Ionicons name="golf-outline" size={20} color={colors.washi} accessible={false} />
              <Text style={styles.footerBrandText}>Everyone 72</Text>
            </View>
            <Text style={styles.footerTagline}>Your pocket golf coach.</Text>
            <View style={styles.socialRow}>
              <SocialIcon name="logo-instagram" label="Instagram" />
              <SocialIcon name="logo-twitter"   label="Twitter" />
              <SocialIcon name="logo-facebook"  label="Facebook" />
            </View>
          </View>

          {/* Link columns (wide only) */}
          {isWide ? (
            <View style={styles.footerCols}>
              {(Object.keys(FOOTER_LINKS) as (keyof typeof FOOTER_LINKS)[]).map(title => (
                <View key={title} style={styles.footerCol}>
                  <Text style={styles.footerColTitle}>{title}</Text>
                  {FOOTER_LINKS[title].map(label => (
                    <Pressable
                      key={label}
                      onPress={linkPress(label)}
                      accessibilityRole="link"
                      accessibilityLabel={label}
                      style={({ pressed }) => [styles.footerLinkWrap, pressed && styles.pressed]}
                    >
                      <Text style={styles.footerLink}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
              {/* 4th column: placeholder / contact */}
              <View style={styles.footerCol}>
                <Text style={styles.footerColTitle}>Contact</Text>
                <Text style={styles.footerLink}>hello@everyone72.app</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Mobile fallback: legal + sign in inline */}
        {!isWide ? (
          <View style={styles.footerMobileLinks}>
            <Pressable onPress={onSignIn} accessibilityRole="link" accessibilityLabel="Sign in">
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
            <Text style={styles.footerDot} accessible={false}>·</Text>
            <Pressable onPress={onPrivacy} accessibilityRole="link" accessibilityLabel="Privacy">
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
            <Text style={styles.footerDot} accessible={false}>·</Text>
            <Pressable onPress={onTerms} accessibilityRole="link" accessibilityLabel="Terms">
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.footerBottom}>
          <Text style={styles.footerCopy}>© Everyone 72 · All rights reserved.</Text>
        </View>
      </View>
    </View>
  );
}

function SocialIcon({ name, label }: { name: IconName; label: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.socialIcon, pressed && styles.pressed]}
    >
      <Ionicons name={name} size={18} color={colors.text.secondary} accessible={false} />
    </Pressable>
  );
}

// ── Shared ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function DevBar() {
  return (
    <View style={styles.devBar}>
      <Text style={styles.devBarText}>DEV</Text>
      <Pressable
        onPress={() => activateDevMock()}
        accessibilityRole="button"
        accessibilityLabel="Skip login using a mock user"
        style={({ pressed }) => [styles.devBarBtn, pressed && styles.pressed]}
      >
        <Text style={styles.devBarBtnText}>Skip Login (Dev) →</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.washi },
  scrollContent: { alignItems: 'stretch' },

  pressed: { opacity: 0.6 },

  // DEV bar
  devBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.base,
    backgroundColor: colors.kincha,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.sumi,
  },
  devBarText: {
    fontSize: typography.xs, fontWeight: '700',
    color: colors.sumi, letterSpacing: 1.5,
  },
  devBarBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.sm, backgroundColor: colors.sumi,
  },
  devBarBtnText: {
    fontSize: typography.xs, fontWeight: '600', color: colors.shiro,
  },

  // ── Nav ──────────────────────────────────────
  nav: {
    backgroundColor: colors.washi,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
    height: 72,
    justifyContent: 'center',
  },
  navInner: {
    width: '100%', maxWidth: MAX_W, alignSelf: 'center',
    paddingHorizontal: HORIZ_PCT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: { alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: {
    fontSize: typography.base,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  brandUnderline: {
    width: 32, height: 2,
    backgroundColor: colors.koke,
    marginTop: spacing.xs,
    marginLeft: spacing.base,
  },
  navLinks: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'center',
  },
  navLinkWrap: { paddingVertical: spacing.xs, minHeight: 40, justifyContent: 'center' },
  navLinkText: {
    fontSize: typography.sm,
    color: colors.text.primary,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  navIcon: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  navCta: {
    backgroundColor: colors.koke,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    minHeight: 40,
    justifyContent: 'center',
  },
  navCtaText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.shiro,
  },
  hamburger: { padding: spacing.xs },

  // ── Hero ─────────────────────────────────────
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: HERO_MIN_HEIGHT,
    paddingVertical: isWide ? 0 : spacing['3xl'],
  },
  heroRightShape: {
    position: 'absolute',
    top: 0, right: 0,
    width: '60%',
    height: '100%',
  },
  plantLeft: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.xl,
    width: 120, height: 220,
    opacity: 0.9,
  },
  heroContent: {
    flex: 1,
    width: '100%', maxWidth: MAX_W, alignSelf: 'center',
    paddingHorizontal: HORIZ_PCT,
    flexDirection: isWide ? 'row' : 'column',
    alignItems: isWide ? 'center' : 'stretch',
    minHeight: HERO_MIN_HEIGHT,
  },
  heroLeft: {
    flex: isWide ? 0.55 : undefined,
    paddingRight: isWide ? spacing['2xl'] : 0,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: isWide ? 56 : typography['3xl'],
    fontFamily: fontFamily.serif,
    fontWeight: '400',
    color: colors.text.primary,
    lineHeight: (isWide ? 56 : typography['3xl']) * 1.15,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: typography.base,
    color: colors.text.secondary,
    lineHeight: typography.base * 1.7,
    maxWidth: 460,
    marginTop: spacing.lg,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.koke,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xl + spacing.xs,
    minHeight: 48,
  },
  heroCtaText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.shiro,
    letterSpacing: 0.2,
  },
  heroMobileImg: {
    marginTop: spacing.xl,
    height: 260,
    borderRadius: radius.lg,
    borderTopLeftRadius: 120,
    backgroundColor: colors.kokeTint,
    overflow: 'hidden',
    position: 'relative',
  },

  scrollIndicator: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0, right: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  scrollText: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.text.hint,
    fontWeight: '600',
  },
  scrollLine: {
    width: 1,
    height: 40,
    backgroundColor: colors.text.hint,
  },

  // ── 3-col Feature Card ───────────────────────
  featureCardOuter: {
    paddingHorizontal: '5%',
    marginTop: isWide ? -spacing['2xl'] : spacing.xl,
    marginBottom: spacing['3xl'],
    zIndex: 2,
  },
  featureCard: {
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    flexDirection: isWide ? 'row' : 'column',
    paddingVertical: spacing['2xl'],
  },
  featureCardDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.usuzumi,
    alignSelf: 'stretch',
    marginVertical: 0,
  },
  featureCol: {
    flex: isWide ? 1 : undefined,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: isWide ? 0 : spacing.lg,
    alignItems: 'center',
  },
  featureIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  featureColTitle: {
    fontSize: typography.lg - 2,          // 18
    fontFamily: fontFamily.serif,
    fontWeight: '500',
    color: colors.text.primary,
    marginTop: spacing.base,
    textAlign: 'center',
  },
  featureColDesc: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    lineHeight: typography.sm * 1.6,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },

  // ── Generic section ──────────────────────────
  sectionOuter: {
    position: 'relative',
    paddingVertical: isWide ? spacing['4xl'] : spacing['3xl'],
  },
  sectionInner: {
    width: '100%', maxWidth: MAX_W, alignSelf: 'center',
    paddingHorizontal: HORIZ_PCT,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.text.hint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: isWide ? typography['3xl'] - 4 : typography['2xl'],  // 36 / 32
    fontFamily: fontFamily.serif,
    fontWeight: '400',
    color: colors.text.primary,
    lineHeight: (isWide ? typography['3xl'] - 4 : typography['2xl']) * 1.2,
    letterSpacing: -0.5,
  },
  sectionDesc: {
    fontSize: typography.base,
    color: colors.text.secondary,
    lineHeight: typography.base * 1.7,
    marginTop: spacing.base,
    maxWidth: 420,
  },
  textLink: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  textLinkLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.koke,
    letterSpacing: 0.3,
  },

  // FEATURES section
  plantRight: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    width: 120, height: 220,
    opacity: 0.85,
    transform: [{ scaleX: -1 }],
  },
  featuresRow: {
    flexDirection: isWide ? 'row' : 'column',
    gap: isWide ? spacing['3xl'] : spacing['2xl'],
    alignItems: 'stretch',
  },
  featuresLeft: {
    flex: isWide ? 0.45 : undefined,
    justifyContent: 'center',
  },
  featuresRight: {
    flex: isWide ? 0.55 : undefined,
    flexDirection: 'row',
    gap: spacing.base,
    height: isWide ? 360 : 220,
  },
  placeholderBlockA: {
    flex: 0.48,
    marginTop: isWide ? spacing.xl : 0,
    backgroundColor: colors.kokeTint,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderBlockB: {
    flex: 0.52,
    backgroundColor: colors.kokeTint,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  imageOverlay: {
    backgroundColor: IMAGE_OVERLAY,
  },
  arrowBtn: {
    position: 'absolute',
    bottom: spacing.base,
    right: spacing.base,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: colors.shiro,
    alignItems: 'center', justifyContent: 'center',
  },

  // WHAT THEY SAY
  whatHeader: {
    flexDirection: isWide ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isWide ? 'flex-end' : 'flex-start',
    marginBottom: spacing['2xl'],
  },
  whatHeaderLeft: {},
  whatTitle: {
    fontSize: isWide ? typography['2xl'] : typography.xl,
    fontFamily: fontFamily.serif,
    fontWeight: '400',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  reviewList: {},
  reviewRow: {
    flexDirection: isWide ? 'row' : 'column',
    alignItems: isWide ? 'center' : 'flex-start',
    gap: spacing.base,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.usuzumi,
  },
  reviewRowFirst: {},
  reviewPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 0,
  },
  pill: {
    backgroundColor: colors.pill,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  reviewText: {
    flex: isWide ? 1 : undefined,
    fontSize: typography.sm,
    color: colors.text.primary,
    lineHeight: typography.sm * 1.6,
  },

  // ── Footer (dark) ────────────────────────────
  footer: {
    backgroundColor: colors.sumi,
  },
  footerInner: {
    width: '100%', maxWidth: MAX_W, alignSelf: 'center',
    paddingHorizontal: HORIZ_PCT,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sumiDivider,
  },
  footerTop: {
    flexDirection: isWide ? 'row' : 'column',
    gap: isWide ? spacing['2xl'] : spacing.lg,
    alignItems: 'flex-start',
  },
  footerBrandCol: {
    flex: isWide ? 1.2 : undefined,
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  footerBrandText: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '500',
    color: colors.washi,
  },
  footerTagline: {
    fontSize: typography.sm,
    color: colors.text.hint,
    marginTop: spacing.xs,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.lg,
  },
  socialIcon: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  footerCols: {
    flex: isWide ? 3 : undefined,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  footerCol: {
    flex: 1,
  },
  footerColTitle: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.text.hint,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.base,
  },
  footerLinkWrap: {
    minHeight: 32,
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: typography.sm,
    color: colors.washi,
    paddingVertical: spacing.xs,
  },
  footerMobileLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  footerDot: {
    color: colors.text.hint,
    fontSize: typography.sm,
  },
  footerBottom: {
    marginTop: spacing['2xl'],
    paddingTop: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sumiDivider,
    alignItems: 'center',
  },
  footerCopy: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },
});
