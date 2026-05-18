import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface Props {
  onAnimationComplete: () => void;
}

const LETTERS = ['a', 'l', 'm', 's'];
const BRAND_PURPLE = '#9333EA'; // Deep vibrant purple
const GLOW_PURPLE = '#A855F7';

export default function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const [hidden, setHidden] = useState(false);
  
  // Shared values for each letter for kinetic staggered animation
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const letterProgress = [p1, p2, p3, p4];
  
  const glowOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  // Ultra-smooth cinematic easing
  const cinematicEase = Easing.bezier(0.16, 1, 0.3, 1);
  const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

  useEffect(() => {
    // 0.0s - 0.4s: Completely black screen (handled by delay)
    
    // 0.4s - 1.8s: Letters form dynamically
    letterProgress.forEach((p, i) => {
      p.value = withDelay(
        400 + i * 120, // Precise staggered entry
        withTiming(1, { duration: 1100, easing: cinematicEase })
      );
    });

    // 1.8s - 2.5s: Final lock and soft glow pulse
    glowOpacity.value = withDelay(
      1800,
      withSequence(
        withTiming(1, { duration: 400, easing: cinematicEase }),
        withTiming(0.3, { duration: 500, easing: cinematicEase })
      )
    );

    // 2.5s+: Seamless fade into app opening
    containerOpacity.value = withDelay(
      2600,
      withTiming(0, { duration: 450, easing: easeInOut }, (finished) => {
        if (finished) {
          runOnJS(setHidden)(true);
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const baseGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  const getLetterStyle = (progress: Animated.SharedValue<number>) => {
    return useAnimatedStyle(() => {
      const v = progress.value;
      return {
        // Fluid morphing opacity
        opacity: interpolate(v, [0, 0.3, 1], [0, 1, 1]),
        transform: [
          // Elegant settling motion
          { translateY: interpolate(v, [0, 1], [18, 0]) },
          // Subtle scale down
          { scale: interpolate(v, [0, 1], [1.08, 1]) },
          // Kinetic typography motion blur approximation
          { skewX: `${interpolate(v, [0, 1], [12, 0])}deg` }
        ],
      };
    });
  };

  if (hidden) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={styles.textRow}>
        {LETTERS.map((char, i) => {
          const style = getLetterStyle(letterProgress[i]);
          return (
            <View key={i} style={styles.letterContainer}>
              {/* Soft glow layer (pulses at the end) */}
              <Animated.Text style={[styles.letter, styles.glowLayer, style, baseGlowStyle]}>
                {char}
              </Animated.Text>
              
              {/* Crisp top layer */}
              <Animated.Text style={[styles.letter, style]}>
                {char}
              </Animated.Text>
            </View>
          );
        })}
      </View>
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
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8, // Optical balancing for letter spacing
  },
  letterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1, 
  },
  letter: {
    color: BRAND_PURPLE,
    fontSize: 54,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
    fontWeight: '300', // Thin/medium weight
    letterSpacing: 8, // Clean spacing
    textTransform: 'lowercase',
    includeFontPadding: false,
  },
  glowLayer: {
    position: 'absolute',
    color: GLOW_PURPLE,
    textShadowColor: GLOW_PURPLE,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20, // Subtle soft glow
    opacity: 0, // Controlled via baseGlowStyle
  },
});
