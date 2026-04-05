// ============================================================
// 登录界面 — 使用内联错误提示（Alert.alert 在 Web 端不可靠）
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation';
import { supabase } from '../../lib/supabase';

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
      // 登录成功 → onAuthStateChange 自动切换到主界面，无需手动导航

    } catch (err: any) {
      console.error('[Login] unexpected error:', err);
      setError('Something went wrong. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo 区域 */}
      <View style={styles.logoArea}>
        <Text style={styles.logoEmoji}>⛳</Text>
        <Text style={styles.appName}>Everyone 72</Text>
        <Text style={styles.tagline}>Play better. Track smarter.</Text>
      </View>

      {/* 错误提示 */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️  {error}</Text>
        </View>
      ) : null}

      {/* 表单 */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>
            Don't have an account?{' '}
            <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        {/* Legal links */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a472a',
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#a8d5b5',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(220, 53, 69, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.6)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb3ba',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btn: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#1a472a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#a8d5b5',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  linkBold: {
    color: '#fff',
    fontWeight: 'bold',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSep: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
});
