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
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { useIsFocused } from '@react-navigation/native';

interface DailyCount {
  date: string; // YYYY-MM-DD format
  count: number;
}

interface Comment {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD format
  createdAt: string;
}

interface Goal {
  id: string;
  text: string;
  dailyCounts: DailyCount[];
  comments: Comment[];
  createdAt: string;
  isArchived?: boolean;
}

interface SelectedChild {
  id: string;
  child_uuid: string;
  child_name: string;
}

export default function GoalsScrn({ navigation }: { navigation: any }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [showWeeklyView, setShowWeeklyView] = useState(false);
  const [selectedChild, setSelectedChild] = useState<SelectedChild | null>(null);
  const isFocused = useIsFocused();
  
  // New state for weekly view editing
  const [editingCell, setEditingCell] = useState<{goalId: string, date: string} | null>(null);
  const [editingCount, setEditingCount] = useState(0);
  
  // New state for comment modal
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  useEffect(() => {
    if (isFocused) {
      loadSelectedChild();
    }
  }, [isFocused]);

  useEffect(() => {
    if (selectedChild) {
      loadGoals();
      checkAndResetDailyCounts();
    }
  }, [selectedChild]);

  const loadSelectedChild = async () => {
    try {
      const currentSelectedChild = await AsyncStorage.getItem('current_selected_child');
      if (currentSelectedChild) {
        const parsed = JSON.parse(currentSelectedChild);
        setSelectedChild(parsed);
      }
    } catch (error) {
      console.error('Error loading selected child:', error);
    }
  };

  const migrateGlobalGoals = async () => {
    try {
      // Check if global goals exist
      const globalGoalsData = await AsyncStorage.getItem('goals');
      if (globalGoalsData && selectedChild) {
        try {
          const globalGoals = JSON.parse(globalGoalsData);
          if (globalGoals.length > 0) {
            // Load the child's current data
            const childData = await AsyncStorage.getItem(selectedChild.id);
            if (childData) {
              const child = JSON.parse(childData);
              
              // Add goals to child data and ensure they have comments array
              const goalsWithComments = globalGoals.map((goal: any) => ({
                ...goal,
                comments: goal.comments || []
              }));
              child.goals = goalsWithComments;
              child.last_goal_reset_date = await AsyncStorage.getItem('last_goal_reset_date') || getCurrentDate();
              
              // Save updated child data
              await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
              
              // Clean up global keys
              await AsyncStorage.removeItem('goals');
              await AsyncStorage.removeItem('last_goal_reset_date');
              
              console.log('✅ Successfully migrated global goals to child:', selectedChild.child_name);
            }
          }
        } catch (parseError) {
          console.error('Error parsing global goals during migration:', parseError);
          // Clean up corrupted global data
          await AsyncStorage.removeItem('goals');
          await AsyncStorage.removeItem('last_goal_reset_date');
        }
      }
    } catch (error) {
      console.error('Error during goals migration:', error);
    }
  };

  const loadGoals = async () => {
    if (!selectedChild) return;
    
    try {
      // First, try to migrate global goals if they exist
      await migrateGlobalGoals();
      
      // Load child data
      const childData = await AsyncStorage.getItem(selectedChild.id);
      if (childData) {
        try {
          const child = JSON.parse(childData);
          const childGoals = child.goals || [];
          // Ensure all goals have comments array and filter out archived goals
          const activeGoals = childGoals
            .map((goal: any) => ({
              ...goal,
              comments: goal.comments || []
            }))
            .filter((goal: Goal) => !goal.isArchived);
          setGoals(activeGoals);
        } catch (parseError) {
          console.error('JSON PARSE ERROR in loadGoals:', parseError);
          console.error('Raw child data:', childData);
          // Reset child goals if corrupted
          const child = JSON.parse(childData);
          child.goals = [];
          await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
          setGoals([]);
        }
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const checkAndResetDailyCounts = async () => {
    if (!selectedChild) return;
    
    try {
      const childData = await AsyncStorage.getItem(selectedChild.id);
      if (childData) {
        try {
          const child = JSON.parse(childData);
          const lastResetDate = child.last_goal_reset_date;
          const today = getCurrentDate();
          
          // If no last reset date or it's a different day, reset counts
          if (!lastResetDate || lastResetDate !== today) {
            const childGoals = child.goals || [];
            
            // Remove today's entries from all goals (this effectively resets to 0)
            const updatedGoals = childGoals.map((goal: Goal) => ({
              ...goal,
              dailyCounts: goal.dailyCounts.filter((count: DailyCount) => count.date !== today)
            }));
            
            // Update child data
            child.goals = updatedGoals;
            child.last_goal_reset_date = today;
            
            await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
            
            // Reload goals to reflect the reset
            loadGoals();
          }
        } catch (parseError) {
          console.error('JSON PARSE ERROR in checkAndResetDailyCounts:', parseError);
          console.error('Raw child data:', childData);
          // Reset child goals if corrupted
          const child = JSON.parse(childData);
          child.goals = [];
          child.last_goal_reset_date = getCurrentDate();
          await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
        }
      }
    } catch (error) {
      console.error('Error checking/resetting daily counts:', error);
    }
  };

  const saveGoals = async (updatedGoals: Goal[]) => {
    if (!selectedChild) return;
    
    try {
      // Load child data
      const childData = await AsyncStorage.getItem(selectedChild.id);
      if (childData) {
        try {
          const child = JSON.parse(childData);
          const childGoals = child.goals || [];
          
          // Update active goals and preserve archived ones
          const archivedGoals = childGoals.filter((goal: Goal) => goal.isArchived);
          const newAllGoals = [...updatedGoals, ...archivedGoals];
          
          child.goals = newAllGoals;
          await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
          setGoals(updatedGoals);
        } catch (parseError) {
          console.error('JSON PARSE ERROR in saveGoals:', parseError);
          console.error('Raw child data:', childData);
          // Reset child goals if corrupted
          const child = JSON.parse(childData);
          child.goals = updatedGoals;
          await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
          setGoals(updatedGoals);
        }
      }
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
        comments: [],
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
    if (!selectedChild) return;
    
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
            
            // Load child data and update the archived goal
            const childData = await AsyncStorage.getItem(selectedChild.id);
            if (childData) {
              try {
                const child = JSON.parse(childData);
                const childGoals = child.goals || [];
                
                // Update the goal to archived status
                const updatedChildGoals = childGoals.map((goal: Goal) => 
                  goal.id === goalId ? goalToArchive : goal
                );
                
                child.goals = updatedChildGoals;
                await AsyncStorage.setItem(selectedChild.id, JSON.stringify(child));
                
                // Update the active goals list
                const activeGoals = updatedChildGoals.filter((goal: Goal) => !goal.isArchived);
                setGoals(activeGoals);
              } catch (parseError) {
                console.error('JSON PARSE ERROR in handleDeleteGoal:', parseError);
                console.error('Raw child data:', childData);
              }
            }
          },
        },
      ]
    );
  };

  // New functions for weekly view editing
  const handleDayCellPress = (goalId: string, date: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const currentCount = getCountForDate(goal, date);
    setEditingCount(currentCount);
    setEditingCell({ goalId, date });
  };

  const handleEditCount = async (increment: number) => {
    const newCount = Math.max(0, Math.min(99, editingCount + increment));
    setEditingCount(newCount);
  };

  const handleSaveEdit = async () => {
    if (!editingCell || !selectedChild) return;
    
    const { goalId, date } = editingCell;
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const existingEntry = goal.dailyCounts.find(count => count.date === date);
        const updatedDailyCounts = existingEntry 
          ? goal.dailyCounts.map(count => 
              count.date === date ? { ...count, count: editingCount } : count
            )
          : [...goal.dailyCounts, { date, count: editingCount }];
        
        return { ...goal, dailyCounts: updatedDailyCounts };
      }
      return goal;
    });
    
    await saveGoals(updatedGoals);
    setEditingCell(null);
    setEditingCount(0);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingCount(0);
  };

  const isCurrentDay = (dateString: string) => {
    return dateString === getCurrentDate();
  };

  // Comment-related functions
  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    setCommentModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!selectedGoal || !newCommentText.trim() || newCommentText.trim().length < 2) return;
    
    const newComment: Comment = {
      id: uuidv4(),
      text: newCommentText.trim(),
      date: getCurrentDate(),
      createdAt: new Date().toISOString(),
    };

    const updatedGoal = {
      ...selectedGoal,
      comments: [...selectedGoal.comments, newComment]
    };

    const updatedGoals = goals.map(goal => 
      goal.id === selectedGoal.id ? updatedGoal : goal
    );

    await saveGoals(updatedGoals);
    setSelectedGoal(updatedGoal);
    setNewCommentText('');
    setEditingComment(null);
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setNewCommentText(comment.text);
  };

  const handleSaveEditComment = async () => {
    if (!selectedGoal || !editingComment || !newCommentText.trim() || newCommentText.trim().length < 2) return;
    
    const updatedGoal = {
      ...selectedGoal,
      comments: selectedGoal.comments.map(comment => 
        comment.id === editingComment.id 
          ? { ...comment, text: newCommentText.trim() }
          : comment
      )
    };

    const updatedGoals = goals.map(goal => 
      goal.id === selectedGoal.id ? updatedGoal : goal
    );

    await saveGoals(updatedGoals);
    setSelectedGoal(updatedGoal);
    setNewCommentText('');
    setEditingComment(null);
  };

  const handleDeleteComment = (comment: Comment) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!selectedGoal) return;
            
            const updatedGoal = {
              ...selectedGoal,
              comments: selectedGoal.comments.filter(c => c.id !== comment.id)
            };

            const updatedGoals = goals.map(goal => 
              goal.id === selectedGoal.id ? updatedGoal : goal
            );

            await saveGoals(updatedGoals);
            setSelectedGoal(updatedGoal);
          }
        }
      ]
    );
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setNewCommentText('');
  };

  const formatDateForDisplay = (dateString: string) => {
    const today = getCurrentDate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    if (dateString === today) return 'Today';
    if (dateString === yesterdayString) return 'Yesterday';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const groupCommentsByDate = (comments: Comment[]) => {
    const grouped: { [key: string]: Comment[] } = {};
    comments.forEach(comment => {
      if (!grouped[comment.date]) {
        grouped[comment.date] = [];
      }
      grouped[comment.date].push(comment);
    });
    
    // Sort comments within each date by creation time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    
    // Sort dates (most recent first)
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({ date, comments: grouped[date] }));
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
          <Text style={styles.headerTitle}>
            {selectedChild ? `Goals for ${selectedChild.child_name}` : 'Goals'}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalVisible(true)}
            disabled={!selectedChild}
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
          {!selectedChild ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={64} color="#5B9AA0" />
              <Text style={styles.emptyStateText}>No child selected</Text>
              <Text style={styles.emptyStateSubtext}>
                Please select a child to view their goals
              </Text>
            </View>
          ) : goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={64} color="#5B9AA0" />
              <Text style={styles.emptyStateText}>No goals yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add Goal" to create your first goal for {selectedChild.child_name}
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
                  {getWeekDates().map((date, index) => {
                    const isEditing = editingCell?.goalId === goal.id && editingCell?.date === date;
                    const isToday = isCurrentDay(date);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.weeklyCountCell,
                          isToday && styles.currentDayCell,
                          isEditing && styles.editingCell
                        ]}
                        onPress={() => handleDayCellPress(goal.id, date)}
                      >
                        <Text style={[
                          styles.weeklyCountText,
                          isToday && styles.currentDayText
                        ]}>
                          {getCountForDate(goal, date)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            // Daily View
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalItem}>
                <TouchableOpacity
                  style={styles.goalTextContainer}
                  onPress={() => handleGoalPress(goal)}
                >
                  <Text style={styles.goalText}>{goal.text}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteGoal(goal.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF6F61" />
                  </TouchableOpacity>
                </TouchableOpacity>
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

        {/* Edit Count Modal */}
        <Modal
          visible={editingCell !== null}
          transparent
          animationType="fade"
          onRequestClose={handleCancelEdit}
        >
          <TouchableWithoutFeedback onPress={handleCancelEdit}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit Count</Text>
                    <TouchableOpacity
                      onPress={handleCancelEdit}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#5B9AA0" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.editCountContainer}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => handleEditCount(-1)}
                    >
                      <Ionicons name="remove" size={24} color="#5B9AA0" />
                    </TouchableOpacity>
                    <View style={styles.countDisplay}>
                      <Text style={styles.countText}>{editingCount}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => handleEditCount(1)}
                    >
                      <Ionicons name="add" size={24} color="#5B9AA0" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addGoalButton}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.addGoalButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Comment Modal */}
        <Modal
          visible={commentModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCommentModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={styles.commentModalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.commentModalContent}>
              {/* Header */}
              <View style={styles.commentModalHeader}>
                <Text style={styles.commentModalTitle}>
                  {selectedGoal?.text}
                </Text>
                <TouchableOpacity
                  onPress={() => setCommentModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#5B9AA0" />
                </TouchableOpacity>
              </View>

              {/* Comments List */}
              <ScrollView 
                style={styles.commentsContainer}
                showsVerticalScrollIndicator={false}
              >
                {selectedGoal && selectedGoal.comments.length > 0 ? (
                  groupCommentsByDate(selectedGoal.comments).map(({ date, comments }) => (
                    <View key={date} style={styles.commentDateGroup}>
                      <Text style={styles.commentDateHeader}>
                        {formatDateForDisplay(date)}
                      </Text>
                      {comments.map((comment) => (
                        <View key={comment.id} style={styles.commentItem}>
                          <Text style={styles.commentText}>{comment.text}</Text>
                          <View style={styles.commentActions}>
                            <TouchableOpacity
                              style={styles.commentActionButton}
                              onPress={() => handleEditComment(comment)}
                            >
                              <Ionicons name="pencil" size={16} color="#5B9AA0" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.commentActionButton}
                              onPress={() => handleDeleteComment(comment)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#FF6F61" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <Ionicons name="chatbubble-outline" size={48} color="#5B9AA0" />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                    <Text style={styles.noCommentsSubtext}>
                      Add your first comment below
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Add Comment Section */}
              <View style={styles.addCommentContainer}>
                {editingComment ? (
                  <View style={styles.editCommentContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Edit your comment..."
                      value={newCommentText}
                      onChangeText={setNewCommentText}
                      multiline
                      maxLength={200}
                    />
                    <View style={styles.editCommentButtons}>
                      <TouchableOpacity
                        style={styles.cancelCommentButton}
                        onPress={handleCancelEditComment}
                      >
                        <Text style={styles.cancelCommentButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.saveCommentButton,
                          (!newCommentText.trim() || newCommentText.trim().length < 2) && styles.saveCommentButtonDisabled
                        ]}
                        onPress={handleSaveEditComment}
                        disabled={!newCommentText.trim() || newCommentText.trim().length < 2}
                      >
                        <Text style={styles.saveCommentButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.addCommentInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add a comment..."
                      value={newCommentText}
                      onChangeText={setNewCommentText}
                      multiline
                      maxLength={200}
                    />
                    <TouchableOpacity
                      style={[
                        styles.addCommentButton,
                        (!newCommentText.trim() || newCommentText.trim().length < 2) && styles.addCommentButtonDisabled
                      ]}
                      onPress={handleAddComment}
                      disabled={!newCommentText.trim() || newCommentText.trim().length < 2}
                    >
                      <Text style={styles.addCommentButtonText}>Add Comment</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
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
    maxWidth: '30%',
    textAlign: 'center',
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
  currentDayCell: {
    backgroundColor: '#E8F3F4',
    borderRadius: 8,
  },
  currentDayText: {
    color: '#5B9AA0',
    fontWeight: '700',
  },
  editingCell: {
    backgroundColor: '#D3C7FF',
    borderRadius: 8,
  },
  editCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  // Comment modal styles
  commentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  commentModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  commentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E3E6B',
    flex: 1,
    marginRight: 16,
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commentDateGroup: {
    marginBottom: 20,
  },
  commentDateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B9AA0',
    marginBottom: 8,
    paddingTop: 16,
  },
  commentItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#3E3E6B',
    lineHeight: 20,
    marginRight: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    padding: 4,
    marginLeft: 4,
  },
  noCommentsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  noCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E3E6B',
    marginTop: 16,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#5B9AA0',
    textAlign: 'center',
    marginTop: 8,
  },
  addCommentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  addCommentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#3E3E6B',
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    marginRight: 8,
  },
  addCommentButton: {
    backgroundColor: '#5B9AA0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  addCommentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  editCommentContainer: {
    flexDirection: 'column',
  },
  editCommentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelCommentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelCommentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5B9AA0',
  },
  saveCommentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#5B9AA0',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveCommentButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  saveCommentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
}); 