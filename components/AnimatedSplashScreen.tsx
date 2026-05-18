import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onAnimationComplete: () => void;
}

const { width, height } = Dimensions.get('window');
const PARTICLES_COUNT = 80;

export default function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const [hidden, setHidden] = useState(false);
  
  // Single shared value drives all particles for maximum 60fps performance
  const particleProgress = useSharedValue(0);
  const logoProgress = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  // Generate random scatter positions for particles
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLES_COUNT }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      // Start them well outside the center, some even off-screen
      const distance = 150 + Math.random() * 400; 
      return {
        startX: Math.cos(angle) * distance,
        startY: Math.sin(angle) * distance,
        size: 3 + Math.random() * 5,
        isDarkPurple: Math.random() > 0.5,
      };
    });
  }, []);

  useEffect(() => {
    // 1. Particles rapidly fly into the center
    particleProgress.value = withDelay(
      200,
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.exp) })
    );

    // 2. The real ALMS logo bursts out as particles hit the center
    logoProgress.value = withDelay(
      950, // Triggers exactly as particles collapse
      withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) })
    );

    // 3. Fade entire splash screen cleanly into the app
    containerOpacity.value = withDelay(
      2600,
      withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }, (finished) => {
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

  if (hidden) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      
      {/* Deep purple/black gradient aura that pulses behind the logo */}
      <Animated.View style={[styles.auraContainer, auraStyle]}>
        <LinearGradient
          colors={['rgba(147, 51, 234, 0.6)', 'rgba(0, 0, 0, 0)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

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
                backgroundColor: p.isDarkPurple ? '#4C1D95' : '#A855F7' 
              }, 
              style
            ]} 
          />
        );
      })}

      {/* The Real ALMS Logo */}
      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <Image 
          source={require('../assets/images/splash-icon.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
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
    width: 200,
    height: 200,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});
