import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DOT_COUNT = 4;
const DOT_BOUNCE_HEIGHT = 10;
const DOT_SIZE = 12;
const DOT_SPACING = 12;
const DOT_ANIMATION_DURATION = 1200; // longer for smooth sine
const AFFIRMATION_FADE_DURATION = 350;

interface AffirmationModalProps {
  visible: boolean;
  affirmations: string[];
  onRequestClose?: () => void;
  cycleInterval?: number; // ms between affirmations
}

// Helper: generate a lookup table for sine wave
function makeSineTable(steps: number) {
  const arr = [];
  for (let i = 0; i < steps; i++) {
    arr.push(Math.sin((2 * Math.PI * i) / steps));
  }
  return arr;
}

const SINE_STEPS = 60;
const SINE_TABLE = makeSineTable(SINE_STEPS);

const AffirmationModal: React.FC<AffirmationModalProps> = ({
  visible,
  affirmations,
  onRequestClose,
  cycleInterval = 1400,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const masterAnim = useRef(new Animated.Value(0)).current; // single value for all dots
  const masterLoop = useRef<Animated.CompositeAnimation | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start/stop master dot animation loop robustly
  useEffect(() => {
    if (visible) {
      masterAnim.setValue(0);
      masterLoop.current = Animated.loop(
        Animated.timing(masterAnim, {
          toValue: 1,
          duration: DOT_ANIMATION_DURATION,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      masterLoop.current.start();
    } else {
      if (masterLoop.current) masterLoop.current.stop();
      masterAnim.setValue(0);
    }
    return () => {
      if (masterLoop.current) masterLoop.current.stop();
    };
  }, [visible, masterAnim]);

  // Cycle affirmations with fade transition
  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: AFFIRMATION_FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIdx(idx => {
          const next = (idx + 1) % affirmations.length;
          // Fade in
          fadeAnim.setValue(0);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: AFFIRMATION_FADE_DURATION,
            useNativeDriver: true,
          }).start();
          return next;
        });
      });
    }, cycleInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, affirmations.length, cycleInterval, fadeAnim]);

  // Reset on open/close
  useEffect(() => {
    if (!visible) {
      setCurrentIdx(0);
      fadeAnim.setValue(1);
    }
  }, [visible, fadeAnim]);

  // Calculate dot translateY using a sine lookup table and Animated interpolation
  const dotNodes = Array.from({ length: DOT_COUNT }).map((_, i) => {
    // Each dot is offset by a phase (in steps)
    const phase = Math.round((SINE_STEPS * i) / DOT_COUNT);
    // Interpolate masterAnim (0-1) to step index (0-SINE_STEPS)
    const inputRange = Array.from({ length: SINE_STEPS + 1 }, (_, idx) => idx / SINE_STEPS);
    const outputRange = inputRange.map((t, idx) => {
      // Lookup sine value with phase offset
      const sineIdx = (idx + phase) % SINE_STEPS;
      return -SINE_TABLE[sineIdx] * DOT_BOUNCE_HEIGHT;
    });
    const translateY = masterAnim.interpolate({
      inputRange,
      outputRange,
    });
    return (
      <Animated.View
        key={i}
        style={[
          styles.dot,
          {
            transform: [
              { translateY },
            ],
            backgroundColor: '#FF6F61',
          },
        ]}
      />
    );
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="heart" size={44} color="#FF6F61" style={{ marginBottom: 12 }} />
          <Animated.Text
            style={[
              styles.affirmationText,
              { opacity: fadeAnim },
            ]}
            accessibilityRole="text"
          >
            {affirmations[currentIdx]}
          </Animated.Text>
          <Text style={{fontSize: 12, marginTop: -25}}>Your PDF Export is being generated</Text>
          <View style={styles.dotsRow}>{dotNodes}</View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 245, 235, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width * 0.8,
    minHeight: 220,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    shadowColor: '#FF6F61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  affirmationText: {
    fontSize: 22,
    color: '#3E3E6B',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
    minHeight: 60,
    letterSpacing: 0.1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
    height: DOT_SIZE + DOT_BOUNCE_HEIGHT,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_SPACING / 2,
    backgroundColor: '#FF6F61',
  },
});

export default AffirmationModal; 