// ============================================================
// 导航结构 — Phase 4 更新
//
// 底部 4 个 Tab：
//   Home     — 首页（成绩摘要 + 开始新一轮）
//   Practice — 练球动态 Feed
//   Crew     — 球友小组（替代 Social Tab）
//   History  — 历史成绩
//
// Root Stack 额外页面：
//   CourseSearch → Scorecard → Analysis
//   PracticeCheckIn
//   Leaderboard / Friends（从 Crew 内进入）
//   CrewDetail / CreateCrew
//   Settings
//   PrivacyPolicy / Terms
// ============================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Phase 1
import HomeScreen from '../screens/home/HomeScreen';
import CourseSearchScreen from '../screens/scorecard/CourseSearchScreen';
import ScorecardScreen from '../screens/scorecard/ScorecardScreen';
import AnalysisScreen from '../screens/scorecard/AnalysisScreen';
import HistoryScreen from '../screens/history/HistoryScreen';

// Phase 2
import PracticeFeedScreen from '../screens/practice/PracticeFeedScreen';
import PracticeCheckInScreen from '../screens/practice/PracticeCheckInScreen';
import LeaderboardScreen from '../screens/social/LeaderboardScreen';
import FriendsScreen from '../screens/social/FriendsScreen';

// Phase 4 — Crew + Settings
import CrewListScreen from '../screens/crew/CrewListScreen';
import CrewDetailScreen from '../screens/crew/CrewDetailScreen';
import CreateCrewScreen from '../screens/crew/CreateCrewScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Buddies(搭子/约局 · Phase 2-6)
import EditProfileExtrasScreen from '../screens/buddies/EditProfileExtrasScreen';
import OutingsListScreen from '../screens/buddies/OutingsListScreen';
import CreateOutingScreen from '../screens/buddies/CreateOutingScreen';
import OutingDetailScreen from '../screens/buddies/OutingDetailScreen';
import MyOutingsScreen from '../screens/buddies/MyOutingsScreen';
import { BuddiesBadgeProvider, useBuddiesBadge } from '../lib/buddiesBadge';

// Legal
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';

// Landing
import LandingScreen from '../screens/landing/LandingScreen';

// Demo
import DemoScreen from '../screens/demo/DemoScreen';

// ── 导航类型定义 ──────────────────────────────────────────────
export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  Demo: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  // Phase 1
  CourseSearch: undefined;
  Scorecard: { courseId: string; totalHoles: 9 | 18; teeBox: string };
  Analysis: { roundId: string };
  // Phase 2
  PracticeCheckIn: undefined;
  Leaderboard: undefined;
  Friends: undefined;
  // Phase 4
  CrewDetail: { crewId: string };
  CreateCrew: undefined;
  Settings: undefined;
  // Buddies(搭子/约局 · Phase 2-6)
  // 注:OutingsList 现为「Buddies」底部 tab 的根屏(见 MainTabs),不再单列 RootStack 路由。
  EditProfileExtras: undefined;
  CreateOuting: undefined;
  OutingDetail: { outingId: string };
  MyOutings: undefined;
  // Legal
  PrivacyPolicy: undefined;
  Terms: undefined;
};

const AuthStack  = createNativeStackNavigator<AuthStackParamList>();
const RootStack  = createNativeStackNavigator<RootStackParamList>();
const Tab        = createBottomTabNavigator();

// ── 底部 Tab ──────────────────────────────────────────────────
function MainTabs() {
  // 搭子未读红点(派生计数,非实时);聚焦该 tab 时刷新一次
  const { count, refresh } = useBuddiesBadge();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.koke,
        tabBarInactiveTintColor: colors.text.hint,
        tabBarStyle: {
          backgroundColor: colors.shiro,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.usuzumi,
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.3 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home:     'home-outline',
            Practice: 'golf-outline',
            Crew:     'people-outline',
            Buddies:  'calendar-outline',
            History:  'time-outline',
          };
          const name = icons[route.name] ?? 'ellipse-outline';
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}      options={{ title: 'Home' }} />
      <Tab.Screen name="Practice" component={PracticeFeedScreen} options={{ title: 'Practice' }} />
      <Tab.Screen name="Crew"     component={CrewListScreen}  options={{ title: 'Crew' }} />
      <Tab.Screen
        name="Buddies"
        component={OutingsListScreen}
        options={{ title: 'Buddies', tabBarBadge: count > 0 ? count : undefined }}
        listeners={{ focus: () => refresh() }}
      />
      <Tab.Screen name="History"  component={HistoryScreen}   options={{ title: 'History' }} />
    </Tab.Navigator>
  );
}

// ── 已登录 Root Stack ─────────────────────────────────────────
function AuthenticatedStack() {
  return (
    <BuddiesBadgeProvider>
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs"        component={MainTabs} />
      {/* Phase 1 */}
      <RootStack.Screen name="CourseSearch"    component={CourseSearchScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Scorecard"       component={ScorecardScreen} />
      <RootStack.Screen name="Analysis"        component={AnalysisScreen} />
      {/* Phase 2 */}
      <RootStack.Screen name="PracticeCheckIn" component={PracticeCheckInScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Leaderboard"     component={LeaderboardScreen} />
      <RootStack.Screen name="Friends"         component={FriendsScreen} />
      {/* Phase 4 */}
      <RootStack.Screen name="CrewDetail"      component={CrewDetailScreen} />
      <RootStack.Screen name="CreateCrew"      component={CreateCrewScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Settings"        component={SettingsScreen} options={{ presentation: 'modal' }} />
      {/* Buddies(搭子/约局) —— OutingsList 是「Buddies」tab 的根,这里不再注册 */}
      <RootStack.Screen name="EditProfileExtras" component={EditProfileExtrasScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="CreateOuting"      component={CreateOutingScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="OutingDetail"      component={OutingDetailScreen} />
      <RootStack.Screen name="MyOutings"         component={MyOutingsScreen} />
      {/* Legal */}
      <RootStack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <RootStack.Screen name="Terms"           component={TermsScreen} />
    </RootStack.Navigator>
    </BuddiesBadgeProvider>
  );
}

// ── 未登录 Auth Stack ─────────────────────────────────────────
function UnauthenticatedStack() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Landing"       component={LandingScreen} />
      <AuthStack.Screen name="Login"         component={LoginScreen} />
      <AuthStack.Screen name="Register"      component={RegisterScreen} />
      <AuthStack.Screen name="Demo"          component={DemoScreen} />
      <AuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <AuthStack.Screen name="Terms"         component={TermsScreen} />
    </AuthStack.Navigator>
  );
}

// ── Deep-link / web URL config ────────────────────────────────
const linking = {
  prefixes: [
    'https://everyone72.vercel.app',
    'everyone72://',
    'http://localhost:8081',
    'http://localhost:19006',
  ],
  config: {
    screens: {
      Landing:       '',
      Login:         'login',
      Register:      'register',
      Demo:          'demo',
      PrivacyPolicy: 'privacy',
      Terms:         'terms',
    },
  },
};

// ── 根导航 ────────────────────────────────────────────────────
export default function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.washi }}>
        <ActivityIndicator size="large" color={colors.koke} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {session ? <AuthenticatedStack /> : <UnauthenticatedStack />}
    </NavigationContainer>
  );
}
