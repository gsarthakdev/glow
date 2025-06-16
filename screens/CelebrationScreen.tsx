import React, { useEffect } from 'react';
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
import { SimpleLineIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CelebrationScreen({ navigation }) {
  useEffect(() => {
    // Trigger haptic feedback on mount
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  }, []);

  return (
    <LinearGradient
      colors={['#FFE5DC', '#D3C7FF', '#C4E8F6']}
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
        <Text style={styles.heading}>Great job logging today!</Text>
        <Text style={styles.subtext}>
          You've helped your therapist better understand what happened at home.
        </Text>
        <Text style={styles.streakText}>
          You've logged 3 days this week — keep it up!
        </Text>
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
          <SimpleLineIcons name="paper-plane" size={24} color="#FFF" />
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3E3E6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 18,
    color: '#3E3E6B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  streakText: {
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
