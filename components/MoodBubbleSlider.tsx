import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

interface MoodBubbleSliderProps {
  label: string;
  secondary?: string;
  onValueChange: (value: number) => void;
  value?: number;
}

const MoodBubbleSlider: React.FC<MoodBubbleSliderProps> = ({
  label,
  secondary,
  onValueChange,
  value: controlledValue,
}) => {
  const [localValue, setLocalValue] = useState(controlledValue || 0);
  const bubbleScale = useRef(new Animated.Value(1)).current;

  const handleValueChange = useCallback((newValue: number) => {
    setLocalValue(newValue);
    onValueChange(Math.round(newValue));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate the bubble
    Animated.sequence([
      Animated.timing(bubbleScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [onValueChange, bubbleScale]);

  const handleClear = useCallback(() => {
    setLocalValue(0);
    onValueChange(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onValueChange]);

  // Calculate colors based on value
  const getTrackColor = (value: number) => {
    // Green (120) -> Yellow (60) -> Red (0)
    let hue;
    if (value <= 5) {
      // First half: Green to Yellow
      hue = 120 - (value * 12); // 120 (green) to 60 (yellow)
    } else {
      // Second half: Yellow to Red
      hue = 60 - ((value - 5) * 12); // 60 (yellow) to 0 (red)
    }
    return `hsl(${hue}, 85%, ${value <= 5 ? 45 : 50}%)`; // Slightly darker green, brighter red
  };

  // Calculate bubble color
  const bubbleColor = getTrackColor(localValue);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          {label === "Before" ? (
            // if secondary starts with the word "Parent", then we don't show the text with the word "child" vice versa for the word "caregiver"
            <Text style={styles.label}>{label}{secondary && (secondary.toLowerCase().startsWith('parent') || secondary.toLowerCase().startsWith('child')) ? null : ' child'} {secondary ? secondary.toLowerCase() : null}</Text>
          ) : (
            <Text style={styles.label}>{label}{secondary && (secondary.toLowerCase().startsWith('parent') || secondary.toLowerCase().startsWith('child') || secondary.toLowerCase().startsWith('caregiver')) ? null : ' caregiver'} {secondary ? secondary.toLowerCase() : null}</Text>
          )}
          {/* <Text style={styles.label}>Select the mood {label.toLowerCase()} {secondary ? secondary.toLowerCase() : null}</Text> */}
          {/* {secondary ? <Text style={styles.secondaryLabel}>{secondary}</Text> : null} */}
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityLabel="Clear selection"
            accessibilityRole="button"
          >
            <Text style={styles.clearButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        {localValue > 0 && (
          <Animated.View
            style={[
              styles.valueBubble,
              { backgroundColor: bubbleColor, transform: [{ scale: bubbleScale }] }
            ]}
          >
            <Text style={styles.valueText}>{Math.round(localValue)}</Text>
          </Animated.View>
        )}

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={0.1}
          value={localValue}
          onValueChange={handleValueChange}
          minimumTrackTintColor={getTrackColor(localValue)}
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor={bubbleColor}
        />

        <View style={styles.labelContainer}>
          <Text style={[styles.endLabel, { textAlign: 'left' }]}>Calm</Text>
          <Text style={[styles.endLabel, { textAlign: 'right' }]}>Meltdown</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
    marginTop: -10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  secondaryLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    maxWidth: 250,
  },
  clearButton: {
    paddingVertical: 8,
    // paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 15,
  },
  sliderContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  valueBubble: {
    position: 'absolute',
    top: -45,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  valueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  endLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    fontWeight: 'bold'
  },
});

export default MoodBubbleSlider;
