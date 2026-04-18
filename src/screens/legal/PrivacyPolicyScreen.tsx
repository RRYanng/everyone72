import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const LAST_UPDATED = 'April 4, 2026';

interface Section {
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    title: '1. Information We Collect',
    body:
      'We collect information you provide directly:\n\n' +
      '• Account information: email address and password (stored securely via Supabase Auth)\n' +
      '• Golf data: course selections, hole-by-hole scores, putts, and optional trouble tags\n' +
      '• Practice session data: text notes and photos you choose to share\n' +
      '• Device information: operating system and app version for crash reporting\n\n' +
      'We do not collect your real name, phone number, or payment information. ' +
      'Location access is used only to suggest nearby courses and is never stored on our servers.',
  },
  {
    title: '2. How We Use Your Information',
    body:
      '• To provide AI-powered round analysis via the Anthropic Claude API\n' +
      '• To display your score history and statistics\n' +
      '• To enable social features (sharing practice sessions, leaderboards) with friends you connect with\n' +
      '• To improve app performance and fix bugs\n\n' +
      'We do not sell, rent, or share your personal information with third parties for marketing purposes.',
  },
  {
    title: '3. AI Analysis (Claude API)',
    body:
      'When you request AI analysis of your round, your scorecard data (scores, putts, trouble tags, and course name) ' +
      'is sent to Anthropic\'s Claude API via our secure backend. ' +
      'This data is used only to generate your personalized coaching feedback and is not used to train Anthropic\'s models. ' +
      'Anthropic\'s privacy policy applies to data processed by their API: https://www.anthropic.com/privacy',
  },
  {
    title: '4. Data Storage and Security',
    body:
      'Your data is stored on Supabase (PostgreSQL) servers located in the United States. ' +
      'We use Row Level Security (RLS) to ensure you can only access your own data. ' +
      'All data is encrypted in transit (TLS) and at rest. ' +
      'Passwords are hashed and never stored in plain text.',
  },
  {
    title: '5. Photos',
    body:
      'Practice session photos you upload are stored in Supabase Storage. ' +
      'Photos are only visible to you and friends you have connected with in the app. ' +
      'You can delete your photos at any time from the Practice feed.',
  },
  {
    title: '6. Data Retention',
    body:
      'We retain your data as long as your account is active. ' +
      'You can request account deletion by emailing ruiyiyanng@gmail.com — ' +
      'we will delete all your data within 30 days.',
  },
  {
    title: '7. Children\'s Privacy',
    body:
      'Everyone 72 is not directed to children under 13. ' +
      'We do not knowingly collect personal information from children under 13. ' +
      'If you believe a child has provided us with personal information, please contact us.',
  },
  {
    title: '8. Your Rights',
    body:
      'You have the right to:\n' +
      '• Access the personal data we hold about you\n' +
      '• Correct inaccurate data\n' +
      '• Request deletion of your data\n' +
      '• Export your data in a portable format\n\n' +
      'To exercise these rights, contact us at ruiyiyanng@gmail.com.',
  },
  {
    title: '9. Changes to This Policy',
    body:
      'We may update this Privacy Policy from time to time. ' +
      'We will notify you of significant changes by displaying a notice in the app. ' +
      'Continued use of the app after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '10. Contact Us',
    body:
      'If you have questions about this Privacy Policy, contact us at:\n\n' +
      'Email: ruiyiyanng@gmail.com\n' +
      'Website: https://everyone72.com',
  },
];

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a472a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Everyone 72 ("we", "our", or "us") is committed to protecting your privacy.
          This policy explains how we collect, use, and safeguard your information.
        </Text>
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Everyone 72. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a472a',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
