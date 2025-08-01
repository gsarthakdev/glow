import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Import the flow data
import { flow_basic_1 as negativeFlow } from './flows/flow_basic_1';
import { flow_basic_1 as positiveFlow } from './flows/positive_flow_basic_1';

// Helper function to get random item from array
const getRandomItem = (array: any[]) => array[Math.floor(Math.random() * array.length)];

// Helper function to get random number between min and max
const getRandomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper function to generate realistic mood values
const generateMoodValues = (sentiment: 'positive' | 'negative') => {
  if (sentiment === 'positive') {
    // For positive logs, mood should generally improve or stay good
    const before = getRandomNumber(3, 7);
    const after = getRandomNumber(before, 10);
    return { before, after };
  } else {
    // For negative logs, mood should generally decline or stay low
    const before = getRandomNumber(4, 8);
    const after = getRandomNumber(1, before);
    return { before, after };
  }
};

// Helper function to generate random answers for a question
const generateAnswersForQuestion = (question: any, sentiment: 'positive' | 'negative') => {
  const answers: any[] = [];
  
  // For each question, randomly select 1-2 answers
  const numAnswers = getRandomNumber(1, 2);
  const availableChoices = question.answer_choices.filter((choice: any) => 
    choice.label !== 'Other' && choice.sentiment === sentiment
  );
  
  // If no matching sentiment choices, use any non-Other choice
  const choicesToUse = availableChoices.length > 0 ? availableChoices : 
    question.answer_choices.filter((choice: any) => choice.label !== 'Other');
  
  for (let i = 0; i < numAnswers && i < choicesToUse.length; i++) {
    const choice = getRandomItem(choicesToUse);
    // Avoid duplicates
    if (!answers.find(a => a.answer === choice.label)) {
      answers.push({
        answer: choice.label,
        isCustom: false
      });
    }
  }
  
  return answers;
};

// Helper function to generate a single log
const generateLog = (date: Date, sentiment: 'positive' | 'negative') => {
  const flow = sentiment === 'positive' ? positiveFlow : negativeFlow;
  
  // Generate random time within the day
  const hour = getRandomNumber(6, 22);
  const minute = getRandomNumber(0, 59);
  const timestamp = new Date(date);
  timestamp.setHours(hour, minute, 0, 0);
  
  // Generate responses for each question
  const responses: any = {};
  flow.forEach((question: any) => {
    if (question.id === 'mood') {
      const moodValues = generateMoodValues(sentiment);
      responses[question.id] = {
        question: question.question,
        answers: [{
          answer: `Before: ${moodValues.before}, After: ${moodValues.after}`,
          isCustom: false
        }],
        comment: getRandomNumber(1, 10) <= 3 ? 'Great progress today!' : '', // 30% chance of comment
        sentiment: sentiment
      };
    } else {
      const answers = generateAnswersForQuestion(question, sentiment);
      responses[question.id] = {
        question: question.question,
        answers: answers,
        comment: getRandomNumber(1, 10) <= 2 ? 'Worth noting' : '', // 20% chance of comment
        sentiment: sentiment
      };
    }
  });
  
  return {
    id: `log_${uuidv4()}`,
    timestamp: timestamp.toISOString(),
    responses: responses
  };
};

export default function DummyLogGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDummyLogs = async () => {
    setIsGenerating(true);
    
    try {
      // Get current selected child
      const selectedChildJson = await AsyncStorage.getItem('current_selected_child');
      if (!selectedChildJson) {
        Alert.alert('Error', 'No child selected. Please select a child first.');
        return;
      }
      
      const selectedChild = JSON.parse(selectedChildJson);
      const childId = selectedChild.id;
      
      // Get existing child data
      const childDataJson = await AsyncStorage.getItem(childId);
      if (!childDataJson) {
        Alert.alert('Error', 'Child data not found.');
        return;
      }
      
      const childData = JSON.parse(childDataJson);
      
      // Generate logs for July 1-25, 2024
      const logs: any[] = [];
      const startDate = new Date('2x025-07-26');
      
      for (let i = 0; i < 25; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Generate 1-3 logs per day
        const logsPerDay = getRandomNumber(1, 3);
        
        for (let j = 0; j < logsPerDay; j++) {
          // 60% positive, 40% negative for realistic mix
          const sentiment = getRandomNumber(1, 10) <= 6 ? 'positive' : 'negative';
          const log = generateLog(currentDate, sentiment);
          logs.push(log);
        }
      }
      
      // Separate logs by sentiment
      const positiveLogs = logs.filter(log => log.responses.whatDidTheyDo?.sentiment === 'positive');
      const negativeLogs = logs.filter(log => log.responses.whatDidTheyDo?.sentiment === 'negative');
      
      // Update child data with new logs
      const updatedData = {
        ...childData,
        completed_logs: {
          ...childData.completed_logs,
          flow_basic_1_positive: [
            ...(childData.completed_logs?.flow_basic_1_positive || []),
            ...positiveLogs
          ],
          flow_basic_1_negative: [
            ...(childData.completed_logs?.flow_basic_1_negative || []),
            ...negativeLogs
          ]
        }
      };
      
      // Save updated data
      await AsyncStorage.setItem(childId, JSON.stringify(updatedData));
      
      Alert.alert(
        'Success!', 
        `Generated ${logs.length} dummy logs:\n- ${positiveLogs.length} positive logs\n- ${negativeLogs.length} negative logs\n\nLogs created for July 1-25, 2024.`
      );
      
    } catch (error) {
      console.error('Error generating dummy logs:', error);
      Alert.alert('Error', 'Failed to generate dummy logs. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAllLogs = async () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to clear all completed logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const selectedChildJson = await AsyncStorage.getItem('current_selected_child');
              if (!selectedChildJson) {
                Alert.alert('Error', 'No child selected.');
                return;
              }
              
              const selectedChild = JSON.parse(selectedChildJson);
              const childId = selectedChild.id;
              const childDataJson = await AsyncStorage.getItem(childId);
              
              if (childDataJson) {
                const childData = JSON.parse(childDataJson);
                const updatedData = {
                  ...childData,
                  completed_logs: {
                    flow_basic_1_positive: [],
                    flow_basic_1_negative: []
                  }
                };
                
                await AsyncStorage.setItem(childId, JSON.stringify(updatedData));
                Alert.alert('Success', 'All logs cleared successfully.');
              }
            } catch (error) {
              console.error('Error clearing logs:', error);
              Alert.alert('Error', 'Failed to clear logs.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#FFE5DC", "#D3C7FF", "#C4E8F6"]}
        style={styles.background}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Dummy Log Generator</Text>
          <Text style={styles.subtitle}>For Staging & Testing Purposes</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              This will generate realistic dummy logs for July 1-25, 2024 with:
            </Text>
            <Text style={styles.infoText}>• 1-3 logs per day</Text>
            <Text style={styles.infoText}>• Mix of positive (60%) and negative (40%) logs</Text>
            <Text style={styles.infoText}>• Realistic mood values and responses</Text>
            <Text style={styles.infoText}>• Random comments on some logs</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.generateButton, isGenerating && styles.disabledButton]}
            onPress={generateDummyLogs}
            disabled={isGenerating}
          >
            <Text style={styles.buttonText}>
              {isGenerating ? 'Generating...' : 'Generate Dummy Logs'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearAllLogs}
          >
            <Text style={[styles.buttonText, styles.clearButtonText]}>
              Clear All Logs
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3E3E6B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 14,
    color: '#3E3E6B',
    marginBottom: 4,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#5B9AA0',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButtonText: {
    color: '#E74C3C',
  },
}); 