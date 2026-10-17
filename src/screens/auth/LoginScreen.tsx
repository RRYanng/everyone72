// ============================================================
// 登录界面 — 使用内联错误提示（Alert.alert 在 Web 端不可靠）
// 视觉:Japandi(见 authUI.tsx)。认证逻辑与之前完全一致。
// ============================================================

import React, { useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation';
import { track } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { AuthShell, AuthField, AuthNotice, AuthButton, AuthLink, AuthLegal } from './authUI';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        const msg = signInError.message;
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          setError('Incorrect email or password. Please try again.');
        } else if (msg.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link first.');
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }
      track('login');
      // 登录成功 → onAuthStateChange 自动切换到主界面，无需手动导航

    } catch (err: any) {
      console.error('[Login] unexpected error:', err);
      setError('Something went wrong. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where your last round left off."
      footer={
        <>
          <AuthLink
            lead="New here?"
            action="Create an account"
            onPress={() => navigation.navigate('Register')}
            accessibilityLabel="Create an account"
          />
          <AuthLegal
            onPrivacy={() => navigation.navigate('PrivacyPolicy')}
            onTerms={() => navigation.navigate('Terms')}
          />
        </>
      }
    >
      {/* 错误提示 */}
      {error ? <AuthNotice message={error} /> : null}

      {/* 表单 */}
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
        placeholder="Your password"
        value={password}
        onChangeText={(t) => { setPassword(t); setError(null); }}
        secureTextEntry
      />
      <AuthButton label="Sign in" accessibilityLabel="Sign In" onPress={handleLogin} loading={loading} />
    </AuthShell>
  );
}
