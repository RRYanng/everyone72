// ============================================================
// 我的 —— 搭子/约局 v1(Phase 6 · Task 6.2)
// 两段:我发起的(含所有状态)+ 我加入的(作为参与者)。
// 我发起的局若有 pending 申请,显示"N 人待审批 ›",点进 OutingDetail
// 用现成审批 UI 处理(不在本屏重复造审批按钮)。
// 进入本屏即 markSeen() 清红点,并刷新 tab 计数。
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
import { listMyOrganizedOutings, listMyJoinedOutings } from '../../lib/outings';
import { markSeen } from '../../lib/buddiesNotifications';
import { useBuddiesBadge } from '../../lib/buddiesBadge';
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

const STATUS_LABEL: Record<Outing['status'], string> = {
  open: '招募中', full: '已满员', cancelled: '已取消', done: '已结束',
};

function courseName(id: string): string {
  return COURSES.find(c => c.id === id)?.name ?? id;
}

export default function MyOutingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { refresh } = useBuddiesBadge();

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [organized, setOrganized]       = useState<Outing[]>([]);
  const [joined, setJoined]             = useState<Outing[]>([]);
  const [joinedCount, setJoinedCount]   = useState<Record<string, number>>({});
  const [pendingCount, setPendingCount] = useState<Record<string, number>>({});
  const [myStatus, setMyStatus]         = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError('');

    try {
      const [org, jnd] = await Promise.all([
        listMyOrganizedOutings(user.id),
        listMyJoinedOutings(user.id),
      ]);
      setOrganized(org);
      setJoined(jnd);

      const allIds = [...org.map(o => o.id), ...jnd.map(o => o.id)];
      const orgIds = org.map(o => o.id);
      const jndIds = jnd.map(o => o.id);

      // 各局已加入人数 / 我发起的局的 pending 数 / 我在加入局里的状态
      const [jc, pc, ms] = await Promise.all([
        allIds.length
          ? supabase.from('outing_members').select('outing_id').in('outing_id', allIds).eq('status', 'joined')
          : Promise.resolve({ data: [] as { outing_id: string }[] }),
        orgIds.length
          ? supabase.from('outing_members').select('outing_id').in('outing_id', orgIds).eq('status', 'pending')
          : Promise.resolve({ data: [] as { outing_id: string }[] }),
        jndIds.length
          ? supabase.from('outing_members').select('outing_id, status').eq('user_id', user.id).in('outing_id', jndIds)
          : Promise.resolve({ data: [] as { outing_id: string; status: string }[] }),
      ]);

      const joinedC: Record<string, number> = {};
      (jc.data ?? []).forEach((r: { outing_id: string }) => {
        joinedC[r.outing_id] = (joinedC[r.outing_id] ?? 0) + 1;
      });
      setJoinedCount(joinedC);

      const pendingC: Record<string, number> = {};
      (pc.data ?? []).forEach((r: { outing_id: string }) => {
        pendingC[r.outing_id] = (pendingC[r.outing_id] ?? 0) + 1;
      });
      setPendingCount(pendingC);

      const status: Record<string, string> = {};
      (ms.data ?? []).forEach((r: { outing_id: string; status: string }) => {
        status[r.outing_id] = r.status;
      });
      setMyStatus(status);
    } catch {
      // Supabase 客户端正常返回 {data,error} 不抛异常,但网络层/解析等仍可能 throw。
      // 兜底:置错误态而非让 focus effect 的 promise 未捕获、卡在转圈白屏。
      setError('加载失败,请重试。');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 进入本屏:加载 + 清红点(markSeen 后刷新 tab 计数)
  useFocusEffect(useCallback(() => {
    load();
    markSeen();
    refresh();
  }, [load, refresh]));

  const goDetail = (id: string) => navigation.navigate('OutingDetail', { outingId: id });

  const renderOrganized = (o: Outing) => {
    const pending = pendingCount[o.id] ?? 0;
    const joinedN = joinedCount[o.id] ?? 0;
    return (
      <Pressable
        key={o.id}
        onPress={() => goDetail(o.id)}
        accessibilityRole="button"
        accessibilityLabel={`${courseName(o.course_id)} 的局,${formatDate(o.play_date, o.tee_time)}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {formatDate(o.play_date, o.tee_time)}
          </Text>
          <Text style={[styles.cardStatus, (o.status === 'cancelled' || o.status === 'done') && styles.cardStatusMuted]}>
            {STATUS_LABEL[o.status]}
          </Text>
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>
          {courseName(o.course_id)} · {joinedN}/{o.slots_total} 人
        </Text>
        {pending > 0 ? (
          <View style={styles.pendingRow}>
            <Ionicons name="person-add-outline" size={14} color={colors.kincha} />
            <Text style={styles.pendingText}>{pending} 人申请待审批</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.kincha} />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderJoined = (o: Outing) => {
    const joinedN = joinedCount[o.id] ?? 0;
    const mine = myStatus[o.id];
    return (
      <Pressable
        key={o.id}
        onPress={() => goDetail(o.id)}
        accessibilityRole="button"
        accessibilityLabel={`${courseName(o.course_id)} 的局,${formatDate(o.play_date, o.tee_time)}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {formatDate(o.play_date, o.tee_time)}
          </Text>
          {mine === 'pending' ? (
            <Text style={styles.cardStatusPending}>申请待通过</Text>
          ) : (
            <Text style={styles.cardStatus}>{STATUS_LABEL[o.status]}</Text>
          )}
        </View>
        <View style={styles.cardFoot}>
          <Text style={styles.cardSub} numberOfLines={1}>
            {courseName(o.course_id)} · {o.city} · {joinedN}/{o.slots_total} 人
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.hint} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="我的约局" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centerWrap}><LoadingSpinner /></View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.text.hint} />
          <Text style={styles.errorTitle}>{error}</Text>
          <View style={styles.retryWrap}>
            <PrimaryButton label="重试" onPress={() => load()} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 我发起的 */}
          <Text style={styles.sectionLabel}>我发起的</Text>
          {organized.length === 0 ? (
            <Text style={styles.emptyHint}>你还没有发起过局。去"约局"发一个吧。</Text>
          ) : (
            organized.map(renderOrganized)
          )}

          {/* 我加入的 */}
          <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>我加入的</Text>
          {joined.length === 0 ? (
            <Text style={styles.emptyHint}>你还没有加入别人的局。</Text>
          ) : (
            joined.map(renderJoined)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.xl },
  pressed: { opacity: 0.85 },

  sectionLabel: {
    fontSize: typography.sm, fontWeight: '600', color: colors.text.primary,
    marginBottom: spacing.sm, letterSpacing: 0.2,
  },
  sectionLabelGap: { marginTop: spacing.lg },
  errorTitle: {
    fontSize: typography.base, color: colors.text.primary,
    textAlign: 'center', marginTop: spacing.md,
  },
  retryWrap: { marginTop: spacing.lg, alignSelf: 'stretch', paddingHorizontal: spacing.lg },
  emptyHint: {
    fontSize: typography.sm, color: colors.text.secondary,
    lineHeight: typography.sm * 1.5, marginBottom: spacing.sm,
  },

  // Card(对齐 OutingsListScreen 的 C mockup)
  card: {
    backgroundColor: colors.shiro,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.usuzumi,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: {
    flex: 1, fontSize: typography.base, fontFamily: fontFamily.serif,
    fontWeight: '600', color: colors.text.primary,
  },
  cardStatus: { fontSize: typography.xs, color: colors.koke, fontWeight: '700', marginLeft: spacing.sm },
  cardStatusMuted: { color: colors.text.hint },
  cardStatusPending: { fontSize: typography.xs, color: colors.kincha, fontWeight: '700', marginLeft: spacing.sm },
  cardSub: { flex: 1, fontSize: typography.sm, color: colors.text.secondary, marginTop: spacing.xs },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.usuzumi,
  },
  pendingText: { flex: 1, fontSize: typography.sm, color: colors.kincha, fontWeight: '600' },
});
