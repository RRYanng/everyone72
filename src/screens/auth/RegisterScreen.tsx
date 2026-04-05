// ============================================================
// 注册界面 — 使用内联错误提示（Alert.alert 在 Web 端不可靠）
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation';
import { supabase } from '../../lib/supabase';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const handleRegister = async () => {
    // ── 清除旧错误 ──────────────────────────────────────────
    setError(null);

    // ── 前端校验 ────────────────────────────────────────────
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // ── Step 1: 创建 Auth 用户 ───────────────────────────
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        // 把 Supabase 的英文错误转为更友好的提示
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

      // ── Step 2: 创建 profile 行 ──────────────────────────
      // 邮箱验证关闭时 data.session 不为 null，RLS auth.uid() 有效
      if (data.user && data.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, username: username.trim(), email: email.trim().toLowerCase() });

        if (profileError) {
          console.error('[Register] profile insert error:', profileError);
          // profile 创建失败不阻止登录，记录错误即可
          // onAuthStateChange 已触发，用户会进入主界面
        }
        // session 已存在 → onAuthStateChange 自动切换到主界面，无需手动 navigate

      } else if (data.user && !data.session) {
        // 邮箱验证仍开启的回退：显示提示让用户去查邮件
        setLoading(false);
        setSuccess(true);
        return;
      }

    } catch (err: any) {
      console.error('[Register] unexpected error:', err);
      setError('Something went wrong. Please check your connection and try again.');
    }

    setLoading(false);
  };

  // ── 邮箱验证回退页面 ──────────────────────────────────────
  if (success) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📧</Text>
        <Text style={[styles.title, { textAlign: 'center' }]}>Check Your Email</Text>
        <Text style={{ color: '#a8d5b5', textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
          We sent a confirmation link to{'\n'}
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{email}</Text>
          {'\n\n'}Click the link to activate your account, then come back and sign in.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { marginTop: 32 }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── 主注册表单 ────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 返回按钮 */}
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Everyone 72 and start tracking your game</Text>

        {/* 内联错误提示框 */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={(t) => { setUsername(t); setError(null); }}
            autoCapitalize="none"
          />
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
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1a472a" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>
              Already have an account?{' '}
              <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a472a',
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    color: '#a8d5b5',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8d5b5',
    marginBottom: 24,
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
});
