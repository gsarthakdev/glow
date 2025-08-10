import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

interface TimePickerProps {
  isVisible: boolean;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
  initialHour?: number;
  initialMinute?: number;
  useCurrentTime?: boolean; // If true, use current time instead of initial values
}

const CustomTimePicker: React.FC<TimePickerProps> = ({
  isVisible,
  onConfirm,
  onCancel,
  initialHour = 8,
  initialMinute = 30,
  useCurrentTime = false,
}) => {
  // Convert 24-hour to 12-hour format for display
  const get12HourFormat = (hour: number) => {
    if (hour === 0) return 12;
    if (hour > 12) return hour - 12;
    return hour;
  };

  // Get current time if useCurrentTime is true
  const getCurrentTime = () => {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  };

  // Determine which time to use
  const effectiveTime = useCurrentTime ? getCurrentTime() : { hour: initialHour, minute: initialMinute };
  console.log('CustomTimePicker - effectiveTime calculated:', { useCurrentTime, initialHour, initialMinute, effectiveTime });

  const [selectedHour, setSelectedHour] = useState(get12HourFormat(effectiveTime.hour));
  const [selectedMinute, setSelectedMinute] = useState(effectiveTime.minute);
  const [isAM, setIsAM] = useState(effectiveTime.hour < 12); // true for AM (0-11), false for PM (12-23)
  const [visibleHour, setVisibleHour] = useState(get12HourFormat(effectiveTime.hour));
  const [visibleMinute, setVisibleMinute] = useState(effectiveTime.minute);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Initialize visible values when component mounts or initial values change
  useEffect(() => {
    const effectiveTime = useCurrentTime ? getCurrentTime() : { hour: initialHour, minute: initialMinute };
    console.log('CustomTimePicker - useEffect triggered with:', { 
      initialHour, 
      initialMinute, 
      useCurrentTime, 
      effectiveTime 
    });
    
    const displayHour = get12HourFormat(effectiveTime.hour);
    setVisibleHour(displayHour);
    setVisibleMinute(effectiveTime.minute);
    
    // Also update selected values to match effective time
    setSelectedHour(displayHour);
    setSelectedMinute(effectiveTime.minute);
    setIsAM(effectiveTime.hour < 12);
    console.log('CustomTimePicker - State updated:', { 
      displayHour, 
      effectiveTime: effectiveTime.minute, 
      isAM: effectiveTime.hour < 12,
      originalHour: effectiveTime.hour
    });
    
    // Scroll to initial positions after a short delay to ensure refs are ready
    setTimeout(() => {
      if (hourScrollRef.current) {
        const hourIndex = hours.indexOf(displayHour);
        // Start in the middle of the repeated data (2 * data.length * itemHeight)
        const hourY = (2 * hours.length * 50) + (hourIndex * 50);
        hourScrollRef.current.scrollTo({ y: hourY, animated: false });
        console.log('CustomTimePicker - Scrolled hour to:', { 
          originalHour: effectiveTime.hour, 
          displayHour, 
          hourIndex, 
          hourY,
          hours: hours,
          expectedPosition: `middle + ${hourIndex} * 50 = ${hourY}`
        });
        
        // Force update visible hour after scroll
        setTimeout(() => {
          setVisibleHour(displayHour);
          console.log('CustomTimePicker - Forced visibleHour update to:', displayHour);
        }, 50);
      }
      if (minuteScrollRef.current) {
        const minuteIndex = minutes.indexOf(effectiveTime.minute);
        // Start in the middle of the repeated data (2 * minutes.length * itemHeight)
        const minuteY = (2 * minutes.length * 50) + (minuteIndex * 50);
        minuteScrollRef.current.scrollTo({ y: minuteY, animated: false });
        console.log('CustomTimePicker - Scrolled minute to:', { 
          effectiveTime: effectiveTime.minute, 
          minuteIndex, 
          minuteY,
          minutes: minutes.slice(0, 10) // Show first 10 minutes for debugging
        });
        
        // Force update visible minute after scroll
        setTimeout(() => {
          setVisibleMinute(effectiveTime.minute);
          console.log('CustomTimePicker - Forced visibleMinute update to:', effectiveTime.minute);
        }, 50);
      }
    }, 100);
  }, [isVisible, initialHour, initialMinute, useCurrentTime]);

  const handleConfirm = () => {
    let finalHour = isAM ? selectedHour : selectedHour + 12;
    if (finalHour === 24) finalHour = 12; // 12 PM case
    if (finalHour === 0) finalHour = 12; // 12 AM case
    onConfirm(finalHour, selectedMinute);
  };

  const scrollToValue = (scrollViewRef: React.RefObject<ScrollView>, value: number, itemHeight: number) => {
    if (scrollViewRef.current) {
      const yOffset = value * itemHeight;
      scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
    }
  };

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  const renderPickerColumn = (
    data: number[],
    selectedValue: number,
    onValueChange: (value: number) => void,
    visibleValue: number,
    scrollRef: React.RefObject<ScrollView | null>,
    itemHeight: number = 50
  ) => {
    // Create a repeating array to simulate infinite scrolling
    const repeatedData = [...data, ...data, ...data, ...data, ...data];
    
    return (
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        style={styles.pickerColumn}
        contentContainerStyle={styles.pickerContent}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          const index = Math.round(y / itemHeight);
          // Map the index to the original data array (accounting for repetition)
          const originalIndex = index % data.length;
          const newValue = data[originalIndex];
          
          // Update visible value for real-time text highlighting
          if (data === hours) {
            setVisibleHour(newValue);
            console.log('CustomTimePicker - Hour scroll:', { y, index, originalIndex, newValue, visibleHour: newValue });
          } else if (data === minutes) {
            setVisibleMinute(newValue);
            console.log('CustomTimePicker - Minute scroll:', { y, index, originalIndex, newValue, visibleMinute: newValue });
          }
        }}
        onMomentumScrollEnd={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          const index = Math.round(y / itemHeight);
          // Map the index to the original data array (accounting for repetition)
          const originalIndex = index % data.length;
          const newValue = data[originalIndex];
          
          onValueChange(newValue);
          // Also update visible values to ensure they match
          if (data === hours) {
            setVisibleHour(newValue);
            console.log('CustomTimePicker - Hour momentum end:', { y, index, originalIndex, newValue, selectedHour: newValue });
          } else if (data === minutes) {
            setVisibleMinute(newValue);
            console.log('CustomTimePicker - Minute momentum end:', { y, index, originalIndex, newValue, selectedMinute: newValue });
          }
        }}
      >
        {/* Data items repeated multiple times for infinite scrolling effect */}
        {repeatedData.map((item, index) => (
          <View key={index} style={[styles.pickerItem, { height: itemHeight }]}>
            <Text style={[
              styles.pickerItemText,
              visibleValue === item && styles.pickerItemTextSelected
            ]}>
              {formatTime(item)}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.pickerContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Set Time</Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, styles.confirmButton]}>Set</Text>
              </TouchableOpacity>
            </View>

            {/* Time Picker */}
            <View style={styles.timePickerContainer}>
              {/* Selection Indicator */}
              <View style={styles.selectionIndicator} />
              

              
              {/* Hours */}
              <View style={styles.pickerColumnContainer}>
                <Text style={styles.pickerLabel}>Hour</Text>
                {renderPickerColumn(
                  hours,
                  selectedHour,
                  setSelectedHour,
                  visibleHour,
                  hourScrollRef,
                  50
                )}
              </View>

              {/* Minutes */}
              <View style={styles.pickerColumnContainer}>
                <Text style={styles.pickerLabel}>Min</Text>
                {renderPickerColumn(
                  minutes,
                  selectedMinute,
                  setSelectedMinute,
                  visibleMinute,
                  minuteScrollRef,
                  50
                )}
              </View>

              {/* AM/PM Toggle */}
              <View style={styles.ampmContainer}>
                <Text style={styles.pickerLabel}>AM/PM</Text>
                <View style={styles.ampmToggle}>
                  <TouchableOpacity
                    style={[styles.ampmButton, isAM && styles.ampmButtonActive]}
                    onPress={() => setIsAM(true)}
                  >
                    <Text style={[styles.ampmButtonText, isAM && styles.ampmButtonTextActive]}>
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ampmButton, !isAM && styles.ampmButtonActive]}
                    onPress={() => setIsAM(false)}
                  >
                    <Text style={[styles.ampmButtonText, !isAM && styles.ampmButtonTextActive]}>
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: screenWidth * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  confirmButton: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    position: 'relative',
  },
  pickerColumnContainer: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerColumn: {
    height: 150,
    width: 80,
  },
  pickerContent: {
    alignItems: 'center',
  },
  pickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pickerItemText: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '400',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  pickerItemTextSelected: {
    color: '#000000',
    fontWeight: '600',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  ampmContainer: {
    alignItems: 'center',
    // flex: 1,
  },
  ampmToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginTop: 10,
  },
  ampmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  ampmButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ampmButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  ampmButtonTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    height: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    zIndex: -1,
    marginTop: -43, // Adjust to align with text center
  },
});

export default CustomTimePicker;
