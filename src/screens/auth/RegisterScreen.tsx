// ============================================================
// 注册界面 — Golf Journal 设计语言（warm cream + serif + 水彩底图）
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// 水彩底图配色（同 HomeScreen / CrewListScreen 的水彩 SVG 用色）
const GRASS_LIGHT = '#DDE8D8';
const GRASS_MID   = '#C8DFC8';
const SAND        = '#E8DFC8';
const TREE_GREEN  = '#A8C8A0';

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [username, setUsername]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!username.trim()) { setError('Please enter a username.'); return; }
    if (!email.trim())    { setError('Please enter your email.'); return; }
    if (!password)        { setError('Please enter a password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        const msg = signUpError.message;
        if (msg.includes('already registered') || msg.includes('User already registered')) {
          setError('This email is already registered. Try signing in instead.');
        } else if (msg.includes('invalid') && msg.includes('email')) {
          setError('Please enter a valid email address.');
        } else if (msg.includes('Password')) {
          setError('Password too weak. Use at least 6 characters.');
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username.trim(),
            email: email.trim().toLowerCase(),
          });
        if (profileError) console.error('[Register] profile insert error:', profileError);
      } else if (data.user && !data.session) {
        setLoading(false);
        setSuccess(true);
        return;
      }
    } catch (err) {
      console.error('[Register] unexpected error:', err);
      setError('Something went wrong. Please check your connection and try again.');
    }

    setLoading(false);
  };

  // ── Email-confirmation 回退页 ──────────────────────────────
  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon} accessible={false}>📧</Text>
        <Text style={styles.successTitle} accessibilityRole="header">Check Your Email</Text>
        <Text style={styles.successText}>
          We sent a confirmation link to{'\n'}
          <Text style={styles.successEmail}>{email}</Text>
          {'\n\n'}Click the link to activate your account, then come back and sign in.
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Go to sign in"
          style={({ pressed }) => [styles.primaryBtn, styles.successBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formArea}>
          {/* Back link */}
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="link"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={16} color={colors.text.secondary} accessible={false} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title} accessibilityRole="header">Create Account</Text>
          <Text style={styles.subtitle}>
            Join Everyone 72 and start tracking your game
          </Text>

          {error ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <InputField
              icon="person-outline"
              placeholder="Username"
              value={username}
              onChangeText={(t) => { setUsername(t); setError(null); }}
              autoCapitalize="none"
              accessibilityLabel="Username"
            />
            <InputField
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email"
            />
            <InputField
              icon="lock-closed-outline"
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              secureTextEntry={!showPwd}
              accessibilityLabel="Password"
              trailing={
                <Pressable
                  onPress={() => setShowPwd(s => !s)}
                  accessibilityRole="button"
                  accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
                  hitSlop={8}
                  style={({ pressed }) => [styles.eyeBtn, pressed && styles.pressed]}
                >
                  <Ionicons
                    name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.text.secondary}
                  />
                </Pressable>
              }
            />

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: loading, busy: loading }}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && styles.primaryBtnDisabled,
                pressed && !loading && styles.pressed,
              ]}
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="link"
              accessibilityLabel="Sign in to existing account"
              style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom watercolor course illustration */}
        <View style={styles.illustrationWrap} pointerEvents="none" accessible={false}>
          <CourseIllustration />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Input field with leading icon + optional trailing ──────────

function InputField({
  icon, placeholder, value, onChangeText, secureTextEntry, autoCapitalize,
  keyboardType, accessibilityLabel, trailing,
}: {
  icon: IconName;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  accessibilityLabel: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.inputField}>
      <Ionicons
        name={icon}
        size={18}
        color={colors.text.secondary}
        accessible={false}
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.text.hint}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel}
      />
      {trailing}
    </View>
  );
}

// ── Bottom watercolor course illustration ──────────────────────

function CourseIllustration() {
  return (
    <Svg
      width="100%"
      height={180}
      viewBox="0 0 800 180"
      preserveAspectRatio="xMidYMax slice"
    >
      {/* Distant mountain ridge (very pale) */}
      <Path
        d="M 0 50 Q 120 25, 240 45 Q 360 20, 480 45 Q 600 25, 720 40 Q 760 35, 800 50 L 800 95 L 0 95 Z"
        fill={GRASS_LIGHT}
        opacity={0.6}
      />
      {/* Mid hills */}
      <Path
        d="M 0 80 Q 150 60, 300 75 Q 450 65, 600 78 Q 720 72, 800 80 L 800 125 L 0 125 Z"
        fill={GRASS_MID}
        opacity={0.7}
      />
      {/* Foreground fairway */}
      <Path
        d="M 0 115 Q 200 95, 400 110 Q 600 100, 800 115 L 800 180 L 0 180 Z"
        fill={GRASS_MID}
        opacity={0.85}
      />
      {/* Trees on left */}
      <Circle cx={70}  cy={95}  r={14} fill={TREE_GREEN} opacity={0.65} />
      <Circle cx={95}  cy={100} r={10} fill={TREE_GREEN} opacity={0.55} />
      {/* Trees on right */}
      <Circle cx={700} cy={88}  r={12} fill={TREE_GREEN} opacity={0.65} />
      <Circle cx={725} cy={94}  r={15} fill={TREE_GREEN} opacity={0.55} />
      <Circle cx={748} cy={90}  r={9}  fill={TREE_GREEN} opacity={0.5} />
      {/* Putting green (large, center) */}
      <Ellipse cx={460} cy={150} rx={120} ry={20} fill={GRASS_MID} opacity={0.55} />
      {/* Flag pole */}
      <Line
        x1={485}
        y1={150}
        x2={485}
        y2={105}
        stroke={colors.text.secondary}
        strokeWidth={1}
        opacity={0.5}
      />
      {/* Flag */}
      <Path
        d="M 485 105 L 510 110 L 485 117 Z"
        fill={colors.kincha}
        opacity={0.65}
      />
      {/* Sand bunker — large left of green */}
      <Ellipse cx={300} cy={160} rx={70} ry={10} fill={SAND} opacity={0.85} />
      {/* Sand bunker — small right */}
      <Ellipse cx={620} cy={165} rx={45} ry={7} fill={SAND} opacity={0.8} />
    </Svg>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.washi,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: spacing['2xl'],
  },
  pressed: { opacity: 0.6 },

  formArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Back
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: typography.sm,
    color: colors.text.secondary,
  },

  // Title block
  title: {
    fontSize: typography['2xl'],
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    lineHeight: typography.sm * 1.5,
  },

  // Error
  errorBox: {
    backgroundColor: colors.shiro,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.aka,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.aka,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.4,
  },

  // Form
  form: { gap: spacing.md },

  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  inputIcon: { width: 20, textAlign: 'center' },
  input: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text.primary,
    height: '100%',
    // Web outline reset
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}),
  },
  eyeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Primary button
  primaryBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.koke,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: colors.shiro,
    fontSize: typography.base,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Sign-in link
  linkWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: typography.sm,
    color: colors.text.secondary,
  },
  linkBold: {
    color: colors.koke,
    fontWeight: '600',
  },

  // Bottom illustration
  illustrationWrap: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },

  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: colors.washi,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successIcon: { fontSize: 48, marginBottom: spacing.base },
  successTitle: {
    fontSize: typography['2xl'],
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  successText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
    fontSize: typography.sm,
  },
  successEmail: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  successBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    minWidth: 200,
  },
});
