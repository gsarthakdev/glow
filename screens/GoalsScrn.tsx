import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

interface DailyCount {
  date: string; // YYYY-MM-DD format
  count: number;
}

interface Goal {
  id: string;
  text: string;
  dailyCounts: DailyCount[];
  createdAt: string;
  isArchived?: boolean;
}

export default function GoalsScrn({ navigation }: { navigation: any }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [showWeeklyView, setShowWeeklyView] = useState(false);

  useEffect(() => {
    loadGoals();
    checkAndResetDailyCounts();
  }, []);

  const loadGoals = async () => {
    try {
      const goalsData = await AsyncStorage.getItem('goals');
      if (goalsData) {
        try {
          const parsedGoals = JSON.parse(goalsData);
          // Filter out archived goals for display
          const activeGoals = parsedGoals.filter((goal: Goal) => !goal.isArchived);
          setGoals(activeGoals);
        } catch (parseError) {
          console.error('JSON PARSE ERROR in loadGoals:', parseError);
          console.error('Raw goals data:', goalsData);
          // Reset goals data if corrupted
          await AsyncStorage.removeItem('goals');
          setGoals([]);
        }
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const checkAndResetDailyCounts = async () => {
    try {
      const lastResetDate = await AsyncStorage.getItem('last_goal_reset_date');
      const today = getCurrentDate();
      
      // If no last reset date or it's a different day, reset counts
      if (!lastResetDate || lastResetDate !== today) {
                const goalsData = await AsyncStorage.getItem('goals');
        if (goalsData) {
          try {
            const allGoals = JSON.parse(goalsData);
            
            // Remove today's entries from all goals (this effectively resets to 0)
            const updatedGoals = allGoals.map((goal: Goal) => ({
              ...goal,
              dailyCounts: goal.dailyCounts.filter((count: DailyCount) => count.date !== today)
            }));
            
            await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
            
            // Update the last reset date
            await AsyncStorage.setItem('last_goal_reset_date', today);
            
            // Reload goals to reflect the reset
            loadGoals();
          } catch (parseError) {
            console.error('JSON PARSE ERROR in checkAndResetDailyCounts:', parseError);
            console.error('Raw goals data:', goalsData);
            // Reset goals data if corrupted
            await AsyncStorage.removeItem('goals');
            await AsyncStorage.setItem('last_goal_reset_date', today);
          }
        } else {
          // If no goals exist yet, just set the reset date
          await AsyncStorage.setItem('last_goal_reset_date', today);
        }
      }
    } catch (error) {
      console.error('Error checking/resetting daily counts:', error);
    }
  };

  const saveGoals = async (updatedGoals: Goal[]) => {
    try {
      // Load all goals (including archived) and update only the active ones
      const allGoalsData = await AsyncStorage.getItem('goals');
      let allGoals: Goal[] = [];
      if (allGoalsData) {
        try {
          allGoals = JSON.parse(allGoalsData);
        } catch (parseError) {
          console.error('JSON PARSE ERROR in saveGoals:', parseError);
          console.error('Raw goals data:', allGoalsData);
          // Reset goals data if corrupted
          await AsyncStorage.removeItem('goals');
          allGoals = [];
        }
      }
      
      // Update active goals and preserve archived ones
      const archivedGoals = allGoals.filter((goal: Goal) => goal.isArchived);
      const newAllGoals = [...updatedGoals, ...archivedGoals];
      
      await AsyncStorage.setItem('goals', JSON.stringify(newAllGoals));
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD format using local time
  };

  const getTodaysCount = (goal: Goal) => {
    const today = getCurrentDate();
    const todaysEntry = goal.dailyCounts.find(count => count.date === today);
    return todaysEntry ? todaysEntry.count : 0;
  };

  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Monday start
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      weekDates.push(`${year}-${month}-${day}`);
    }
    return weekDates;
  };

  const getDayName = (dateString: string) => {
    // Parse date string in local time to avoid UTC issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Convert Sunday (0) to 6, and shift other days accordingly
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return days[dayIndex];
  };

  const getCountForDate = (goal: Goal, dateString: string) => {
    const entry = goal.dailyCounts.find(count => count.date === dateString);
    return entry ? entry.count : 0;
  };

  const handleAddGoal = async () => {
    if (newGoalText.trim()) {
      const newGoal: Goal = {
        id: uuidv4(),
        text: newGoalText.trim(),
        dailyCounts: [],
        createdAt: new Date().toISOString(),
      };

      const updatedGoals = [...goals, newGoal];
      await saveGoals(updatedGoals);
      setNewGoalText('');
      setIsModalVisible(false);
    }
  };

  const handleUpdateCount = async (goalId: string, increment: number) => {
    const today = getCurrentDate();
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const todaysEntry = goal.dailyCounts.find(count => count.date === today);
        const currentCount = todaysEntry ? todaysEntry.count : 0;
        const newCount = Math.max(0, currentCount + increment);
        
        // Update or add today's count
        const updatedDailyCounts = todaysEntry 
          ? goal.dailyCounts.map(count => 
              count.date === today ? { ...count, count: newCount } : count
            )
          : [...goal.dailyCounts, { date: today, count: newCount }];
        
        return { ...goal, dailyCounts: updatedDailyCounts };
      }
      return goal;
    });
    await saveGoals(updatedGoals);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const goalToDelete = goals.find(goal => goal.id === goalId);
    
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goalToDelete?.text}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Archive the goal instead of deleting it
            const goalToArchive = { ...goalToDelete!, isArchived: true };
            
            // Load all goals and update the archived one
            const allGoalsData = await AsyncStorage.getItem('goals');
            let allGoals: Goal[] = [];
            if (allGoalsData) {
              allGoals = JSON.parse(allGoalsData);
            }
            
            // Update the goal to archived status
            const updatedAllGoals = allGoals.map(goal => 
              goal.id === goalId ? goalToArchive : goal
            );
            
            await AsyncStorage.setItem('goals', JSON.stringify(updatedAllGoals));
            
            // Update the active goals list
            const activeGoals = updatedAllGoals.filter(goal => !goal.isArchived);
            setGoals(activeGoals);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={["#FFE5DC", "#D3C7FF", "#C4E8F6"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.weeklyViewButton}
            onPress={() => setShowWeeklyView(!showWeeklyView)}
          >
            <Text style={styles.weeklyViewButtonText}>
              {showWeeklyView ? 'See daily count' : 'See weekly count'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goals</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.addButtonText}>Add Goal</Text>
          </TouchableOpacity>
        </View>

                {/* Goals List */}
        <ScrollView 
          style={styles.goalsContainer}
          contentContainerStyle={styles.goalsContent}
          showsVerticalScrollIndicator={false}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={64} color="#5B9AA0" />
              <Text style={styles.emptyStateText}>No goals yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add Goal" to create your first goal
              </Text>
            </View>
          ) : showWeeklyView ? (
            // Weekly View
            <View style={styles.weeklyContainer}>
              <View style={styles.weeklyHeader}>
                <Text style={styles.weeklyHeaderText}>Goal</Text>
                {getWeekDates().map((date, index) => (
                  <Text key={index} style={styles.weeklyHeaderDay}>
                    {getDayName(date)}
                  </Text>
                ))}
              </View>
              {goals.map((goal) => (
                <View key={goal.id} style={styles.weeklyGoalRow}>
                  <View style={styles.weeklyGoalTextContainer}>
                    <Text style={styles.weeklyGoalText}>{goal.text}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteGoal(goal.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FF6F61" />
                    </TouchableOpacity>
                  </View>
                  {getWeekDates().map((date, index) => (
                    <View key={index} style={styles.weeklyCountCell}>
                      <Text style={styles.weeklyCountText}>
                        {getCountForDate(goal, date)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            // Daily View
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalItem}>
                <View style={styles.goalTextContainer}>
                  <Text style={styles.goalText}>{goal.text}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteGoal(goal.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF6F61" />
                  </TouchableOpacity>
                </View>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => handleUpdateCount(goal.id, -1)}
                  >
                    <Ionicons name="remove" size={20} color="#5B9AA0" />
                  </TouchableOpacity>
                  <View style={styles.countDisplay}>
                    <Text style={styles.countText}>{getTodaysCount(goal)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => handleUpdateCount(goal.id, 1)}
                  >
                    <Ionicons name="add" size={20} color="#5B9AA0" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Goal Modal */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add New Goal</Text>
                    <TouchableOpacity
                      onPress={() => setIsModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#5B9AA0" />
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={styles.goalInput}
                    placeholder="Type your goal..."
                    value={newGoalText}
                    onChangeText={setNewGoalText}
                    multiline
                    autoFocus
                    maxLength={200}
                  />
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setNewGoalText('');
                        setIsModalVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addGoalButton,
                        !newGoalText.trim() && styles.addGoalButtonDisabled
                      ]}
                      onPress={handleAddGoal}
                      disabled={!newGoalText.trim()}
                    >
                      <Text style={styles.addGoalButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  weeklyViewButton: {
    backgroundColor: '#E8F3F4',
    width: "30%",
    // maxWidth: "38%",
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5B9AA0',
  },
  weeklyViewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B9AA0',
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3E3E6B',
  },
  addButton: {
    backgroundColor: '#5B9AA0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#5B9AA0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  goalsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  goalsContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3E3E6B',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#5B9AA0',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  goalItem: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  goalTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginRight: 12,
  },
  goalText: {
    flex: 1,
    fontSize: 16,
    color: '#3E3E6B',
    fontWeight: '500',
    lineHeight: 22,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F9',
    borderRadius: 12,
    padding: 4,
  },
  counterButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  countDisplay: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E3E6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 200,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3E3E6B',
  },
  closeButton: {
    padding: 4,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3E3E6B',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5B9AA0',
  },
  addGoalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#5B9AA0',
    alignItems: 'center',
  },
  addGoalButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  addGoalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  weeklyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  weeklyHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  weeklyHeaderText: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#3E3E6B',
  },
  weeklyHeaderDay: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#5B9AA0',
    textAlign: 'center',
  },
  weeklyGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  weeklyGoalTextContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  weeklyGoalText: {
    flex: 1,
    fontSize: 14,
    color: '#3E3E6B',
    fontWeight: '500',
    lineHeight: 18,
  },
  weeklyCountCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weeklyCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E3E6B',
  },
}); 