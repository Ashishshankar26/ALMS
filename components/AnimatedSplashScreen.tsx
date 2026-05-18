import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface Props {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const [hidden, setHidden] = useState(false);
  
  // Uber's classic minimal scale-up
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.92);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Text appears quickly (smooth rapid fade)
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    
    // 2. The subtle continuous zoom (breathing effect) over the entire duration
    logoScale.value = withTiming(1.02, { duration: 2500, easing: Easing.out(Easing.ease) });

    // 3. Fade the entire splash layer out cleanly after 2 seconds
    containerOpacity.value = withDelay(
      2000,
      withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(setHidden)(true);
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value }],
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  if (hidden) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <Animated.Text style={[styles.logo, logoStyle]}>
        alms
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#000000', // Pure pitch black
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#FFFFFF', // Pure white
    fontSize: 56, // Large, confident
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700', // Heavy bold weight like Uber's modern logo
    letterSpacing: -1, // Tight tracking for a solid logo feel
    includeFontPadding: false,
  },
});
