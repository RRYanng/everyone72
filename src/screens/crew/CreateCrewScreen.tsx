// ============================================================
// 创建 Crew — 名称 / Emoji / 描述
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const EMOJI_OPTIONS = [
  '⛳','🏌️','🏆','⚡','🔥','🎯','💪','🌟','🦅','🐯',
  '🏅','🥇','🎳','🚀','🌿','🤝','🦁','🏋️','🎪','🍀',
];

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function CreateCrewScreen() {
  const navigation = useNavigation<NavProp>();
  const { user }   = useAuth();

  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [emoji, setEmoji]       = useState('⛳');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter a crew name.'); return; }
    if (name.trim().length > 40) { setError('Crew name must be 40 characters or less.'); return; }

    setLoading(true);

    // Generate unique invite code (retry if collision)
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('crews')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Create crew
    const { data: crew, error: crewErr } = await supabase
      .from('crews')
      .insert({
        name:        name.trim(),
        description: desc.trim(),
        emoji,
        creator_id:  user!.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (crewErr || !crew) {
      setError('Failed to create crew. Please try again.');
      setLoading(false);
      return;
    }

    // Add creator as owner member
    await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: user!.id, role: 'owner' });

    setLoading(false);
    navigation.replace('CrewDetail', { crewId: crew.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a Crew</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Emoji picker */}
        <Text style={styles.label}>Choose an Emoji</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiOption}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={styles.label}>Crew Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Weekend Warriors"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={t => { setName(t); setError(''); }}
          maxLength={40}
        />
        <Text style={styles.charCount}>{name.length}/40</Text>

        {/* Description */}
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="What's this crew about?"
          placeholderTextColor="#aaa"
          value={desc}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          maxLength={120}
        />

        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewEmoji}>{emoji}</Text>
          <View>
            <Text style={styles.previewName}>{name || 'My Crew'}</Text>
            <Text style={styles.previewMeta}>👥 1/8 members  ·  Invite code will be generated</Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#1a472a" />
            : <Text style={styles.createBtnText}>Create Crew ⛳</Text>
          }
        </TouchableOpacity>
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
  backBtn: { padding: 4, width: 38 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 16 },
  required: { color: '#e53935' },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  emojiBtnActive: {
    borderColor: '#1a472a',
    backgroundColor: '#e8f5e9',
  },
  emojiOption: { fontSize: 24 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: 4 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewEmoji: { fontSize: 40 },
  previewName: { fontSize: 16, fontWeight: '700', color: '#1a472a' },
  previewMeta: { fontSize: 12, color: '#aaa', marginTop: 4 },
  errorBox: {
    backgroundColor: 'rgba(220,53,69,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(220,53,69,0.3)',
  },
  errorText: { color: '#c62828', fontSize: 14 },
  createBtn: {
    backgroundColor: '#d4af37',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  createBtnText: { color: '#1a472a', fontSize: 17, fontWeight: 'bold' },
});
