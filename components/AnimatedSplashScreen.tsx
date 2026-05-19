import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Text, Platform, Image } from 'react-native';
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

const { width, height } = Dimensions.get('window');
const PARTICLES_COUNT = 80;

export default function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  // Single shared value drives all particles for maximum 60fps performance
  const particleProgress = useSharedValue(0);
  const logoProgress = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  // Generate random scatter positions for particles
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLES_COUNT }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 150 + Math.random() * 400; 
      return {
        startX: Math.cos(angle) * distance,
        startY: Math.sin(angle) * distance,
        size: 2 + Math.random() * 6,
        isDarkPurple: Math.random() > 0.5,
      };
    });
  }, []);

  useEffect(() => {
    // 1. Particles rapidly fly into the center
    particleProgress.value = withDelay(
      300,
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.exp) })
    );

    // 2. The constructed gradient logo bursts out
    logoProgress.value = withDelay(
      1050, // Triggers exactly as particles collapse
      withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) })
    );

    // 3. Fade entire splash screen cleanly into the app
    containerOpacity.value = withDelay(
      2800,
      withTiming(0, { duration: 450, easing: Easing.inOut(Easing.ease) }, (finished) => {
        if (finished) {
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

  const logoStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(logoProgress.value, [0, 0.2, 1], [0, 1, 1]),
      transform: [
        { scale: interpolate(logoProgress.value, [0, 1], [0.3, 1]) }
      ],
    };
  });

  const auraStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(logoProgress.value, [0, 0.5, 1], [0, 0.8, 0.4]),
      transform: [
        { scale: interpolate(logoProgress.value, [0, 1], [0.5, 1.5]) }
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      
      {/* Deep purple/black gradient aura that pulses behind the logo */}
      <Animated.View style={[styles.auraContainer, auraStyle, { backgroundColor: 'rgba(147, 51, 234, 0.15)', borderRadius: width * 0.75 }]} />

      {/* The Particle Swarm */}
      {particles.map((p, i) => {
        const style = useAnimatedStyle(() => {
          const v = particleProgress.value;
          return {
            opacity: interpolate(v, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
            transform: [
              { translateX: interpolate(v, [0, 1], [p.startX, 0]) },
              { translateY: interpolate(v, [0, 1], [p.startY, 0]) },
              { scale: interpolate(v, [0, 0.9, 1], [1, 1, 0.1]) },
            ],
          };
        });

        return (
          <Animated.View 
            key={i} 
            style={[
              styles.particle, 
              { 
                width: p.size, 
                height: p.size, 
                backgroundColor: p.isDarkPurple ? '#3B0764' : '#A855F7' 
              }, 
              style
            ]} 
          />
        );
      })}

      {/* The Constructed ALMS Logo */}
      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <View style={styles.logoBox}>
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1C063D' }]} // Fallback solid deep purple
          />
          {/* Texture overlay from the real ALMS icon.png, rotated and scaled */}
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.logoTexture}
            resizeMode="cover"
          />
          
          {/* Subtle inner ring to make it look like a premium app icon */}
          <View style={styles.logoInnerRing}>
            <Text style={styles.logoText}>alms</Text>
            <Text style={styles.logoSubtext}>FOR STUDENTS</Text>
          </View>
        </View>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#000000', // Pitch black canvas
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraContainer: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 10,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  logoWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7E22CE',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  logoBox: {
    width: 150,
    height: 150,
    borderRadius: 36, // iOS-style squircle border
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)', // Premium rim light matching the icon
  },
  logoTexture: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: -80,
    left: -80,
    opacity: 0.35, // Blend the polygons with the gradient
    transform: [{ rotate: '35deg' }], // Rotating completely scrambles the original text into pure geometric texture
  },
  logoInnerRing: {
    width: 134,
    height: 134,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
});
