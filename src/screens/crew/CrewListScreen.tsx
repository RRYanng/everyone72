// ============================================================
// Crew 列表 — Golf Journal 设计语言（serif 标题 + 暖米底 + outline）
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  SafeAreaView, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Ellipse, Line } from 'react-native-svg';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isDevMockActive } from '../../lib/mockUser';
import { LoadingSpinner } from '../../components';
import { Crew } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// 空状态插画用色（仅本屏，与 HomeScreen 水彩 SVG 一致）
const GRASS_LIGHT = '#D8E8D0';
const GRASS_MID   = '#C8DFC8';
const TREE_GREEN  = '#A8C8A0';

export default function CrewListScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [crews, setCrews]           = useState<Crew[]>([]);
  const [loading, setLoading]       = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining]       = useState(false);
  const [joinError, setJoinError]   = useState('');

  useFocusEffect(
    useCallback(() => { fetchCrews(); }, [user]),
  );

  const fetchCrews = async () => {
    if (isDevMockActive()) {
      setCrews([]);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);

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

    if (isDevMockActive()) {
      await new Promise(r => setTimeout(r, 400));
      setJoinError('Demo mode: invite codes disabled.');
      setJoining(false);
      return;
    }

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

    const { count } = await supabase
      .from('crew_members')
      .select('id', { count: 'exact', head: true })
      .eq('crew_id', crew.id);

    if ((count ?? 0) >= crew.max_members) {
      setJoinError(`${crew.name} is full (${crew.max_members} members max).`);
      setJoining(false);
      return;
    }

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
    <Pressable
      onPress={() => navigation.navigate('CrewDetail', { crewId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={
        `${item.name}, ${item.member_count}/${item.max_members} members` +
        (item.creator_id === user?.id ? ', owner' : '')
      }
      style={({ pressed }) => [styles.crewCard, pressed && styles.pressedRow]}
    >
      <Text style={styles.crewEmoji} accessible={false}>{item.emoji}</Text>
      <View style={styles.crewInfo}>
        <Text style={styles.crewName} numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.crewDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <Text style={styles.crewMeta}>
          {item.member_count}/{item.max_members} members
          {item.creator_id === user?.id ? ' · Owner' : ''}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.text.hint}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={crews}
        keyExtractor={i => i.id}
        renderItem={renderCrew}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <CrewHeader
            inviteCode={inviteCode}
            joining={joining}
            joinError={joinError}
            onChangeInvite={t => { setInviteCode(t); setJoinError(''); }}
            onJoin={handleJoin}
            onCreate={() => navigation.navigate('CreateCrew')}
            onFriends={() => navigation.navigate('Friends')}
            onLeaderboard={() => navigation.navigate('Leaderboard')}
          />
        }
        ListEmptyComponent={
          loading ? (
            <LoadingSpinner style={styles.loaderWrap} />
          ) : (
            <EmptyCrewState onCreate={() => navigation.navigate('CreateCrew')} />
          )
        }
      />
    </SafeAreaView>
  );
}

// ── Header (title + subtitle + outline New Crew button) ────────

function CrewHeader({
  inviteCode, joining, joinError,
  onChangeInvite, onJoin, onCreate, onFriends, onLeaderboard,
}: {
  inviteCode: string;
  joining: boolean;
  joinError: string;
  onChangeInvite: (t: string) => void;
  onJoin: () => void;
  onCreate: () => void;
  onFriends: () => void;
  onLeaderboard: () => void;
}) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} accessibilityRole="header">Golf Crew</Text>
          <Text style={styles.headerSub}>Your golf squads</Text>
        </View>
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Create new crew"
          style={({ pressed }) => [styles.newCrewBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={16} color={colors.koke} accessible={false} />
          <Text style={styles.newCrewText}>New Crew</Text>
        </Pressable>
      </View>

      <View style={styles.joinCard}>
        <Text style={styles.joinLabel}>Have an invite code?</Text>
        <View style={styles.joinRow}>
          <TextInput
            style={styles.joinInput}
            placeholder="Enter invite code"
            placeholderTextColor={colors.text.hint}
            value={inviteCode}
            onChangeText={onChangeInvite}
            autoCapitalize="characters"
            accessibilityLabel="Invite code"
          />
          <Pressable
            onPress={onJoin}
            disabled={joining}
            accessibilityRole="button"
            accessibilityLabel="Join crew"
            accessibilityState={{ disabled: joining, busy: joining }}
            style={({ pressed }) => [
              styles.joinBtn,
              joining && styles.joinBtnDisabled,
              pressed && !joining && styles.pressedJoin,
            ]}
          >
            <Text style={styles.joinBtnText}>{joining ? '…' : 'Join'}</Text>
          </Pressable>
        </View>
        {joinError ? (
          <Text style={styles.joinError} accessibilityLiveRegion="polite">⚠ {joinError}</Text>
        ) : null}
      </View>

      <View style={styles.navStrip}>
        <NavStripItem
          icon="people-outline"
          label="Friends"
          onPress={onFriends}
        />
        <View style={styles.navStripDivider} accessible={false} />
        <NavStripItem
          icon="trophy-outline"
          label="Leaderboard"
          onPress={onLeaderboard}
        />
      </View>
    </>
  );
}

function NavStripItem({
  icon, label, onPress,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.navStripItem,
        pressed && styles.navStripItemActive,
      ]}
    >
      {({ pressed }) => (
        <>
          <Ionicons
            name={icon}
            size={16}
            color={pressed ? colors.koke : colors.text.hint}
            accessible={false}
          />
          <Text
            style={[
              styles.navStripLabel,
              pressed && styles.navStripLabelActive,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ── Empty State (with mini illustration) ─────────────────────

function EmptyCrewState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyState}>
      <EmptyIllustration />
      <Text style={styles.emptyTitle} accessibilityRole="header">No crews yet</Text>
      <Text style={styles.emptySub}>
        Create a crew to compete and track progress with friends!
      </Text>
      <Pressable
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel="Create my first crew"
        style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressedEmpty]}
      >
        <Text style={styles.emptyBtnText}>Create My First Crew</Text>
      </Pressable>
    </View>
  );
}

function EmptyIllustration() {
  return (
    <Svg width={140} height={120} viewBox="0 0 140 120" accessibilityElementsHidden>
      {/* Clouds */}
      <Ellipse cx={32}  cy={22} rx={10} ry={4} fill={GRASS_LIGHT} opacity={0.7} />
      <Ellipse cx={108} cy={28} rx={11} ry={4} fill={GRASS_LIGHT} opacity={0.7} />
      {/* Left leaf */}
      <Path d="M 12 82 Q 0 75, 6 60 Q 20 65, 12 82 Z" fill={TREE_GREEN} opacity={0.65} />
      {/* Right leaf */}
      <Path d="M 128 80 Q 140 73, 134 58 Q 120 63, 128 80 Z" fill={TREE_GREEN} opacity={0.65} />
      {/* Ground oval */}
      <Ellipse cx={70} cy={98} rx={42} ry={12} fill={GRASS_MID} />
      {/* Flag pole */}
      <Line x1={70} y1={98} x2={70} y2={45} stroke={colors.text.secondary} strokeWidth={1.5} />
      {/* Flag */}
      <Path d="M 70 45 L 92 52 L 70 60 Z" fill={colors.kincha} opacity={0.9} />
    </Svg>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },

  pressed: { opacity: 0.6 },
  pressedRow: { backgroundColor: colors.washi },
  pressedJoin: { opacity: 0.85 },
  pressedEmpty: { opacity: 0.85 },

  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  newCrewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.koke,
    backgroundColor: 'transparent',
    minHeight: 36,
  },
  newCrewText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.koke,
    letterSpacing: 0.2,
  },

  // Join card
  joinCard: {
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  joinLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  joinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.washi,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    color: colors.text.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    letterSpacing: 1.5,
  },
  joinBtn: {
    backgroundColor: colors.koke,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 76,
  },
  joinBtnDisabled: { opacity: 0.55 },
  joinBtnText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.shiro,
    letterSpacing: 0.3,
  },
  joinError: {
    fontSize: typography.sm,
    color: colors.aka,
    marginTop: spacing.sm,
  },

  // Nav strip (Friends / Leaderboard)
  navStrip: {
    flexDirection: 'row',
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  navStripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navStripItemActive: {
    borderBottomColor: colors.koke,
    backgroundColor: colors.washi,
  },
  navStripLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text.hint,
    letterSpacing: 0.3,
  },
  navStripLabelActive: { color: colors.koke },
  navStripDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.usuzumi,
    marginVertical: spacing.sm,
  },

  // Crew card
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  crewEmoji: { fontSize: 32 },
  crewInfo: { flex: 1 },
  crewName: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  crewDesc: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  crewMeta: {
    fontSize: typography.xs,
    color: colors.text.hint,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },

  // Empty state
  loaderWrap: {
    marginTop: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.xl,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.sm * 1.6,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  emptyBtn: {
    backgroundColor: colors.koke,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: 28,
    minHeight: 48,
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.shiro,
    letterSpacing: 0.3,
  },
});
