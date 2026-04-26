import React from 'react';
import { ActivityIndicator, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  size?: 'small' | 'large';
  /** 为 true 时铺满父容器并垂直居中 */
  fullscreen?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSpinner({
  size = 'large',
  fullscreen = false,
  accessibilityLabel = 'Loading',
  style,
}: Props) {
  return (
    <View
      style={[fullscreen && styles.fullscreen, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size={size} color={colors.koke} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingSpinner;
