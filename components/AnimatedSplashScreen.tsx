import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface Props {
  onAnimationComplete: () => void;
}

const ALMS_LETTERS = ['a', 'l', 'm', 's'];
const SUB_LETTERS = ['F', 'O', 'R', ' ', 'S', 'T', 'U', 'D', 'E', 'N', 'T', 'S'];

export default function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const [hidden, setHidden] = useState(false);
  
  // Safe explicit hook declarations for constant arrays to satisfy React Hook rules
  const a1 = useSharedValue(0);
  const a2 = useSharedValue(0);
  const a3 = useSharedValue(0);
  const a4 = useSharedValue(0);
  const almsProgress = [a1, a2, a3, a4];

  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);
  const s3 = useSharedValue(0);
  const s4 = useSharedValue(0);
  const s5 = useSharedValue(0);
  const s6 = useSharedValue(0);
  const s7 = useSharedValue(0);
  const s8 = useSharedValue(0);
  const s9 = useSharedValue(0);
  const s10 = useSharedValue(0);
  const s11 = useSharedValue(0);
  const subProgress = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];

  const containerOpacity = useSharedValue(1);

  // Cinematic District-style easing
  const cinematicEase = Easing.bezier(0.16, 1, 0.3, 1);
  const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

  useEffect(() => {
    // 1. "alms" forms letter by letter
    almsProgress.forEach((p, i) => {
      p.value = withDelay(
        350 + i * 110, // Staggering
        withTiming(1, { duration: 1200, easing: cinematicEase })
      );
    });

    // 2. "FOR STUDENTS" forms rapidly below it right as ALMS settles
    subProgress.forEach((p, i) => {
      p.value = withDelay(
        800 + i * 40, // Fast fluid stagger
        withTiming(1, { duration: 900, easing: cinematicEase })
      );
    });

    // 3. Fade the whole splash screen out smoothly into the app
    containerOpacity.value = withDelay(
      2800,
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

  const getLetterStyle = (progress: Animated.SharedValue<number>, isSub: boolean) => {
    return useAnimatedStyle(() => {
      const v = progress.value;
      const startY = isSub ? 10 : 18; // Subtitle pops up from a shorter distance
      return {
        opacity: interpolate(v, [0, 0.3, 1], [0, 1, 1]),
        transform: [
          { translateY: interpolate(v, [0, 1], [startY, 0]) },
          { scale: interpolate(v, [0, 1], [isSub ? 1.05 : 1.08, 1]) },
          { skewX: `${interpolate(v, [0, 1], [12, 0])}deg` } // The District signature motion skew
        ],
      };
    });
  };

  if (hidden) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={styles.mainContainer}>
        {/* Main "alms" Text */}
        <View style={styles.textRow}>
          {ALMS_LETTERS.map((char, i) => {
            const style = getLetterStyle(almsProgress[i], false);
            return (
              <View key={`alms-${i}`} style={styles.letterWrapper}>
                <Animated.Text style={[styles.mainLetter, style]}>
                  {char}
                </Animated.Text>
              </View>
            );
          })}
        </View>

        {/* Subtitle "FOR STUDENTS" */}
        <View style={styles.subRow}>
          {SUB_LETTERS.map((char, i) => {
            if (char === ' ') {
              return <View key={`space-${i}`} style={{ width: 8 }} />;
            }
            // Map index to progress array (skipping the space at index 3)
            const progressIndex = i > 3 ? i - 1 : i;
            const style = getLetterStyle(subProgress[progressIndex], true);
            return (
              <View key={`sub-${i}`} style={styles.subLetterWrapper}>
                <Animated.Text style={[styles.subLetter, style]}>
                  {char}
                </Animated.Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#000000', // Ultra-minimal black
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16, // Optical centering correction
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 6,
  },
  letterWrapper: {
    marginHorizontal: 1,
  },
  mainLetter: {
    color: '#FFFFFF',
    fontSize: 60,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '800', // Fuller, solid bold weight
    letterSpacing: 4,
    textTransform: 'lowercase',
    includeFontPadding: false,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6, // Tight clustering
    paddingLeft: 4,
  },
  subLetterWrapper: {
    marginHorizontal: 1,
  },
  subLetter: {
    color: 'rgba(255,255,255,0.75)', // Brighter, fuller grey/white
    fontSize: 12, // Slightly larger
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '800', // Fully bold confident subtitle
    letterSpacing: 5,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
});
