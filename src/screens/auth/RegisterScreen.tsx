// ============================================================
// 注册界面 — Japandi 视觉(见 authUI.tsx)。认证逻辑与之前完全一致。
// ============================================================

import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation';
import { track } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthField, AuthNotice, AuthButton, AuthLink } from './authUI';
import { colors } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

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
        track('sign_up');
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
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Open it to activate your account, then come back and sign in.`}
      >
        <AuthButton
          label="Go to sign in"
          accessibilityLabel="Go to sign in"
          onPress={() => navigation.navigate('Login')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Begin gently"
      subtitle="A quiet place to keep every round, and to see how your game is growing."
      footer={
        <AuthLink
          lead="Already have an account?"
          action="Sign in"
          onPress={() => navigation.navigate('Login')}
          accessibilityLabel="Sign in to existing account"
        />
      }
    >
      {error ? <AuthNotice message={error} /> : null}

      <AuthField
        label="Username"
        placeholder="How friends will see you"
        value={username}
        onChangeText={(t) => { setUsername(t); setError(null); }}
        autoCapitalize="none"
      />
      <AuthField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(null); }}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <AuthField
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={(t) => { setPassword(t); setError(null); }}
        secureTextEntry={!showPwd}
        trailing={
          <Pressable
            onPress={() => setShowPwd(s => !s)}
            accessibilityRole="button"
            accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.inkSoft}
            />
          </Pressable>
        }
      />
      <AuthButton
        label="Create account"
        accessibilityLabel="Create account"
        onPress={handleRegister}
        loading={loading}
      />
    </AuthShell>
  );
}
