import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import {Confetti} from 'react-native-fast-confetti';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SimpleLineIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface LogEntry {
  id: string;
  timestamp: string;
  responses: any;
}

interface ChildData {
  completed_logs: {
    flow_basic_1_positive: LogEntry[];
    flow_basic_1_negative: LogEntry[];
  };
  child_name: string;
}

export default function CelebrationScreen({ navigation }: { navigation: any }) {
  const [streakCount, setStreakCount] = useState(0);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [todayIndex, setTodayIndex] = useState(0);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    // Trigger haptic feedback on mount
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
    
    // Load real data
    loadStreakData();
  }, []);

  const loadStreakData = async () => {
    try {
      // Get current selected child
      const currentChildData = await AsyncStorage.getItem('current_selected_child');
      if (currentChildData) {
        const currentChild = JSON.parse(currentChildData);
        setChildName(currentChild.child_name);
        
        // Get child's data
        const childKey = currentChild.id;
        const childDataString = await AsyncStorage.getItem(childKey);
        
        if (childDataString) {
          const childData: ChildData = JSON.parse(childDataString);
          calculateStreakAndProgress(childData);
        }
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    }
  };

  const calculateStreakAndProgress = (childData: ChildData) => {
    // Get all completed logs (both positive and negative)
    const allLogs = [
      ...childData.completed_logs.flow_basic_1_positive,
      ...childData.completed_logs.flow_basic_1_negative
    ];

    // Sort logs by timestamp (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate current streak - start from the most recent log date
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (allLogs.length > 0) {
      // Start from the most recent log date
      const mostRecentLog = allLogs[0];
      const mostRecentLogDate = new Date(mostRecentLog.timestamp);
      mostRecentLogDate.setHours(0, 0, 0, 0);
      
      // Check if the most recent log is today or yesterday
      const daysDiff = Math.floor((today.getTime() - mostRecentLogDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('Most recent log date:', mostRecentLogDate.toDateString());
      console.log('Today:', today.toDateString());
      console.log('Days difference:', daysDiff);
      
      if (daysDiff <= 1) { // Log is from today or yesterday
        let currentDate = new Date(mostRecentLogDate);
        
        // Create a map of dates that have logs for faster lookup
        const logDates = new Set();
        allLogs.forEach(log => {
          const logDate = new Date(log.timestamp);
          logDate.setHours(0, 0, 0, 0);
          logDates.add(logDate.toISOString().split('T')[0]);
        });
        
        console.log('Log dates found:', Array.from(logDates));
        
        for (let i = 0; i < 30; i++) { // Check last 30 days
          const dateString = currentDate.toISOString().split('T')[0];
          const hasLogForDate = logDates.has(dateString);
          
          console.log(`Checking date ${dateString}: ${hasLogForDate ? 'HAS LOG' : 'NO LOG'}`);
          
          if (hasLogForDate) {
            currentStreak++;
            console.log(`Streak incremented to: ${currentStreak}`);
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            console.log(`Breaking streak at date ${dateString}`);
            break;
          }
        }
      }
    }
    
    console.log('Final streak count:', currentStreak);
    setStreakCount(currentStreak);

    // Calculate weekly progress
    const weekDaysArray = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    setWeekDays(weekDaysArray);
    
    // Get start of current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(today.getDate() - daysToMonday);
    
    const completedDaysArray: number[] = [];
    let todayIndexInWeek = 0;
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(startOfWeek.getDate() + i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      const hasLogForDate = allLogs.some(log => {
        const logDate = new Date(log.timestamp);
        const logDateString = logDate.toISOString().split('T')[0];
        return logDateString === dateString;
      });
      
      if (hasLogForDate) {
        completedDaysArray.push(i);
      }
      
      // Check if this is today
      if (checkDate.toDateString() === today.toDateString()) {
        todayIndexInWeek = i;
      }
    }
    
    setCompletedDays(completedDaysArray);
    setTodayIndex(todayIndexInWeek);
  };

  return (
    <LinearGradient
      colors={['#FFE5DC', '#D3C7FF', '#C4E8F6']}
      // colors={['#e1f2fd', '#e1f2fd', '#e1f2fd']}
      style={styles.container}
    >
      <Confetti
        colors={['#FFB7B7', '#FFE66D', '#7EC4CF', '#B8E1F3', '#FFB6C1']}
        count={200}
        // explosionSpeed={350}
        // fallSpeed={3000}
        // origin={{ x: width / 2, y: -30 }}
      />

      <View style={styles.content}>
        {/* Top Section - Celebration Icon + Text */}
        <View style={styles.celebrationSection}>
          <View style={styles.flameIconContainer}>
            <View style={styles.flameIcon}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{streakCount}</Text>
            </View>
          </View>
          <Text style={styles.streakText}>day streak!</Text>
        </View>

        {/* Middle Section - Progress Tracker */}
        <View style={styles.progressSection}>
          <View style={styles.progressCard}>
            <View style={styles.weekDaysContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.dayContainer}>
                  <View style={[
                    styles.dayCircle,
                    completedDays.includes(index) && styles.completedDay,
                    index === todayIndex && styles.todayCircle
                  ]}>
                    {completedDays.includes(index) && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                    {index === todayIndex && (
                      <View style={styles.todayFlameOverlay}>
                        {/* <LinearGradient
                          colors={['#FF6B35', '#FF8E53']}
                          style={styles.smallFlame}> */}
                          <Text>🔥</Text>
                        {/* </LinearGradient> */}
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.dayLabel,
                    index === todayIndex && styles.todayLabel
                  ]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Explanation Text */}
            <View style={styles.explanationSection}>
              <Text style={styles.explanationText}>
                A <Text style={styles.highlightedText}>streak</Text> shows being consistent with logging behaviors! Your BCBA loves this!
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.subtext}>
          You've helped your therapist better understand what happened at home.
        </Text>
        {/* <Text style={styles.thanksText}>
          Thanks for doing your part in logging!
        </Text> */}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <SimpleLineIcons name="home" size={24} color="#3E3E6B" />
          <Text style={styles.buttonText}>Go Home</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => {
            // TODO: Implement share functionality
            console.log('Share with therapist');
          }}
        >
          <SimpleLineIcons name="paper-plane" size={24} color="#3E3E6B" />
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Send to Therapist
          </Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            navigation.replace('FlowBasic1BaseScrn');
          }}
        >
          <SimpleLineIcons name="plus" size={24} color="#3E3E6B" />
          <Text style={styles.buttonText}>Log Another</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  celebrationSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  flameIconContainer: {
    marginBottom: 16,
  },
  flameIcon: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fireEmoji: {
    fontSize: 180,
    position: 'absolute',
    zIndex: 0,
  },
  streakNumber: {
    fontSize: 85,
    fontWeight: 'bold',
    color: '#fff',
    zIndex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    // Create bubble letter effect with multiple shadows
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    // Additional outline effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 2,
    marginTop: 50,
    marginLeft: 17
  },
  streakText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginLeft: 15
  },
  progressSection: {
    marginBottom: 40,
    // marginTop: 60,
    width: '100%',
  },
  progressCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  completedDay: {
    backgroundColor: '#FF6B35',
  },
  todayCircle: {
    backgroundColor: '#FF6B35',
  },
  todayFlameOverlay: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 2,
  },
  smallFlame: {
    width: 16,
    height: 20,
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  todayLabel: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  explanationSection: {
    alignItems: 'center',
  },
  explanationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightedText: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 18,
    color: '#3E3E6B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  thanksText: {
    fontSize: 16,
    color: '#3E3E6B',
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButton: {
    backgroundColor: '#5B9AA0',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E3E6B',
  },
  primaryButtonText: {
    color: '#FFF',
  },
});
