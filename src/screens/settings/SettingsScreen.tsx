// ============================================================
// 设置页 — 个人资料编辑 + Premium Coming Soon + 退出登录
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isDevMockActive, MOCK_PROFILE } from '../../lib/mockUser';
import { RootStackParamList } from '../../navigation';
import {
  Card, ListItem, LoadingSpinner, PrimaryButton, ScreenHeader, SecondaryButton,
} from '../../components';
import { colors, radius, spacing, typography } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const PREMIUM_FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'stats-chart-outline',   title: 'Strokes Gained Analysis',
    desc: "See exactly where you're losing or gaining strokes vs. scratch golfers." },
  { icon: 'school-outline',        title: 'Coach Match',
    desc: 'Get matched with a PGA coach based on your specific weaknesses.' },
  { icon: 'golf-outline',          title: 'Equipment Recommendations',
    desc: 'AI-powered club & ball recommendations based on your swing data.' },
  { icon: 'document-text-outline', title: 'Advanced Trend Reports',
    desc: 'Monthly PDF reports with deep dives into your improvement trajectory.' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, signOut } = useAuth();

  const [username, setUsername]     = useState('');
  const [avatarEmoji, setAvatar]    = useState('🏌️');
  const [yearsPlaying, setYears]    = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (isDevMockActive()) {
      setUsername(MOCK_PROFILE.username);
      setAvatar(MOCK_PROFILE.avatar_url);
      setYears('8');
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, years_playing')
      .eq('id', user!.id)
      .maybeSingle();

    if (data) {
      setUsername(data.username ?? '');
      setAvatar(data.avatar_url ?? '🏌️');
      setYears(data.years_playing != null ? String(data.years_playing) : '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setError('');
    setSaveMsg('');
    if (!username.trim()) { setError('Username cannot be empty.'); return; }

    setSaving(true);

    if (isDevMockActive()) {
      await new Promise(r => setTimeout(r, 400));
      setSaving(false);
      setSaveMsg('Profile saved');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }

    const { error: err } = await supabase
      .from('profiles')
      .upsert({
        id:            user!.id,
        username:      username.trim(),
        avatar_url:    avatarEmoji,
        years_playing: yearsPlaying ? parseInt(yearsPlaying, 10) : null,
      });

    setSaving(false);
    if (err) {
      setError('Failed to save. Please try again.');
    } else {
      setSaveMsg('Profile saved');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
        <LoadingSpinner fullscreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile ─────────────────────────────────── */}
        <SectionTitle>Profile</SectionTitle>
        <Card style={styles.card}>
          <View
            style={styles.letterAvatar}
            accessible
            accessibilityLabel={`Avatar for ${username || 'user'}`}
          >
            <Text style={styles.letterAvatarText}>
              {(username.trim()[0] ?? '?').toUpperCase()}
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={t => { setUsername(t); setError(''); setSaveMsg(''); }}
            placeholder="Your username"
            placeholderTextColor={colors.text.hint}
            autoCapitalize="none"
            maxLength={30}
            accessibilityLabel="Username"
            accessibilityHint="Displayed on leaderboards and practice feed"
          />

          <Text style={styles.fieldLabel}>Years Playing Golf</Text>
          <TextInput
            style={styles.input}
            value={yearsPlaying}
            onChangeText={t => { setYears(t.replace(/[^0-9]/g, '')); setSaveMsg(''); }}
            placeholder="e.g. 5"
            placeholderTextColor={colors.text.hint}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Years playing golf"
          />

          {error ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}
          {saveMsg ? (
            <Text style={styles.saveMsg} accessibilityLiveRegion="polite">
              ✓ {saveMsg}
            </Text>
          ) : null}

          <View style={styles.saveWrap}>
            <PrimaryButton
              label="Save Profile"
              onPress={handleSave}
              loading={saving}
              accessibilityHint="Updates your profile"
            />
          </View>
        </Card>

        {/* ── Account ─────────────────────────────────── */}
        <SectionTitle>Account</SectionTitle>
        <Card style={styles.listCard}>
          <ListItem
            title={user?.email ?? 'Signed in'}
            subtitle="Email"
            leftIcon={
              <Ionicons name="mail-outline" size={18} color={colors.text.secondary} />
            }
            showArrow={false}
            divider={false}
          />
        </Card>
        <View style={styles.signOutWrap}>
          <SecondaryButton
            label="Sign Out"
            onPress={signOut}
            accessibilityHint="Logs you out of your account"
          />
        </View>

        {/* ── Premium ─────────────────────────────────── */}
        <View style={styles.premiumHeaderRow}>
          <SectionTitle style={styles.premiumSectionTitle}>Premium</SectionTitle>
          <View style={styles.comingSoonPill} accessible={false}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>

        <Card style={styles.premiumBanner}>
          <Text style={styles.premiumBannerTitle} accessibilityRole="header">
            Everyone 72 Premium
          </Text>
          <Text style={styles.premiumBannerSub}>
            Unlock advanced analytics, coach matching, and personalized insights to level up your game.
          </Text>
        </Card>

        <Card style={styles.premiumListCard}>
          {PREMIUM_FEATURES.map((f, i) => (
            <PremiumRow
              key={f.title}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              last={i === PREMIUM_FEATURES.length - 1}
            />
          ))}
        </Card>

        <View style={styles.notifyWrap}>
          <SecondaryButton
            label="Notify me when Premium launches"
            onPress={() => { /* fake-door: waitlist */ }}
            accessibilityHint="Adds you to the Premium launch waitlist"
          />
        </View>

        {/* ── Legal ───────────────────────────────────── */}
        <Card style={styles.listCard}>
          <ListItem
            title="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <ListItem
            title="Terms of Service"
            onPress={() => navigation.navigate('Terms')}
            divider={false}
          />
        </Card>

        <Text style={styles.version} accessibilityLabel="Everyone 72 version 1.0.0">
          Everyone 72 · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Subcomponents ─────────────────────────────────────────────

function SectionTitle({
  children, style,
}: { children: React.ReactNode; style?: any }) {
  return (
    <Text
      style={[styles.sectionTitle, style]}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

function PremiumRow({
  icon, title, desc, last,
}: { icon: IconName; title: string; desc: string; last: boolean }) {
  return (
    <View
      style={[styles.premiumRow, !last && styles.premiumDivider]}
      accessible
      accessibilityLabel={`${title} (locked). ${desc}`}
    >
      <View style={styles.premiumIconWrap} accessible={false}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.text.secondary}
          accessible={false}
        />
      </View>
      <View style={styles.premiumInfo}>
        <Text style={styles.premiumTitle}>{title}</Text>
        <Text style={styles.premiumDesc}>{desc}</Text>
      </View>
      <Ionicons
        name="lock-closed-outline"
        size={16}
        color={colors.text.hint}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  sectionTitle: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  card: {
    gap: spacing.sm,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },

  // Fields
  fieldLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  letterAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.koke,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  letterAvatarText: {
    color: colors.shiro,
    fontSize: typography.xl,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pressed: { opacity: 0.6 },

  input: {
    backgroundColor: colors.washi,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.text.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
  },

  errorBox: {
    backgroundColor: colors.washi,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.aka,
  },
  errorText: {
    color: colors.aka,
    fontSize: typography.sm,
  },
  saveMsg: {
    color: colors.koke,
    fontSize: typography.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveWrap: { marginTop: spacing.sm },

  signOutWrap: {
    marginTop: spacing.md,
  },

  // Premium
  premiumHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumSectionTitle: { marginBottom: spacing.sm },
  comingSoonPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.kincha,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.kincha,
    letterSpacing: 0.5,
  },

  premiumBanner: {
    borderLeftWidth: 3,
    borderLeftColor: colors.kincha,
    marginBottom: spacing.md,
  },
  premiumBannerTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  premiumBannerSub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    lineHeight: typography.sm * 1.5,
  },

  premiumListCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  premiumDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.usuzumi,
  },
  premiumIconWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumInfo: { flex: 1 },
  premiumTitle: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  premiumDesc: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: typography.xs * 1.6,
  },

  notifyWrap: { marginTop: spacing.xs, marginBottom: spacing.md },

  version: {
    textAlign: 'center',
    fontSize: typography.xs,
    color: colors.text.hint,
    marginTop: spacing.base,
    letterSpacing: 0.3,
  },
});
