// ============================================================
// 约局列表 —— 搭子/约局 v1(Phase 4 · Task 4.1)
// 同城开放的局(listCityOutings,city 取自当前用户 profile.city)+ 发局入口。
// 进入时若未设城市,引导去 EditProfileExtras 先填城市。
// 卡片样式参考 brainstorm 确认的 C 方案 mockup(.outing)。
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getProfileExtras } from '../../lib/profileExtras';
import { listCityOutings } from '../../lib/outings';
import { COURSES } from '../../data/courses';
import { Outing } from '../../types/buddies';
import { RootStackParamList } from '../../navigation';
import { ScreenHeader, LoadingSpinner, PrimaryButton } from '../../components';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatDate(playDate: string, teeTime: string | null): string {
  const d = new Date(`${playDate}T00:00:00`);
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  const wd = Number.isNaN(d.getDay()) ? '' : ` ${WEEKDAYS[d.getDay()]}`;
  const t = teeTime ? ` · ${teeTime.slice(0, 5)} 开球` : '';
  return `${md}${wd}${t}`;
}

function skillPrefLabel(pref: string): string {
  if (pref === 'any') return '不限差点';
  if (pref === 'near_me') return '和我差点接近';
  return pref;
}

export default function OutingsListScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [loading, setLoading]     = useState(true);
  const [city, setCity]           = useState<string | null>(null);
  const [outings, setOutings]     = useState<Outing[]>([]);
  const [joinedCount, setJoinedCount] = useState<Record<string, number>>({});
  const [organizerName, setOrganizerName] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const extras = await getProfileExtras(user.id);
    const c = extras?.city?.trim() ?? null;
    setCity(c);

    if (!c) { setOutings([]); setLoading(false); return; }

    const list = await listCityOutings(c);
    setOutings(list);

    // 批量取 joined 人数与组织者用户名(各一条查询)
    if (list.length > 0) {
      const ids = list.map(o => o.id);
      const organizerIds = Array.from(new Set(list.map(o => o.organizer_id)));

      const [{ data: memberRows }, { data: profiles }] = await Promise.all([
        supabase.from('outing_members')
          .select('outing_id').in('outing_id', ids).eq('status', 'joined'),
        supabase.from('profiles')
          .select('id, username').in('id', organizerIds),
      ]);

      const counts: Record<string, number> = {};
      (memberRows ?? []).forEach((m: { outing_id: string }) => {
        counts[m.outing_id] = (counts[m.outing_id] ?? 0) + 1;
      });
      setJoinedCount(counts);

      const names: Record<string, string> = {};
      (profiles ?? []).forEach((p: { id: string; username: string }) => {
        names[p.id] = p.username;
      });
      setOrganizerName(names);
    } else {
      setJoinedCount({});
      setOrganizerName({});
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // 头部右侧「我的」入口(本屏是 Buddies tab 根,无返回箭头)
  const mineAction = (
    <Pressable
      onPress={() => navigation.navigate('MyOutings')}
      accessibilityRole="button"
      accessibilityLabel="我的约局"
      hitSlop={8}
      style={({ pressed }) => [styles.mineBtn, pressed && styles.pressed]}
    >
      <Ionicons name="person-circle-outline" size={18} color={colors.koke} />
      <Text style={styles.mineBtnText}>我的</Text>
    </Pressable>
  );

  // ── 加载中 ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="约局" rightAction={mineAction} />
        <View style={styles.centerWrap}><LoadingSpinner /></View>
      </SafeAreaView>
    );
  }

  // ── 未设城市:引导去填档案 ──────────────────────────────────
  if (!city) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="约局" rightAction={mineAction} />
        <View style={styles.centerWrap}>
          <Ionicons name="location-outline" size={40} color={colors.text.hint} />
          <Text style={styles.emptyTitle}>先设置你的城市</Text>
          <Text style={styles.emptyHint}>
            约局和看局都按城市匹配。完善档案、填好城市后即可发现同城球局。
          </Text>
          <View style={styles.emptyBtn}>
            <PrimaryButton
              label="去完善档案"
              onPress={() => navigation.navigate('EditProfileExtras')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── 列表 ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={`约局 · ${city}`} rightAction={mineAction} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {outings.length === 0 ? (
          <View style={styles.emptyInline}>
            <Text style={styles.emptyTitle}>同城还没有开放的局</Text>
            <Text style={styles.emptyHint}>成为第一个发起人,招呼同城球友一起打球。</Text>
          </View>
        ) : (
          outings.map(o => {
            const joined    = joinedCount[o.id] ?? 0;
            const remaining = Math.max(0, o.slots_total - joined);
            const courseName = COURSES.find(c => c.id === o.course_id)?.name ?? o.course_id;
            const name = organizerName[o.organizer_id] ?? '球友';
            return (
              <Pressable
                key={o.id}
                onPress={() => navigation.navigate('OutingDetail', { outingId: o.id })}
                accessibilityRole="button"
                accessibilityLabel={`${courseName} 的局,${formatDate(o.play_date, o.tee_time)}`}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {formatDate(o.play_date, o.tee_time)}
                  </Text>
                  <Text style={styles.cardStatus}>
                    {o.status === 'full' || remaining === 0 ? '已满' : `还差 ${remaining} 人`}
                  </Text>
                </View>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {courseName} · {skillPrefLabel(o.skill_pref)}
                </Text>
                <View style={styles.cardFoot}>
                  <Text style={styles.cardFootText} numberOfLines={1}>
                    {name} · {joined}/{o.slots_total} 人
                    {o.join_mode === 'approve' ? ' · 需审批' : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.hint} />
                </View>
              </Pressable>
            );
          })
        )}

        {/* 发一个局(虚线卡) */}
        <Pressable
          onPress={() => navigation.navigate('CreateOuting')}
          accessibilityRole="button"
          accessibilityLabel="我也发一个局"
          style={({ pressed }) => [styles.dashedCard, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={18} color={colors.koke} />
          <Text style={styles.dashedText}>我也发一个局</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  // 头部「我的」入口
  mineBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  mineBtnText: { fontSize: typography.sm, color: colors.koke, fontWeight: '600' },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.xl },
  pressed: { opacity: 0.85 },

  // Empty states
  emptyInline: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: {
    fontSize: typography.lg,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.sm * 1.5,
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  emptyBtn: { marginTop: spacing.lg, alignSelf: 'stretch', paddingHorizontal: spacing.lg },

  // Outing card (C mockup)
  card: {
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.base,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cardStatus: {
    fontSize: typography.xs,
    color: colors.koke,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  cardSub: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFootText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.text.secondary,
  },

  // Dashed "create" card
  dashedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.koke,
    paddingVertical: spacing.base,
    marginTop: spacing.xs,
  },
  dashedText: {
    fontSize: typography.sm,
    color: colors.koke,
    fontWeight: '600',
  },
});
