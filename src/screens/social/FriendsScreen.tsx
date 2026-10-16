// ============================================================
// 好友系统 — 通过用户名搜索添加好友 + 好友列表
// ============================================================

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, FlatList, ActivityIndicator,
} from 'react-native';
import { notify } from '../../lib/dialog';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { notifyFriendRequest, notifyFriendRequestAccepted } from '../../lib/notifications';

interface FriendEntry {
  id: string;
  username: string;
  friendshipId: string;
  status: 'pending' | 'accepted';
  direction: 'sent' | 'received';
}

export default function FriendsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResult, setSearchResult]   = useState<any | null>(null);
  const [searching, setSearching]         = useState(false);
  const [searchError, setSearchError]     = useState('');
  const [friends, setFriends]             = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // 依赖 user：user 可用后自动触发
  useFocusEffect(useCallback(() => { fetchFriends(); }, [user]));

  // ── 加载好友列表 ────────────────────────────────────────────
  const fetchFriends = async () => {
    if (!user) { setLoadingFriends(false); return; }
    // friendships 的外键指向 auth.users(不是 profiles),PostgREST 无法嵌入 profiles,
    // 所以先取好友关系,再用 public_profiles 批量取对方用户名。
    const { data: rows, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error || !rows) {
      console.error('[Friends] load error:', error);
      setLoadError('Could not load your friends.');
      setLoadingFriends(false);
      return;
    }

    const otherIds = Array.from(new Set(
      rows.map((r: any) => (r.user_id === user.id ? r.friend_id : r.user_id) as string),
    ));
    const names: Record<string, string> = {};
    if (otherIds.length > 0) {
      const { data: profs } = await supabase
        .from('public_profiles').select('id, username').in('id', otherIds);
      (profs ?? []).forEach((p: any) => { names[p.id] = p.username; });
    }

    setLoadError('');
    setFriends(rows.map((row: any): FriendEntry => {
      const isSender = row.user_id === user.id;
      const otherId = isSender ? row.friend_id : row.user_id;
      return {
        id: otherId,
        username: names[otherId] ?? 'Unknown',
        friendshipId: row.id,
        status: row.status,
        direction: isSender ? 'sent' : 'received',
      };
    }));
    setLoadingFriends(false);
  };

  // ── 搜索用户 ───────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);

    const { data } = await supabase
      .from('public_profiles')
      .select('id, username')
      .ilike('username', searchQuery.trim())
      .neq('id', user!.id)
      .limit(1)
      .single();

    if (!data) {
      setSearchError(`No user found with username "${searchQuery.trim()}"`);
    } else {
      setSearchResult(data);
    }
    setSearching(false);
  };

  // ── 发送好友请求 ────────────────────────────────────────────
  const sendFriendRequest = async (friendId: string) => {
    setSendingRequest(true);
    // 检查是否已有关系
    const existing = friends.find(f => f.id === friendId);
    if (existing) {
      notify('Already Friends', existing.status === 'accepted'
        ? 'You are already friends with this user.'
        : 'A friend request is already pending.');
      setSendingRequest(false);
      return;
    }

    const { error } = await supabase.from('friendships').insert({
      user_id: user!.id,
      friend_id: friendId,
      status: 'pending',
    });

    if (error) {
      notify('Error', error.message);
    } else {
      setSearchResult(null);
      setSearchQuery('');
      fetchFriends();
      // 通知对方（本机 Toast 模拟；真机可接入 Supabase Edge Function 推送给对方）
      notifyFriendRequest(searchResult?.username ?? 'Someone');
    }
    setSendingRequest(false);
  };

  // ── 接受好友请求 ────────────────────────────────────────────
  const acceptRequest = async (friendshipId: string, fromUsername: string) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) { notify('Error', 'Could not accept the request. Please try again.'); return; }
    notifyFriendRequestAccepted(fromUsername);
    fetchFriends();
  };

  // ── 删除好友/取消请求 ────────────────────────────────────────
  const removeFriend = async (friendshipId: string) => {
    // .select() 让"0 行被删除"(例如被 RLS 拒绝)也能被发现,而不是静默成功
    const { data, error } = await supabase.from('friendships').delete().eq('id', friendshipId).select('id');
    if (error || !data || data.length === 0) {
      notify('Error', 'Could not remove this friend. Please try again.');
      return;
    }
    fetchFriends();
  };

  // 分类：待接受的请求 / 已接受的好友
  const pendingReceived = friends.filter(f => f.status === 'pending' && f.direction === 'received');
  const pendingSent     = friends.filter(f => f.status === 'pending' && f.direction === 'sent');
  const accepted        = friends.filter(f => f.status === 'accepted');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} style={styles.leaderboardBtn}>
          <Ionicons name="trophy-outline" size={18} color="#d4af37" />
          <Text style={styles.leaderboardBtnText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: 12 }}>
            {/* 搜索框 */}
            <Text style={styles.sectionTitle}>Add Friend</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username..."
                placeholderTextColor="#bbb"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="search" size={20} color="#fff" />
                }
              </TouchableOpacity>
            </View>

            {searchError !== '' && (
              <Text style={styles.searchError}>{searchError}</Text>
            )}

            {searchResult && (
              <View style={styles.searchResultCard}>
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultAvatarText}>{searchResult.username[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.resultName}>@{searchResult.username}</Text>
                <TouchableOpacity
                  style={[styles.addBtn, sendingRequest && { opacity: 0.6 }]}
                  onPress={() => sendFriendRequest(searchResult.id)}
                  disabled={sendingRequest}
                >
                  {sendingRequest
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="person-add" size={16} color="#fff" /><Text style={styles.addBtnText}>Add</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* 待接受的请求 */}
            {pendingReceived.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Friend Requests ({pendingReceived.length})</Text>
                {pendingReceived.map(f => (
                  <View key={f.id} style={styles.friendCard}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{f.username[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.friendName}>@{f.username}</Text>
                    <View style={styles.requestActions}>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(f.friendshipId, f.username)}>
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => removeFriend(f.friendshipId)}>
                        <Ionicons name="close" size={18} color="#888" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* 已发出的请求 */}
            {pendingSent.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {pendingSent.map(f => (
                  <View key={f.id} style={[styles.friendCard, { opacity: 0.7 }]}>
                    <View style={[styles.friendAvatar, { backgroundColor: '#aaa' }]}>
                      <Text style={styles.friendAvatarText}>{f.username[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.friendName}>@{f.username}</Text>
                    <Text style={styles.pendingBadge}>Pending</Text>
                  </View>
                ))}
              </>
            )}

            {/* 好友列表 */}
            <Text style={styles.sectionTitle}>
              Friends {accepted.length > 0 ? `(${accepted.length})` : ''}
            </Text>
            {loadingFriends ? (
              <ActivityIndicator color="#1a472a" style={{ marginTop: 20 }} />
            ) : loadError ? (
              <TouchableOpacity
                style={styles.empty}
                onPress={() => { setLoadError(''); setLoadingFriends(true); fetchFriends(); }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading friends"
              >
                <Text style={styles.emptyEmoji}>⚠️</Text>
                <Text style={styles.emptyText}>{loadError}</Text>
                <Text style={styles.emptySub}>Tap to retry</Text>
              </TouchableOpacity>
            ) : accepted.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySub}>Search by username to add friends!</Text>
              </View>
            ) : (
              accepted.map(f => (
                <View key={f.id} style={styles.friendCard}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{f.username[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.friendName}>@{f.username}</Text>
                  <TouchableOpacity onPress={() => removeFriend(f.friendshipId)} style={styles.removeBtn}>
                    <Ionicons name="person-remove-outline" size={18} color="#bbb" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        }
        keyExtractor={() => 'header'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    backgroundColor: '#1a472a', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  leaderboardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  leaderboardBtnText: { color: '#d4af37', fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#555',
    marginTop: 16, marginBottom: 8,
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: '#e0e0e0', color: '#333',
  },
  searchBtn: {
    backgroundColor: '#1a472a', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
  },
  searchError: { color: '#f44336', fontSize: 13, marginTop: 6 },
  searchResultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9',
    borderRadius: 12, padding: 12, marginTop: 8, gap: 10,
    borderWidth: 1, borderColor: '#c8e6c9',
  },
  resultAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1a472a', justifyContent: 'center', alignItems: 'center',
  },
  resultAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a472a' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a472a', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  friendCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  friendAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1a472a', justifyContent: 'center', alignItems: 'center',
  },
  friendAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  friendName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acceptBtn: {
    backgroundColor: '#1a472a', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  rejectBtn: { padding: 4 },
  pendingBadge: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },
  removeBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySub: { fontSize: 13, color: '#888', marginTop: 4 },
});
