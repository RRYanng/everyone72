// ============================================================
// CoachWaitlistModal — "Get matched with a local pro" 候补名单
// ============================================================

import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CoachWaitlistModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const [email, setEmail]       = useState(user?.email ?? '');
  const [loading, setLoading]   = useState(false);
  const [joined, setJoined]     = useState(false);
  const [error, setError]       = useState('');

  const handleJoin = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase
      .from('coach_waitlist')
      .insert({ email: trimmed, user_id: user?.id ?? null });

    setLoading(false);

    if (dbError && dbError.code !== '23505') {
      // 23505 = unique_violation (already joined) — treat as success
      setError('Something went wrong. Please try again.');
      return;
    }

    setJoined(true);
  };

  const handleClose = () => {
    setJoined(false);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          {joined ? (
            /* ── Success state ── */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={56} color="#1a472a" />
              </View>
              <Text style={styles.successTitle}>You're on the list! 🎉</Text>
              <Text style={styles.successSub}>
                We'll notify you when coach matching launches in your area.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form state ── */
            <View style={styles.formContainer}>
              {/* Coming Soon badge */}
              <View style={styles.comingSoonRow}>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>COMING SOON</Text>
                </View>
              </View>

              {/* Icon + Title */}
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🏌️</Text>
              </View>
              <Text style={styles.title}>Get matched with a local pro</Text>
              <Text style={styles.sub}>
                Based on your diagnosis, we'll connect you with a PGA-certified instructor who specializes in fixing exactly your weaknesses.
              </Text>

              {/* Feature bullets */}
              <View style={styles.bullets}>
                {[
                  '📍 Local pros within 20 miles',
                  '🎯 Matched to your specific issues',
                  '📊 Your diagnosis shared automatically',
                  '💬 First 30-min consult included',
                ].map(item => (
                  <View key={item} style={styles.bulletRow}>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* Email input */}
              <Text style={styles.inputLabel}>Notify me when it launches</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                placeholder="your@email.com"
                placeholderTextColor="#bbb"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              {/* CTA */}
              <TouchableOpacity
                style={[styles.joinBtn, loading && styles.joinBtnDisabled]}
                onPress={handleJoin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.joinBtnText}>Join Waitlist →</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                No spam. Unsubscribe any time.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 10,
    padding: 4,
  },

  // Form
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  comingSoonRow: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  comingSoonBadge: {
    backgroundColor: '#d4af37',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1a472a',
    letterSpacing: 1.2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconEmoji: { fontSize: 28 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    marginBottom: 16,
  },
  bullets: {
    backgroundColor: '#f8faf8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'center' },
  bulletText: { fontSize: 13, color: '#333', lineHeight: 20 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginBottom: 8,
    marginLeft: 4,
  },
  joinBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  disclaimer: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
  },

  // Success
  successContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  successIcon: { marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  doneBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 60,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
