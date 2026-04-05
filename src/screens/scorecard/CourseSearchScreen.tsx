// ============================================================
// 球场搜索界面
// 选择球场 → 选择 Tee Box + 打几洞 → 进入记分卡
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Modal, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '../../types';
import { searchCourses } from '../../data/courses';
import { RootStackParamList } from '../../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const TEE_BOXES = ['Red', 'Gold', 'White', 'Blue', 'Black'];

export default function CourseSearchScreen() {
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Course[]>(searchCourses(''));
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [teeBox, setTeeBox] = useState('White');
  const [totalHoles, setTotalHoles] = useState<9 | 18>(18);
  const [showModal, setShowModal] = useState(false);

  const handleSearch = (text: string) => {
    setQuery(text);
    setResults(searchCourses(text));
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setShowModal(true);
  };

  const handleStartRound = () => {
    if (!selectedCourse) return;
    setShowModal(false);
    navigation.navigate('Scorecard', {
      courseId: selectedCourse.id,
      totalHoles,
      teeBox,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 顶部标题 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Course</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 搜索框 */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by course name, city, or state..."
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      {/* 球场列表 */}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.courseCard} onPress={() => handleSelectCourse(item)}>
            <View style={styles.courseLeft}>
              <Text style={styles.courseName}>{item.name}</Text>
              <Text style={styles.courseLocation}>{item.city}, {item.state}</Text>
            </View>
            <View style={styles.courseRight}>
              <Text style={styles.coursePar}>Par {item.total_par}</Text>
              <Text style={styles.courseRating}>⭐ {item.course_rating} / {item.slope_rating}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No courses found. Try a different search.</Text>
        }
      />

      {/* 选择 Tee Box + 洞数 的弹窗 */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedCourse?.name}</Text>
            <Text style={styles.modalSub}>{selectedCourse?.city}, {selectedCourse?.state}</Text>

            {/* 洞数选择 */}
            <Text style={styles.label}>Holes</Text>
            <View style={styles.segmented}>
              {([9, 18] as const).map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.segBtn, totalHoles === n && styles.segBtnActive]}
                  onPress={() => setTotalHoles(n)}
                >
                  <Text style={[styles.segText, totalHoles === n && styles.segTextActive]}>
                    {n} Holes
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tee Box 选择 */}
            <Text style={styles.label}>Tee Box</Text>
            <View style={styles.teeRow}>
              {TEE_BOXES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.teeBtn, teeBox === t && styles.teeBtnActive]}
                  onPress={() => setTeeBox(t)}
                >
                  <Text style={[styles.teeText, teeBox === t && styles.teeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 按钮 */}
            <TouchableOpacity style={styles.startBtn} onPress={handleStartRound}>
              <Text style={styles.startBtnText}>Start Round ⛳</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    backgroundColor: '#1a472a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  courseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  courseLeft: { flex: 1 },
  courseName: { fontSize: 15, fontWeight: '700', color: '#1a472a' },
  courseLocation: { fontSize: 12, color: '#888', marginTop: 3 },
  courseRight: { alignItems: 'flex-end', justifyContent: 'center' },
  coursePar: { fontSize: 14, fontWeight: '600', color: '#333' },
  courseRating: { fontSize: 11, color: '#888', marginTop: 3 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a472a' },
  modalSub: { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, marginTop: 4 },
  segmented: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  segBtn: {
    flex: 1, borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#ddd',
  },
  segBtnActive: { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  segText: { fontSize: 15, color: '#888', fontWeight: '600' },
  segTextActive: { color: '#1a472a' },
  teeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  teeBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd',
  },
  teeBtnActive: { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  teeText: { fontSize: 13, color: '#888', fontWeight: '600' },
  teeTextActive: { color: '#1a472a' },
  startBtn: {
    backgroundColor: '#1a472a', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14 },
});
