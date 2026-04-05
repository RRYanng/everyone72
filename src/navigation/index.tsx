// ============================================================
// 导航结构 — Phase 2 更新
//
// 底部 4 个 Tab：
//   Home     — 首页（成绩摘要 + 开始新一轮）
//   Practice — 练球动态 Feed（原 Play 按钮）
//   Social   — 好友 + 排行榜（新增）
//   History  — 历史成绩
//
// Root Stack 额外页面：
//   CourseSearch → Scorecard → Analysis（从 Home 进入）
//   PracticeCheckIn（从 Practice Feed FAB 进入）
//   Leaderboard（从 Practice Feed 或 Social 进入）
//   Friends（从 Social Tab 进入）
// ============================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../hooks/useAuth';

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

// Legal
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';

// Landing
import LandingScreen from '../screens/landing/LandingScreen';

// ── 导航类型定义 ──────────────────────────────────────────────
export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
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
  // Legal
  PrivacyPolicy: undefined;
  Terms: undefined;
};

const AuthStack  = createNativeStackNavigator<AuthStackParamList>();
const RootStack  = createNativeStackNavigator<RootStackParamList>();
const Tab        = createBottomTabNavigator();

// Social Tab 占位屏（直接显示好友页，顶部加排行榜入口）
function SocialTabScreen() {
  return <FriendsScreen />;
}

// ── 底部 Tab ──────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1a472a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 4, height: 56 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Home:     ['home',           'home-outline'],
            Practice: ['barbell',        'barbell-outline'],
            Social:   ['people',         'people-outline'],
            History:  ['time',           'time-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}      options={{ title: 'Home' }} />
      <Tab.Screen name="Practice" component={PracticeFeedScreen} options={{ title: 'Practice' }} />
      <Tab.Screen name="Social"   component={SocialTabScreen} options={{ title: 'Social' }} />
      <Tab.Screen name="History"  component={HistoryScreen}   options={{ title: 'History' }} />
    </Tab.Navigator>
  );
}

// ── 已登录 Root Stack ─────────────────────────────────────────
function AuthenticatedStack() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      {/* Phase 1 */}
      <RootStack.Screen name="CourseSearch"   component={CourseSearchScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Scorecard"      component={ScorecardScreen} />
      <RootStack.Screen name="Analysis"       component={AnalysisScreen} />
      {/* Phase 2 */}
      <RootStack.Screen name="PracticeCheckIn" component={PracticeCheckInScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Leaderboard"    component={LeaderboardScreen} />
      <RootStack.Screen name="Friends"        component={FriendsScreen} />
      {/* Legal */}
      <RootStack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen} />
      <RootStack.Screen name="Terms"          component={TermsScreen} />
    </RootStack.Navigator>
  );
}

// ── 未登录 Auth Stack ─────────────────────────────────────────
function UnauthenticatedStack() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Landing"       component={LandingScreen} />
      <AuthStack.Screen name="Login"         component={LoginScreen} />
      <AuthStack.Screen name="Register"      component={RegisterScreen} />
      <AuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <AuthStack.Screen name="Terms"         component={TermsScreen} />
    </AuthStack.Navigator>
  );
}

// ── 根导航 ────────────────────────────────────────────────────
export default function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a472a' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AuthenticatedStack /> : <UnauthenticatedStack />}
    </NavigationContainer>
  );
}
