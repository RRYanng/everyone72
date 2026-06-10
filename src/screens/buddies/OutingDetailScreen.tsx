// ============================================================
// 局详情 —— 搭子/约局 v1(Phase 4 · Task 4.3)
// 发起人档案 + 成员列表 + 加入/退出。
// 加入按钮读 outing.join_mode:instant 即时进、approve 显示"申请已发送"。
// 发起人额外:审批 pending、移除成员、取消局。
// ============================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  getOuting, listMembers, joinOuting, leaveOuting,
  approveMember, removeMember, cancelOuting,
} from '../../lib/outings';
import { listComments, postComment, subscribeComments } from '../../lib/outingComments';
import { COURSES } from '../../data/courses';
import { Outing, OutingMember, OutingComment } from '../../types/buddies';
import { RootStackParamList } from '../../navigation';
import { Card, ScreenHeader, LoadingSpinner, PrimaryButton, SecondaryButton } from '../../components';
import { colors, radius, spacing, typography, fontFamily } from '../../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteT  = RouteProp<RootStackParamList, 'OutingDetail'>;

type MemberRow = OutingMember & { username: string };

interface OrganizerProfile {
  id: string;
  username: string;
  city: string | null;
  home_course_id: string | null;
  handicap: number | null;
  years_playing: number | null;
  bio: string | null;
}

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

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OutingDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteT>();
  const { user }   = useAuth();
  const { outingId } = route.params;

  const [outing, setOuting]       = useState<Outing | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [members, setMembers]     = useState<MemberRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');

  // 留言板(Phase 5)
  const [comments, setComments]     = useState<OutingComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const o = await getOuting(outingId);
    setOuting(o);
    if (!o) { setLoading(false); return; }

    const { data: org } = await supabase
      .from('profiles')
      .select('id, username, city, home_course_id, handicap, years_playing, bio')
      .eq('id', o.organizer_id)
      .maybeSingle();
    setOrganizer((org as OrganizerProfile) ?? null);

    const mem = await listMembers(outingId);
    const ids = mem.map(m => m.user_id);
    const nameMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, username').in('id', ids);
      (profs ?? []).forEach((p: { id: string; username: string }) => { nameMap[p.id] = p.username; });
    }
    setMembers(mem.map(m => ({ ...m, username: nameMap[m.user_id] ?? '球友' })));
    setLoading(false);
  }, [outingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── 留言板:拉历史 + 实时订阅(随 outingId 重建,卸载退订) ──────
  useEffect(() => {
    let active = true;
    listComments(outingId).then(rows => { if (active) setComments(rows); });
    const unsub = subscribeComments(outingId, c => {
      // 自己 postComment 后 Realtime 也会推回同一条 —— 按 id 去重
      setComments(prev => (prev.some(x => x.id === c.id) ? prev : [...prev, c]));
    });
    return () => { active = false; unsub(); };
  }, [outingId]);

  // ── 派生状态 ───────────────────────────────────────────────
  const me          = user ? members.find(m => m.user_id === user.id) ?? null : null;
  const isOrganizer = !!user && !!outing && outing.organizer_id === user.id;
  const joinedMembers = members.filter(m => m.status === 'joined');
  const pendingMembers = members.filter(m => m.status === 'pending');
  const isCancelled = outing?.status === 'cancelled';
  const isFull = !!outing && (outing.status === 'full' || joinedMembers.length >= outing.slots_total);
  const canComment = !!me && (me.status === 'joined' || isOrganizer);

  // 留言作者名:成员都在 members 里(发言权限=joined/发起人),组织者兜底
  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach(m => { map[m.user_id] = m.username; });
    if (organizer) map[organizer.id] = organizer.username;
    return map;
  }, [members, organizer]);

  const handlePostComment = async () => {
    if (!user) return;
    const text = commentBody.trim();
    if (!text) return;
    setError('');
    setPosting(true);
    const ok = await postComment(outingId, user.id, text);
    setPosting(false);
    if (ok) setCommentBody('');           // 新留言由 Realtime 推回并追加
    else setError('留言失败,请重试。');
  };

  // ── 操作 ───────────────────────────────────────────────────
  const run = async (fn: () => Promise<boolean>, failMsg: string) => {
    setError(''); setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) load();
    else setError(failMsg);
  };

  const handleJoin = () => {
    if (!user || !outing) return;
    run(() => joinOuting(outing.id, user.id, outing.join_mode), '加入失败,请重试。');
  };
  const handleLeave = () => {
    if (!user || !outing) return;
    run(() => leaveOuting(outing.id, user.id), '退出失败,请重试。');
  };
  const handleCancel = () => {
    if (!outing) return;
    run(() => cancelOuting(outing.id), '取消失败,请重试。');
  };

  // ── 渲染 ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="局详情" onBack={() => navigation.goBack()} />
        <View style={styles.centerWrap}><LoadingSpinner /></View>
      </SafeAreaView>
    );
  }

  if (!outing) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="局详情" onBack={() => navigation.goBack()} />
        <View style={styles.centerWrap}>
          <Text style={styles.emptyTitle}>找不到这个局</Text>
          <Text style={styles.emptyHint}>它可能已被取消或删除。</Text>
        </View>
      </SafeAreaView>
    );
  }

  const homeCourse = organizer?.home_course_id ? courseName(organizer.home_course_id) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="局详情" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 概要 */}
        <Card style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{formatDate(outing.play_date, outing.tee_time)}</Text>
            <View style={[styles.statusPill, isCancelled && styles.statusPillMuted]}>
              <Text style={[styles.statusText, isCancelled && styles.statusTextMuted]}>
                {STATUS_LABEL[outing.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.courseName}>{courseName(outing.course_id)}</Text>
          <Text style={styles.metaLine}>
            {outing.city} · {joinedMembers.length}/{outing.slots_total} 人
            {outing.join_mode === 'approve' ? ' · 需审批' : ' · 直接加入'}
          </Text>
          {outing.note ? <Text style={styles.note}>{outing.note}</Text> : null}
        </Card>

        {/* 发起人 */}
        <Text style={styles.sectionLabel}>发起人</Text>
        <Card style={styles.section}>
          <View style={styles.organizerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(organizer?.username ?? '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.organizerMeta}>
              <Text style={styles.organizerName} numberOfLines={1}>
                {organizer?.username ?? '球友'}
              </Text>
              <Text style={styles.organizerSub} numberOfLines={1}>
                {[
                  organizer?.handicap != null ? `差点 ${organizer.handicap}` : null,
                  organizer?.years_playing != null ? `球龄 ${organizer.years_playing} 年` : null,
                  homeCourse ? `主场 ${homeCourse}` : null,
                ].filter(Boolean).join(' · ') || '暂无更多资料'}
              </Text>
            </View>
          </View>
          {organizer?.bio ? <Text style={styles.bio}>{organizer.bio}</Text> : null}
        </Card>

        {/* 成员 */}
        <Text style={styles.sectionLabel}>已加入({joinedMembers.length})</Text>
        <Card style={styles.section}>
          {joinedMembers.length === 0 ? (
            <Text style={styles.emptyHint}>还没有人加入。</Text>
          ) : (
            joinedMembers.map((m, idx) => (
              <View key={m.id} style={[styles.memberRow, idx > 0 && styles.memberDivider]}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.username}
                  {m.user_id === outing.organizer_id ? ' · 发起人' : ''}
                </Text>
                {isOrganizer && m.user_id !== outing.organizer_id ? (
                  <Pressable
                    onPress={() => run(() => removeMember(m.id), '移除失败,请重试。')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`移除 ${m.username}`}
                    style={({ pressed }) => [styles.smallBtn, styles.smallBtnDanger, pressed && styles.pressed]}
                  >
                    <Text style={styles.smallBtnDangerText}>移除</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </Card>

        {/* 待审批(仅组织者,approve 模式) */}
        {isOrganizer && pendingMembers.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>待审批({pendingMembers.length})</Text>
            <Card style={styles.section}>
              {pendingMembers.map((m, idx) => (
                <View key={m.id} style={[styles.memberRow, idx > 0 && styles.memberDivider]}>
                  <Text style={styles.memberName} numberOfLines={1}>{m.username}</Text>
                  <View style={styles.pendingActions}>
                    <Pressable
                      onPress={() => run(() => approveMember(m.id), '通过失败,请重试。')}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`通过 ${m.username}`}
                      style={({ pressed }) => [styles.smallBtn, styles.smallBtnPrimary, pressed && styles.pressed]}
                    >
                      <Text style={styles.smallBtnPrimaryText}>通过</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => run(() => removeMember(m.id), '拒绝失败,请重试。')}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`拒绝 ${m.username}`}
                      style={({ pressed }) => [styles.smallBtn, styles.smallBtnDanger, pressed && styles.pressed]}
                    >
                      <Text style={styles.smallBtnDangerText}>拒绝</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* 错误 */}
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* 底部操作 */}
        <View style={styles.actionWrap}>
          {isCancelled ? (
            <Text style={styles.mutedNote}>该局已取消。</Text>
          ) : isOrganizer ? (
            <SecondaryButton
              label="取消这个局"
              onPress={handleCancel}
              loading={busy}
              accessibilityHint="取消后该局对所有人关闭"
            />
          ) : me?.status === 'joined' ? (
            <SecondaryButton label="退出这个局" onPress={handleLeave} loading={busy} />
          ) : me?.status === 'pending' ? (
            <PrimaryButton label="申请已发送" onPress={() => {}} disabled />
          ) : isFull ? (
            <PrimaryButton label="已满员" onPress={() => {}} disabled />
          ) : (
            <PrimaryButton
              label={outing.join_mode === 'approve' ? '申请加入' : '加入'}
              onPress={handleJoin}
              loading={busy}
              accessibilityHint={outing.join_mode === 'approve' ? '发送加入申请,等待发起人通过' : '立即加入该局'}
            />
          )}
        </View>

        {/* 留言板(Phase 5) */}
        <Text style={styles.sectionLabel}>留言板</Text>
        <Card style={styles.section}>
          {comments.length === 0 ? (
            <Text style={styles.emptyHint}>
              还没有留言{canComment ? ',来说点什么吧。' : '。'}
            </Text>
          ) : (
            comments.map((c, idx) => (
              <View key={c.id} style={[styles.commentRow, idx > 0 && styles.memberDivider]}>
                <View style={styles.commentHead}>
                  <Text style={styles.commentAuthor} numberOfLines={1}>
                    {nameById[c.user_id] ?? '球友'}
                    {c.user_id === outing.organizer_id ? ' · 发起人' : ''}
                  </Text>
                  <Text style={styles.commentTime}>{formatCommentTime(c.created_at)}</Text>
                </View>
                <Text style={styles.commentBody}>{c.body}</Text>
              </View>
            ))
          )}
        </Card>

        {canComment ? (
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder="说点什么…"
              placeholderTextColor={colors.text.hint}
              multiline
              maxLength={500}
              editable={!posting}
              accessibilityLabel="留言输入框"
            />
            <Pressable
              onPress={handlePostComment}
              disabled={posting || commentBody.trim().length === 0}
              accessibilityRole="button"
              accessibilityLabel="发送留言"
              style={({ pressed }) => [
                styles.sendBtn,
                (posting || commentBody.trim().length === 0) && styles.sendBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="arrow-up" size={18} color={colors.shiro} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.mutedNote}>加入这个局后即可留言。</Text>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.washi },
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.xl },
  pressed: { opacity: 0.6 },

  section: { marginBottom: spacing.md, padding: spacing.base },
  sectionLabel: {
    fontSize: typography.sm, fontWeight: '600', color: colors.text.primary,
    marginBottom: spacing.sm, marginTop: spacing.xs, letterSpacing: 0.2,
  },

  // Summary
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    flex: 1, fontSize: typography.lg, fontFamily: fontFamily.serif,
    fontWeight: '600', color: colors.text.primary,
  },
  statusPill: {
    backgroundColor: '#F3F7F2', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 4, marginLeft: spacing.sm,
  },
  statusPillMuted: { backgroundColor: colors.pill },
  statusText: { fontSize: typography.xs, color: colors.koke, fontWeight: '700' },
  statusTextMuted: { color: colors.text.hint },
  courseName: { fontSize: typography.base, color: colors.text.primary, marginTop: spacing.sm },
  metaLine: { fontSize: typography.sm, color: colors.text.secondary, marginTop: spacing.xs },
  note: {
    fontSize: typography.sm, color: colors.text.primary, lineHeight: typography.sm * 1.5,
    marginTop: spacing.sm,
  },

  // Organizer
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.kokeTint,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.lg, fontFamily: fontFamily.serif, color: colors.koke, fontWeight: '700' },
  organizerMeta: { flex: 1 },
  organizerName: { fontSize: typography.base, fontWeight: '600', color: colors.text.primary },
  organizerSub: { fontSize: typography.xs, color: colors.text.secondary, marginTop: 2 },
  bio: {
    fontSize: typography.sm, color: colors.text.primary, lineHeight: typography.sm * 1.5,
    marginTop: spacing.md,
  },

  // Members
  memberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  memberDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.usuzumi },
  memberName: { flex: 1, fontSize: typography.sm, color: colors.text.primary },
  pendingActions: { flexDirection: 'row', gap: spacing.sm },

  smallBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth },
  smallBtnPrimary: { borderColor: colors.koke, backgroundColor: '#F3F7F2' },
  smallBtnPrimaryText: { fontSize: typography.xs, color: colors.koke, fontWeight: '600' },
  smallBtnDanger: { borderColor: colors.aka },
  smallBtnDangerText: { fontSize: typography.xs, color: colors.aka, fontWeight: '600' },

  // Empty / error
  emptyTitle: {
    fontSize: typography.lg, fontFamily: fontFamily.serif, fontWeight: '600',
    color: colors.text.primary, textAlign: 'center', marginTop: spacing.sm,
  },
  emptyHint: {
    fontSize: typography.sm, color: colors.text.secondary, textAlign: 'center',
    lineHeight: typography.sm * 1.5, marginTop: spacing.xs,
  },
  errorBox: {
    backgroundColor: colors.shiro, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.aka,
    padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { color: colors.aka, fontSize: typography.sm },

  actionWrap: { marginTop: spacing.md },
  mutedNote: { fontSize: typography.sm, color: colors.text.hint, textAlign: 'center', marginTop: spacing.sm },

  // Comments (Phase 5)
  commentRow: { paddingVertical: spacing.sm },
  commentHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 2,
  },
  commentAuthor: { flex: 1, fontSize: typography.sm, fontWeight: '600', color: colors.text.primary },
  commentTime: { fontSize: typography.xs, color: colors.text.hint, marginLeft: spacing.sm },
  commentBody: {
    fontSize: typography.sm, color: colors.text.primary, lineHeight: typography.sm * 1.5,
  },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm,
  },
  composerInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: colors.shiro,
    borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.usuzumi,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm,
    fontSize: typography.sm, color: colors.text.primary,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.koke,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.kokeLight, opacity: 0.6 },
});
