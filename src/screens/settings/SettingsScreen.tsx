// ============================================================
// 设置页 — 个人资料编辑 + Premium Coming Soon
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_EMOJIS = [
  '🏌️','⛳','🦅','🏆','🔥','🎯','💪','🌟','🤝','🍀',
  '🥇','🐯','🦁','🚀','🌿','⚡','🏅','🎳','🎪','😎',
];

const PREMIUM_FEATURES = [
  {
    icon: '📊',
    title: 'Strokes Gained Analysis',
    desc: 'See exactly where you\'re losing or gaining strokes vs. scratch golfers.',
  },
  {
    icon: '🎓',
    title: 'Coach Match',
    desc: 'Get matched with a PGA coach based on your specific weaknesses.',
  },
  {
    icon: '🏷️',
    title: 'Equipment Recommendations',
    desc: 'AI-powered club & ball recommendations based on your swing data.',
  },
  {
    icon: '📈',
    title: 'Advanced Trend Reports',
    desc: 'Monthly PDF reports with deep dives into your improvement trajectory.',
  },
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
    const { error: err } = await supabase
      .from('profiles')
      .upsert({
        id:           user!.id,
        username:     username.trim(),
        avatar_url:   avatarEmoji,
        years_playing: yearsPlaying ? parseInt(yearsPlaying, 10) : null,
      });

    setSaving(false);
    if (err) {
      setError('Failed to save. Please try again.');
    } else {
      setSaveMsg('✓ Profile saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#1a472a" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Profile Section ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          {/* Avatar emoji picker */}
          <Text style={styles.fieldLabel}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.avatarBtn, avatarEmoji === e && styles.avatarBtnActive]}
                onPress={() => setAvatar(e)}
              >
                <Text style={styles.avatarEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Username */}
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={t => { setUsername(t); setError(''); setSaveMsg(''); }}
            placeholder="Your username"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            maxLength={30}
          />

          {/* Years playing */}
          <Text style={styles.fieldLabel}>Years Playing Golf</Text>
          <TextInput
            style={styles.input}
            value={yearsPlaying}
            onChangeText={t => { setYears(t.replace(/[^0-9]/g, '')); setSaveMsg(''); }}
            placeholder="e.g. 5"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
            maxLength={2}
          />

          {/* Errors / success */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️  {error}</Text>
            </View>
          ) : null}
          {saveMsg ? (
            <Text style={styles.saveMsg}>{saveMsg}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#1a472a" />
              : <Text style={styles.saveBtnText}>Save Profile</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Account Section ───────────────────────────────── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <Ionicons name="mail-outline" size={18} color="#888" />
            <Text style={styles.accountEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color="#e53935" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Premium Section ───────────────────────────────── */}
        <View style={styles.premiumHeader}>
          <Text style={styles.sectionTitle}>Premium</Text>
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
        <View style={styles.premiumBanner}>
          <Text style={styles.premiumBannerTitle}>⭐ Everyone 72 Premium</Text>
          <Text style={styles.premiumBannerSub}>
            Unlock advanced analytics, coach matching, and personalized insights to level up your game.
          </Text>
        </View>

        {PREMIUM_FEATURES.map(f => (
          <View key={f.title} style={styles.premiumCard}>
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.premiumIcon}>{f.icon}</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>{f.title}</Text>
              <Text style={styles.premiumDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.notifyBtn}>
          <Text style={styles.notifyBtnText}>🔔 Notify Me When Premium Launches</Text>
        </TouchableOpacity>

        {/* Legal */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Everyone 72  ·  v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    backgroundColor: '#1a472a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backBtn: { width: 38, padding: 4 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 2 },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarBtnActive: {
    borderColor: '#1a472a',
    backgroundColor: '#e8f5e9',
  },
  avatarEmoji: { fontSize: 22 },
  input: {
    backgroundColor: '#f5f5f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorBox: {
    backgroundColor: 'rgba(220,53,69,0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(220,53,69,0.25)',
  },
  errorText: { color: '#c62828', fontSize: 13 },
  saveMsg: { color: '#2e7d32', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  accountEmail: { fontSize: 14, color: '#555' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  signOutText: { color: '#e53935', fontSize: 15, fontWeight: '600' },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonPill: {
    backgroundColor: '#d4af37',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  comingSoonText: { fontSize: 10, fontWeight: 'bold', color: '#1a472a' },
  premiumBanner: {
    backgroundColor: '#1a472a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  premiumBannerTitle: { color: '#d4af37', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  premiumBannerSub: { color: '#a8d5b5', fontSize: 13, lineHeight: 20 },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  lockOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  lockIcon: { fontSize: 16 },
  premiumIcon: { fontSize: 30 },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  premiumDesc: { fontSize: 12, color: '#888', marginTop: 3, lineHeight: 18 },
  notifyBtn: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffd54f',
  },
  notifyBtnText: { color: '#795548', fontWeight: '600', fontSize: 14 },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  legalLink: { color: '#aaa', fontSize: 12, textDecorationLine: 'underline' },
  legalSep: { color: '#ccc', fontSize: 12 },
  version: { textAlign: 'center', fontSize: 11, color: '#ccc' },
});
