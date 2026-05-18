import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Props {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const [hidden, setHidden] = useState(false);
  
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.4);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const ringScale1 = useSharedValue(0.8);
  const ringOpacity1 = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Reveal logo
    logoOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 90 });

    // Expanding ring effect
    ringScale1.value = withDelay(300, withSpring(1.5, { damping: 20, stiffness: 60 }));
    ringOpacity1.value = withDelay(300, withTiming(0.15, { duration: 800 }));

    // Reveal text
    textOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    textTranslateY.value = withDelay(600, withSpring(0, { damping: 12, stiffness: 90 }));

    // Hide everything
    containerOpacity.value = withDelay(
      2800,
      withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }, (finished) => {
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

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textTranslateY.value }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    return {
      opacity: ringOpacity1.value,
      transform: [{ scale: ringScale1.value }],
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
      <LinearGradient
        colors={['#0A0B10', '#12151C']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[styles.ring, ringStyle]} />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBox}
        >
          <Text style={styles.logoText}>ALMS</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.subtitle}>LOVELY PROFESSIONAL UNIVERSITY</Text>
        <Text style={styles.version}>PREMIUM EXPERIENCE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logoBox: {
    width: 130,
    height: 130,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  textContainer: {
    position: 'absolute',
    bottom: height * 0.12,
    alignItems: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.9,
  },
  version: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: 4,
    opacity: 0.8,
  },
});
