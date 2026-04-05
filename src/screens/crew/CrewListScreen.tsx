// ============================================================
// Crew 列表 — 我的球友小组 + 创建 / 加入
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Crew } from '../../types';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function CrewListScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [crews, setCrews]             = useState<Crew[]>([]);
  const [loading, setLoading]         = useState(true);
  const [inviteCode, setInviteCode]   = useState('');
  const [joining, setJoining]         = useState(false);
  const [joinError, setJoinError]     = useState('');

  useFocusEffect(
    useCallback(() => { fetchCrews(); }, [user])
  );

  const fetchCrews = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all crews the user belongs to, with member count
    const { data: memberRows } = await supabase
      .from('crew_members')
      .select('crew_id')
      .eq('user_id', user.id);

    if (!memberRows || memberRows.length === 0) {
      setCrews([]);
      setLoading(false);
      return;
    }

    const crewIds = memberRows.map(r => r.crew_id);

    const { data: crewData } = await supabase
      .from('crews')
      .select('*')
      .in('id', crewIds)
      .order('created_at', { ascending: false });

    if (!crewData) { setLoading(false); return; }

    // Fetch member counts per crew
    const { data: countData } = await supabase
      .from('crew_members')
      .select('crew_id')
      .in('crew_id', crewIds);

    const countMap: Record<string, number> = {};
    (countData ?? []).forEach(r => {
      countMap[r.crew_id] = (countMap[r.crew_id] ?? 0) + 1;
    });

    setCrews(crewData.map(c => ({ ...c, member_count: countMap[c.id] ?? 1 })));
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoinError('');
    setJoining(true);

    // Look up crew by invite code
    const { data: crew } = await supabase
      .from('crews')
      .select('id, name, max_members')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (!crew) {
      setJoinError('Invite code not found. Please check and try again.');
      setJoining(false);
      return;
    }

    // Check member count
    const { count } = await supabase
      .from('crew_members')
      .select('id', { count: 'exact', head: true })
      .eq('crew_id', crew.id);

    if ((count ?? 0) >= crew.max_members) {
      setJoinError(`${crew.name} is full (${crew.max_members} members max).`);
      setJoining(false);
      return;
    }

    // Check not already a member
    const { data: existing } = await supabase
      .from('crew_members')
      .select('id')
      .eq('crew_id', crew.id)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (existing) {
      setJoinError("You're already a member of this crew.");
      setJoining(false);
      return;
    }

    const { error } = await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: user!.id, role: 'member' });

    setJoining(false);
    if (error) {
      setJoinError('Failed to join. Please try again.');
    } else {
      setInviteCode('');
      fetchCrews();
      navigation.navigate('CrewDetail', { crewId: crew.id });
    }
  };

  const renderCrew = ({ item }: { item: Crew }) => (
    <TouchableOpacity
      style={styles.crewCard}
      onPress={() => navigation.navigate('CrewDetail', { crewId: item.id })}
    >
      <Text style={styles.crewEmoji}>{item.emoji}</Text>
      <View style={styles.crewInfo}>
        <Text style={styles.crewName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.crewDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <Text style={styles.crewMeta}>
          👥 {item.member_count}/{item.max_members} members
          {item.creator_id === user?.id ? '  ·  Owner' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Golf Crew</Text>
          <Text style={styles.headerSub}>Your golf squads</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateCrew')}
        >
          <Ionicons name="add" size={22} color="#1a472a" />
          <Text style={styles.createBtnText}>New Crew</Text>
        </TouchableOpacity>
      </View>

      {/* Join by invite code */}
      <View style={styles.joinBox}>
        <Text style={styles.joinLabel}>Have an invite code?</Text>
        <View style={styles.joinRow}>
          <TextInput
            style={styles.joinInput}
            placeholder="Enter invite code"
            placeholderTextColor="#aaa"
            value={inviteCode}
            onChangeText={t => { setInviteCode(t); setJoinError(''); }}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.joinBtn, joining && { opacity: 0.6 }]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.joinBtnText}>Join</Text>
            }
          </TouchableOpacity>
        </View>
        {joinError ? <Text style={styles.joinError}>⚠️ {joinError}</Text> : null}
      </View>

      {/* Quick links */}
      <View style={styles.quickLinks}>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => navigation.navigate('Friends')}
        >
          <Ionicons name="person-add-outline" size={16} color="#1a472a" />
          <Text style={styles.quickLinkText}>Friends</Text>
        </TouchableOpacity>
        <View style={styles.quickLinkDivider} />
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="trophy-outline" size={16} color="#1a472a" />
          <Text style={styles.quickLinkText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Crew list */}
      {loading ? (
        <ActivityIndicator size="large" color="#1a472a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={crews}
          keyExtractor={i => i.id}
          renderItem={renderCrew}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⛳</Text>
              <Text style={styles.emptyTitle}>No crews yet</Text>
              <Text style={styles.emptySub}>
                Create a crew to compete and track progress with friends!
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateCrew')}
              >
                <Text style={styles.emptyBtnText}>Create My First Crew</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    backgroundColor: '#1a472a',
    padding: 20,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#a8d5b5', fontSize: 12, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  createBtnText: { color: '#1a472a', fontWeight: 'bold', fontSize: 14 },
  joinBox: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  joinLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  joinRow: { flexDirection: 'row', gap: 10 },
  joinInput: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    letterSpacing: 2,
  },
  joinBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  joinError: { color: '#e53935', fontSize: 13, marginTop: 8 },
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  crewEmoji: { fontSize: 36 },
  crewInfo: { flex: 1 },
  crewName: { fontSize: 16, fontWeight: '700', color: '#1a472a' },
  crewDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  crewMeta: { fontSize: 12, color: '#aaa', marginTop: 4 },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a472a', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  quickLinks: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },
  quickLinkText: { fontSize: 14, fontWeight: '600', color: '#1a472a' },
  quickLinkDivider: { width: 1, backgroundColor: '#e0e0e0', marginVertical: 8 },
});
