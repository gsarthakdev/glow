import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolate,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function WelcomeScrn({ navigation }: { navigation: any }) {
  // Animated values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);
  const backgroundOpacity = useSharedValue(0);
  const gradientProgress = useSharedValue(0);
  const transitionScale = useSharedValue(1);
  const transitionOpacity = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const contentScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  useEffect(() => {
    // Apple-style entrance sequence
    // 1. Background fades in
    backgroundOpacity.value = withTiming(1, { duration: 1000 });
    
    // 2. Start gradient drift animation
    gradientProgress.value = withRepeat(
      withTiming(1, { duration: 8000 }),
      -1,
      false
    );
    
    // 3. Logo appears with spring
    setTimeout(() => {
      logoScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      logoOpacity.value = withTiming(1, { duration: 800 });
    }, 500);

    // 4. Text slides up and fades in
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 1200 });
      textTranslateY.value = withSpring(0, { damping: 20, stiffness: 80 });
    }, 1500);

    // 5. Button appears with spring and immediately starts pulsing
    setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: 600 });
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      
      // Start pulsing immediately after button appears
      setTimeout(() => {
        buttonScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1500 }),
            withTiming(1, { duration: 1500 })
          ),
          -1,
          true
        );
      }, 600); // Start pulsing after the spring animation completes
    }, 2800); // Slightly sooner to appear just after text animation
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  // Button entrance/pulse controls only scale; opacity is managed in combined style below
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Combined style so button obeys both entrance timing and exit travel animation
  const buttonContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value * contentOpacity.value,
    transform: [
      { scale: buttonScale.value * contentScale.value },
      { translateY: contentTranslateY.value },
    ],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    const progress = gradientProgress.value;
    
    return {
      transform: [
        {
          translateX: interpolate(progress, [0, 1], [-10, 10], Extrapolate.CLAMP),
        },
        {
          translateY: interpolate(progress, [0, 1], [-5, 5], Extrapolate.CLAMP),
        },
      ],
    };
  });

  const transitionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: transitionScale.value }],
    opacity: transitionOpacity.value,
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: contentScale.value },
      { translateY: contentTranslateY.value }
    ],
    opacity: contentOpacity.value,
  }));

  const handleTap = () => {
    Haptics.selectionAsync();
    
    // Start immersive transition animation
    rippleOpacity.value = withTiming(1, { duration: 150 });
    rippleScale.value = withTiming(1, { duration: 600 });
    
    // Animate all screen elements together with smoother timing
    setTimeout(() => {
      // Background zoom and fade
      transitionScale.value = withTiming(1.3, { duration: 800 });
      transitionOpacity.value = withTiming(0, { duration: 800 });
      
      // Content elements fade out and scale down smoothly
      contentScale.value = withTiming(0.7, { duration: 800 });
      contentOpacity.value = withTiming(0, { duration: 800 });
      contentTranslateY.value = withTiming(-30, { duration: 800 });
    }, 300);
    
    // Navigate after animation completes (slightly extended for smoothness)
    setTimeout(() => {
      navigation.replace('ChildrenCountScrn');
    }, 1300);
  };

  return (
    <View style={styles.container}>
      {/* Animated gradient background with transition */}
      <Animated.View style={[styles.background, backgroundAnimatedStyle, transitionAnimatedStyle]}>
        <Animated.View style={[styles.gradientContainer, gradientAnimatedStyle]}>
          <LinearGradient
            colors={["#FFE5D9", "#E8D5F2", "#FFF8E1", "#E3F2FD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      {/* Ripple overlay */}
      <Animated.View style={[styles.rippleOverlay, rippleAnimatedStyle]} />

      {/* Center content */}
      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoGlow} />
          <Image 
            source={require('../../screens/app_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.title}>Welcome to Glow</Text>
          <Text style={styles.subtitle}>Your space to support, reflect, and grow — together.</Text>
        </Animated.View>
      </Animated.View>

      {/* Button */}
      <Animated.View style={[styles.buttonContainer, buttonContainerAnimatedStyle]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleTap}
          activeOpacity={0.8}
        >
          <View style={styles.buttonGlow} />
          <Text style={styles.buttonText}>Tap to Begin</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientContainer: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: -20,
    bottom: -20,
  },
  rippleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: width,
    transform: [{ scale: 0 }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    marginBottom: 60,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 25,
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: 200,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGlow: {
    position: 'absolute',
    width: 200,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
}); 