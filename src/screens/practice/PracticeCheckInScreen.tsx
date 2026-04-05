// ============================================================
// 练球打卡界面
// - 拍照 / 从相册选择（Web 用 file input）
// - 练习标签多选
// - 可选填时长、球数、备注、地点
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, ActivityIndicator, Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { showToast } from '../../components/Toast';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// 所有可选练习标签
const ALL_TAGS = [
  { id: 'full-swing',  label: 'Full Swing',  emoji: '🏌️' },
  { id: 'putting',     label: 'Putting',     emoji: '⛳' },
  { id: 'chipping',    label: 'Chipping',    emoji: '🎯' },
  { id: 'bunker',      label: 'Bunker',      emoji: '🏖️' },
  { id: 'iron',        label: 'Iron Play',   emoji: '🔩' },
  { id: 'driver',      label: 'Driver',      emoji: '💪' },
  { id: 'wedge',       label: 'Wedge',       emoji: '📐' },
  { id: 'fitness',     label: 'Fitness',     emoji: '🏋️' },
];

export default function PracticeCheckInScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [photoUri, setPhotoUri]           = useState<string | null>(null);
  const [photoFile, setPhotoFile]         = useState<File | null>(null); // Web only
  const [selectedTags, setSelectedTags]   = useState<string[]>([]);
  const [duration, setDuration]           = useState('');
  const [ballCount, setBallCount]         = useState('');
  const [note, setNote]                   = useState('');
  const [location, setLocation]           = useState('');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  // ── 选择图片 ────────────────────────────────────────────────
  const pickImage = async () => {
    if (Platform.OS === 'web') {
      // Web：触发隐藏的 file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file: File = e.target.files[0];
        if (file) {
          setPhotoFile(file);
          setPhotoUri(URL.createObjectURL(file));
        }
      };
      input.click();
    } else {
      // 原生：请求权限后打开相册
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera roll access is required to upload photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      // Web 不支持相机拍照，退回选文件
      pickImage();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // ── 标签切换 ───────────────────────────────────────────────
  const toggleTag = (label: string) => {
    setSelectedTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  };

  // ── 上传图片到 Supabase Storage ────────────────────────────
  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoUri) return null;

    const filename = `${userId}/${Date.now()}.jpg`;

    if (Platform.OS === 'web' && photoFile) {
      // Web：直接上传 File 对象
      const { data, error } = await supabase.storage
        .from('practice-photos')
        .upload(filename, photoFile, { contentType: photoFile.type, upsert: false });
      if (error) throw new Error('Photo upload failed: ' + error.message);
      const { data: urlData } = supabase.storage.from('practice-photos').getPublicUrl(filename);
      return urlData.publicUrl;
    } else {
      // 原生：fetch blob 后上传
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from('practice-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw new Error('Photo upload failed: ' + error.message);
      const { data: urlData } = supabase.storage.from('practice-photos').getPublicUrl(filename);
      return urlData.publicUrl;
    }
  };

  // ── 提交打卡 ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    setError('');

    try {
      // 提交时直接从 Supabase 获取当前登录用户
      // 避免 modal 初次渲染时 useAuth 的 user 还是 null 的竞态问题
      const { data: { user: currentUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !currentUser) {
        throw new Error('Not logged in. Please sign in again.');
      }

      let photo_url: string | null = null;

      // 1. 上传图片（有则上传，失败不阻断）
      if (photoUri) {
        try {
          photo_url = await uploadPhoto(currentUser.id);
        } catch (uploadErr: any) {
          console.warn('[CheckIn] Photo upload failed, continuing without photo:', uploadErr.message);
        }
      }

      // 2. 插入 practice_logs（不用 .select() 避免 FK 联查问题）
      console.log('[CheckIn] Inserting for user:', currentUser.id, 'tags:', selectedTags);
      const { error: insertErr } = await supabase
        .from('practice_logs')
        .insert({
          user_id:          currentUser.id,
          photo_url,
          practice_tags:    selectedTags,
          duration_minutes: duration ? parseInt(duration, 10) : null,
          ball_count:       ballCount ? parseInt(ballCount, 10) : null,
          note:             note.trim() || null,
          location:         location.trim() || null,
        });

      if (insertErr) {
        console.error('[CheckIn] INSERT error:', insertErr.code, insertErr.message, insertErr.details, insertErr.hint);
        throw new Error(`Save failed: ${insertErr.message}`);
      }

      console.log('[CheckIn] Insert success, going back to feed');
      showToast('Practice logged! Your friends can see it now. 🏌️', 'success');
      // 3. 成功 → 返回 Feed
      navigation.goBack();

    } catch (err: any) {
      console.error('[CheckIn] handleSubmit error:', err);
      setError(err?.message ?? 'Submit failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Practice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── 图片区域 ── */}
        <View style={styles.photoSection}>
          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => { setPhotoUri(null); setPhotoFile(null); }}>
                <Ionicons name="close-circle" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={24} color="#1a472a" />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <View style={styles.photoDivider} />
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                  <Ionicons name="image-outline" size={24} color="#1a472a" />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.photoHint}>Add a photo of your practice session (optional)</Text>
            </View>
          )}
        </View>

        {/* ── 练习标签 ── */}
        <Text style={styles.sectionLabel}>What did you practice?</Text>
        <View style={styles.tagsGrid}>
          {ALL_TAGS.map(tag => {
            const selected = selectedTags.includes(tag.label);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagChip, selected && styles.tagChipActive]}
                onPress={() => toggleTag(tag.label)}
              >
                <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                <Text style={[styles.tagLabel, selected && styles.tagLabelActive]}>
                  {tag.label}
                </Text>
                {selected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginLeft: 2 }} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 统计数据 ── */}
        <Text style={styles.sectionLabel}>Session Details (optional)</Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailInput}>
            <Ionicons name="time-outline" size={18} color="#888" />
            <TextInput
              style={styles.detailField}
              placeholder="Duration (min)"
              placeholderTextColor="#bbb"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          <View style={styles.detailInput}>
            <Ionicons name="golf-outline" size={18} color="#888" />
            <TextInput
              style={styles.detailField}
              placeholder="Balls hit"
              placeholderTextColor="#bbb"
              value={ballCount}
              onChangeText={setBallCount}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>

        {/* ── 地点 ── */}
        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={18} color="#888" />
          <TextInput
            style={styles.inputField}
            placeholder="Practice facility name (optional)"
            placeholderTextColor="#bbb"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* ── 备注 ── */}
        <View style={[styles.inputRow, { alignItems: 'flex-start', paddingTop: 12 }]}>
          <Ionicons name="create-outline" size={18} color="#888" style={{ marginTop: 2 }} />
          <TextInput
            style={[styles.inputField, styles.noteField]}
            placeholder="Add a note about your session..."
            placeholderTextColor="#bbb"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* 错误提示 */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 提交按钮（底部备用） */}
        <TouchableOpacity
          style={[styles.postBtn, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.postBtnText}>Log Practice Session</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    backgroundColor: '#1a472a', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  submitBtn: {
    backgroundColor: '#d4af37', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 6, minWidth: 52, alignItems: 'center',
  },
  submitBtnText: { color: '#1a472a', fontWeight: 'bold', fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },
  photoSection: { marginBottom: 16 },
  photoPreviewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 220, borderRadius: 14 },
  removePhotoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 13,
  },
  photoPlaceholder: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 2,
    borderColor: '#e0e0e0', borderStyle: 'dashed', overflow: 'hidden',
  },
  photoButtons: { flexDirection: 'row', height: 100 },
  photoBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoBtnText: { fontSize: 13, color: '#1a472a', fontWeight: '600' },
  photoDivider: { width: 1, backgroundColor: '#e0e0e0', marginVertical: 16 },
  photoHint: { textAlign: 'center', color: '#bbb', fontSize: 12, paddingBottom: 12 },
  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: '#333',
    marginBottom: 10, marginTop: 4,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#ddd',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  tagChipActive: { backgroundColor: '#1a472a', borderColor: '#1a472a' },
  tagEmoji: { fontSize: 14 },
  tagLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  tagLabelActive: { color: '#fff' },
  detailsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  detailInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  detailField: { flex: 1, fontSize: 14, color: '#333' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0',
  },
  inputField: { flex: 1, fontSize: 14, color: '#333' },
  noteField: { minHeight: 72, textAlignVertical: 'top' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fdecea', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { flex: 1, color: '#f44336', fontSize: 13 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1a472a', borderRadius: 14, padding: 16, marginTop: 8,
  },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
