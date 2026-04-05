// ============================================================
// Crew 详情 — 成员 / 排行榜 / 挑战
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Crew, CrewMember, CrewChallenge } from '../../types';
import { RootStackParamList } from '../../navigation';

type NavProp  = NativeStackNavigationProp<RootStackParamList>;
type RouteT   = RouteProp<RootStackParamList, 'CrewDetail'>;

type Tab = 'members' | 'leaderboard' | 'challenges';

// ── helpers ───────────────────────────────────────────────────
function calcHandicap(rounds: { score_vs_par: number }[]): number | null {
  if (rounds.length === 0) return null;
  const diffs = [...rounds].map(r => r.score_vs_par).sort((a, b) => a - b);
  const take  = Math.min(Math.ceil(diffs.length / 2), 8);
  const best  = diffs.slice(0, take);
  return Math.round((best.reduce((s, d) => s + d, 0) / best.length) * 10) / 10;
}

function daysLeft(deadline: string | null): string {
  if (!deadline) return '';
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return 'Ended';
  if (diff === 0) return 'Last day!';
  return `${diff}d left`;
}

// ── Component ─────────────────────────────────────────────────
export default function CrewDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteT>();
  const { user }   = useAuth();
  const { crewId } = route.params;

  const [crew, setCrew]               = useState<Crew | null>(null);
  const [members, setMembers]         = useState<CrewMember[]>([]);
  const [challenges, setChallenges]   = useState<CrewChallenge[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<Tab>('members');

  // New challenge form
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [chTitle, setChTitle]           = useState('');
  const [chDesc, setChDesc]             = useState('');
  const [chType, setChType]             = useState<'score'|'practice'|'handicap'>('score');
  const [chTarget, setChTarget]         = useState('');
  const [chDeadline, setChDeadline]     = useState('');
  const [creatingCh, setCreatingCh]     = useState(false);
  const [chError, setChError]           = useState('');

  useFocusEffect(
    useCallback(() => { loadAll(); }, [crewId])
  );

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadCrew(), loadMembers(), loadChallenges()]);
    setLoading(false);
  };

  const loadCrew = async () => {
    const { data } = await supabase
      .from('crews')
      .select('*')
      .eq('id', crewId)
      .maybeSingle();
    if (data) setCrew(data as Crew);
  };

  const loadMembers = async () => {
    // 1. Get crew members
    const { data: memberRows } = await supabase
      .from('crew_members')
      .select('id, crew_id, user_id, role, joined_at')
      .eq('crew_id', crewId);

    if (!memberRows || memberRows.length === 0) { setMembers([]); return; }

    const userIds = memberRows.map(m => m.user_id);

    // 2. Get profiles (usernames)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    // 3. Get user_stats (streak, total_practices)
    const { data: statsRows } = await supabase
      .from('user_stats')
      .select('user_id, current_streak, total_practices')
      .in('user_id', userIds);

    // 4. Get recent rounds for handicap computation (last 20 per member)
    const { data: roundRows } = await supabase
      .from('rounds')
      .select('user_id, score_vs_par')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(200);

    // Build lookup maps
    const profileMap: Record<string, string> = {};
    (profiles ?? []).forEach(p => { profileMap[p.id] = p.username; });

    const statsMap: Record<string, { streak: number; practices: number }> = {};
    (statsRows ?? []).forEach(s => {
      statsMap[s.user_id] = { streak: s.current_streak, practices: s.total_practices };
    });

    const roundsMap: Record<string, { score_vs_par: number }[]> = {};
    (roundRows ?? []).forEach(r => {
      if (!roundsMap[r.user_id]) roundsMap[r.user_id] = [];
      if (roundsMap[r.user_id].length < 20) roundsMap[r.user_id].push(r);
    });

    const enriched: CrewMember[] = memberRows.map(m => ({
      ...m,
      username:         profileMap[m.user_id] ?? 'Unknown',
      current_streak:   statsMap[m.user_id]?.streak    ?? 0,
      total_practices:  statsMap[m.user_id]?.practices ?? 0,
      recent_handicap:  calcHandicap(roundsMap[m.user_id] ?? []),
    }));

    setMembers(enriched);
  };

  const loadChallenges = async () => {
    const { data } = await supabase
      .from('crew_challenges')
      .select(`
        *,
        profiles:created_by ( username )
      `)
      .eq('crew_id', crewId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setChallenges(data.map((c: any) => ({
        ...c,
        creator_username: c.profiles?.username ?? 'Unknown',
      })));
    }
  };

  const createChallenge = async () => {
    setChError('');
    if (!chTitle.trim()) { setChError('Please enter a challenge title.'); return; }
    setCreatingCh(true);

    const { error } = await supabase
      .from('crew_challenges')
      .insert({
        crew_id:        crewId,
        created_by:     user!.id,
        title:          chTitle.trim(),
        description:    chDesc.trim(),
        challenge_type: chType,
        target_value:   chTarget ? parseFloat(chTarget) : null,
        deadline:       chDeadline || null,
      });

    setCreatingCh(false);
    if (error) {
      setChError('Failed to create challenge. Please try again.');
    } else {
      setChTitle(''); setChDesc(''); setChTarget(''); setChDeadline('');
      setShowChallengeForm(false);
      loadChallenges();
    }
  };

  const leaveOrDelete = async () => {
    if (!crew) return;
    const isOwner = crew.creator_id === user?.id;
    const msg = isOwner
      ? 'Delete this crew? All members and challenges will be removed.'
      : 'Leave this crew?';

    const confirmed = await new Promise<boolean>(resolve => {
      Alert.alert(isOwner ? 'Delete Crew' : 'Leave Crew', msg, [
        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
        { text: isOwner ? 'Delete' : 'Leave', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;

    if (isOwner) {
      await supabase.from('crews').delete().eq('id', crewId);
    } else {
      await supabase.from('crew_members').delete()
        .eq('crew_id', crewId).eq('user_id', user!.id);
    }
    navigation.goBack();
  };

  // ── Leaderboard sort ────────────────────────────────────────
  const leaderboard = [...members].sort((a, b) => {
    const practiceScore = (b.total_practices ?? 0) - (a.total_practices ?? 0);
    const streakScore   = (b.current_streak  ?? 0) - (a.current_streak  ?? 0);
    return practiceScore !== 0 ? practiceScore : streakScore;
  });

  // Handicap improvers: lower is better
  const improvers = [...members]
    .filter(m => m.recent_handicap !== null)
    .sort((a, b) => (a.recent_handicap ?? 99) - (b.recent_handicap ?? 99));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#1a472a" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!crew) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>
          Crew not found.
        </Text>
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
        <View style={styles.headerCenter}>
          <Text style={styles.crewEmoji}>{crew.emoji}</Text>
          <View>
            <Text style={styles.crewName}>{crew.name}</Text>
            <Text style={styles.crewMeta}>
              👥 {members.length}/{crew.max_members}
              {crew.creator_id === user?.id ? '  ·  You own this crew' : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={leaveOrDelete} style={styles.moreBtn}>
          <Ionicons
            name={crew.creator_id === user?.id ? 'trash-outline' : 'exit-outline'}
            size={20} color="#ffb3ba"
          />
        </TouchableOpacity>
      </View>

      {/* Invite code pill */}
      <View style={styles.inviteRow}>
        <Text style={styles.inviteLabel}>Invite Code:</Text>
        <View style={styles.invitePill}>
          <Text style={styles.inviteCode}>{crew.invite_code}</Text>
        </View>
        <Text style={styles.inviteHint}>Share this with friends to join</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['members','leaderboard','challenges'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'members'     ? '👥 Members'
               : t === 'leaderboard' ? '🏆 Rankings'
               : '🎯 Challenges'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── Members tab ──────────────────────────────────── */}
        {tab === 'members' && members.map(m => (
          <View key={m.id} style={styles.memberCard}>
            <View style={styles.memberLeft}>
              <Text style={styles.memberName}>
                {m.username}
                {m.user_id === user?.id ? '  (you)' : ''}
                {m.role === 'owner' ? '  👑' : ''}
              </Text>
              <View style={styles.memberStats}>
                {m.recent_handicap !== null && (
                  <View style={styles.memberBadge}>
                    <Text style={styles.memberBadgeText}>
                      HCP {m.recent_handicap! >= 0 ? '+' : ''}{m.recent_handicap}
                    </Text>
                  </View>
                )}
                {(m.current_streak ?? 0) > 0 && (
                  <View style={[styles.memberBadge, { backgroundColor: '#fff3e0' }]}>
                    <Text style={[styles.memberBadgeText, { color: '#e65100' }]}>
                      🔥 {m.current_streak}d streak
                    </Text>
                  </View>
                )}
                <Text style={styles.memberPractice}>
                  {m.total_practices ?? 0} practices
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* ── Leaderboard tab ──────────────────────────────── */}
        {tab === 'leaderboard' && (
          <>
            {/* Most Active */}
            <Text style={styles.lbSectionTitle}>🏋️ Most Active (Practices)</Text>
            {leaderboard.map((m, i) => (
              <View key={m.id} style={styles.lbRow}>
                <Text style={styles.lbRank}>#{i + 1}</Text>
                <View style={styles.lbInfo}>
                  <Text style={styles.lbName}>
                    {m.username}{m.user_id === user?.id ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.lbSub}>
                    {m.total_practices ?? 0} practices  ·  🔥 {m.current_streak ?? 0}d streak
                  </Text>
                </View>
                {i === 0 && <Text style={styles.lbMedal}>🥇</Text>}
                {i === 1 && <Text style={styles.lbMedal}>🥈</Text>}
                {i === 2 && <Text style={styles.lbMedal}>🥉</Text>}
              </View>
            ))}

            {/* Best Handicap */}
            {improvers.length > 0 && (
              <>
                <Text style={[styles.lbSectionTitle, { marginTop: 20 }]}>
                  📉 Best Handicap
                </Text>
                {improvers.map((m, i) => (
                  <View key={m.id + '_hcp'} style={styles.lbRow}>
                    <Text style={styles.lbRank}>#{i + 1}</Text>
                    <View style={styles.lbInfo}>
                      <Text style={styles.lbName}>
                        {m.username}{m.user_id === user?.id ? ' (you)' : ''}
                      </Text>
                      <Text style={styles.lbSub}>
                        HCP {m.recent_handicap! >= 0 ? '+' : ''}{m.recent_handicap}
                      </Text>
                    </View>
                    {i === 0 && <Text style={styles.lbMedal}>🥇</Text>}
                    {i === 1 && <Text style={styles.lbMedal}>🥈</Text>}
                    {i === 2 && <Text style={styles.lbMedal}>🥉</Text>}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── Challenges tab ───────────────────────────────── */}
        {tab === 'challenges' && (
          <>
            <TouchableOpacity
              style={styles.newChallengeBtn}
              onPress={() => setShowChallengeForm(f => !f)}
            >
              <Ionicons name={showChallengeForm ? 'close' : 'add-circle-outline'} size={18} color="#fff" />
              <Text style={styles.newChallengeBtnText}>
                {showChallengeForm ? 'Cancel' : 'Create a Challenge'}
              </Text>
            </TouchableOpacity>

            {/* Challenge form */}
            {showChallengeForm && (
              <View style={styles.challengeForm}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Challenge title (e.g. Break 90 by end of month)"
                  placeholderTextColor="#aaa"
                  value={chTitle}
                  onChangeText={t => { setChTitle(t); setChError(''); }}
                />
                <TextInput
                  style={styles.formInput}
                  placeholder="Description (optional)"
                  placeholderTextColor="#aaa"
                  value={chDesc}
                  onChangeText={setChDesc}
                />

                {/* Type selector */}
                <View style={styles.typeRow}>
                  {(['score','practice','handicap'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, chType === t && styles.typeBtnActive]}
                      onPress={() => setChType(t)}
                    >
                      <Text style={[styles.typeBtnText, chType === t && { color: '#fff' }]}>
                        {t === 'score' ? '🏌️ Score' : t === 'practice' ? '🏋️ Practice' : '📉 Handicap'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.formInput}
                  placeholder={
                    chType === 'score'    ? 'Target score (e.g. 85)' :
                    chType === 'practice' ? 'Practice sessions target (e.g. 10)' :
                    'Target handicap (e.g. 15)'
                  }
                  placeholderTextColor="#aaa"
                  value={chTarget}
                  onChangeText={setChTarget}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.formInput}
                  placeholder="Deadline (YYYY-MM-DD, optional)"
                  placeholderTextColor="#aaa"
                  value={chDeadline}
                  onChangeText={setChDeadline}
                />

                {chError ? <Text style={styles.formError}>⚠️ {chError}</Text> : null}

                <TouchableOpacity
                  style={[styles.formSubmitBtn, creatingCh && { opacity: 0.6 }]}
                  onPress={createChallenge}
                  disabled={creatingCh}
                >
                  {creatingCh
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.formSubmitText}>Launch Challenge 🚀</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Active challenges */}
            {challenges.length === 0 && !showChallengeForm ? (
              <View style={styles.noChallenges}>
                <Text style={styles.noChallengesText}>
                  No active challenges yet.{'\n'}
                  Be the first to start one! 🎯
                </Text>
              </View>
            ) : challenges.map(c => (
              <View key={c.id} style={styles.challengeCard}>
                <View style={styles.challengeTop}>
                  <Text style={styles.challengeTitle}>{c.title}</Text>
                  {c.deadline && (
                    <Text style={[
                      styles.challengeDeadline,
                      daysLeft(c.deadline) === 'Ended' && { color: '#aaa' },
                      daysLeft(c.deadline) === 'Last day!' && { color: '#e53935' },
                    ]}>
                      {daysLeft(c.deadline)}
                    </Text>
                  )}
                </View>
                {c.description ? (
                  <Text style={styles.challengeDesc}>{c.description}</Text>
                ) : null}
                <View style={styles.challengeMeta}>
                  <Text style={styles.challengeType}>
                    {c.challenge_type === 'score'    ? '🏌️ Score challenge' :
                     c.challenge_type === 'practice' ? '🏋️ Practice challenge' :
                     '📉 Handicap challenge'}
                    {c.target_value != null
                      ? `  ·  Target: ${c.challenge_type === 'score' ? 'sub-' : ''}${c.target_value}`
                      : ''}
                  </Text>
                  <Text style={styles.challengeBy}>by {c.creator_username}</Text>
                </View>
              </View>
            ))}
          </>
        )}
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
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  crewEmoji: { fontSize: 32 },
  crewName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  crewMeta: { color: '#a8d5b5', fontSize: 12, marginTop: 2 },
  moreBtn: { padding: 8 },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  inviteLabel: { fontSize: 12, color: '#555' },
  invitePill: {
    backgroundColor: '#1a472a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inviteCode: { color: '#d4af37', fontWeight: 'bold', fontSize: 14, letterSpacing: 2 },
  inviteHint: { fontSize: 11, color: '#888' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1a472a',
  },
  tabLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  tabLabelActive: { color: '#1a472a' },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  memberLeft: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#1a472a', marginBottom: 8 },
  memberStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  memberBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  memberBadgeText: { fontSize: 12, color: '#1a472a', fontWeight: '600' },
  memberPractice: { fontSize: 12, color: '#888' },
  lbSectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  lbRank: { fontSize: 14, fontWeight: '700', color: '#aaa', width: 28 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '700', color: '#1a472a' },
  lbSub: { fontSize: 12, color: '#888', marginTop: 2 },
  lbMedal: { fontSize: 22 },
  newChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a472a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  newChallengeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  challengeForm: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  formInput: {
    backgroundColor: '#f5f5f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  typeBtnActive: { backgroundColor: '#1a472a' },
  typeBtnText: { fontSize: 11, fontWeight: '600', color: '#555' },
  formError: { color: '#e53935', fontSize: 13 },
  formSubmitBtn: {
    backgroundColor: '#d4af37',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  formSubmitText: { color: '#1a472a', fontWeight: 'bold', fontSize: 15 },
  noChallenges: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noChallengesText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  challengeTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1a472a' },
  challengeDeadline: { fontSize: 12, fontWeight: '600', color: '#4caf50', marginLeft: 8 },
  challengeDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  challengeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  challengeType: { fontSize: 12, color: '#888' },
  challengeBy: { fontSize: 12, color: '#aaa' },
});
