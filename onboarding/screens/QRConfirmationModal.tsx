import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { finishOnboarding } from '../util/finishOnboarding';

const { width, height } = Dimensions.get('window');

interface ChildData {
  child_name: string;
  goals: string[];
  commentsEnabled: boolean;
}

interface EditableChildData extends ChildData {
  pronouns?: string | null;
}

// Common goal options for the app
const COMMON_GOALS = [
  "Following instructions",
  "Using words to communicate",
  "Staying calm when frustrated",
  "Sharing with others",
  "Completing tasks",
  "Using appropriate voice volume",
  "Taking turns",
  "Asking for help",
  "Staying focused",
  "Using manners",
  "Handling transitions",
  "Playing cooperatively",
  "Managing emotions",
  "Following routines",
  "Using coping strategies"
];

// Pronouns dropdown options
const PRONOUNS_OPTIONS = [
  { label: 'He/Him', value: 'He/Him' },
  { label: 'She/Her', value: 'She/Her' },
  { label: 'They/Them', value: 'They/Them' },
  { label: 'Other', value: 'Other' },
];

// PronounsDropdown Component
interface PronounsDropdownProps {
  selectedValue: string | null;
  onValueChange: (value: string | null) => void;
}

const PronounsDropdown: React.FC<PronounsDropdownProps> = ({
  selectedValue,
  onValueChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string) => {
    onValueChange(value === 'Other' ? null : value);
    setIsOpen(false);
  };

  const displayValue = selectedValue || 'Select pronouns';

  return (
    <View style={editModalStyles.dropdownContainer}>
      <TouchableOpacity
        style={editModalStyles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[
          editModalStyles.dropdownButtonText,
          !selectedValue && editModalStyles.dropdownButtonTextPlaceholder
        ]}>
          {displayValue}
        </Text>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#86868B" 
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={editModalStyles.dropdownList}>
          {PRONOUNS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                editModalStyles.dropdownItem,
                selectedValue === option.value && editModalStyles.dropdownItemSelected
              ]}
              onPress={() => handleSelect(option.value)}
            >
              <Text style={[
                editModalStyles.dropdownItemText,
                selectedValue === option.value && editModalStyles.dropdownItemTextSelected
              ]}>
                {option.label}
              </Text>
              {selectedValue === option.value && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// EditChildModal Component
interface EditChildModalProps {
  visible: boolean;
  childData: EditableChildData | null;
  childIndex: number | null;
  onSave: () => void;
  onCancel: () => void;
  onUpdateChild: (index: number, field: keyof EditableChildData, value: any) => void;
  onAddGoal: (childIndex: number, goal: string) => void;
  onRemoveGoal: (childIndex: number, goalIndex: number) => void;
}

const EditChildModal: React.FC<EditChildModalProps> = ({
  visible,
  childData,
  childIndex,
  onSave,
  onCancel,
  onUpdateChild,
  onAddGoal,
  onRemoveGoal,
}) => {
  const [newGoal, setNewGoal] = useState('');

  if (!visible || !childData || childIndex === null) {
    return null;
  }

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      onAddGoal(childIndex, newGoal.trim());
      setNewGoal('');
    }
  };

  const handleSave = () => {
    if (childData.child_name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter a name with at least 2 characters.');
      return;
    }
    onSave();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={editModalStyles.container}>
        <KeyboardAvoidingView 
          style={editModalStyles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={editModalStyles.header}>
            <TouchableOpacity style={editModalStyles.cancelButton} onPress={onCancel}>
              <Text style={editModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={editModalStyles.headerTitle}>Edit Child</Text>
            <TouchableOpacity style={editModalStyles.saveButton} onPress={handleSave}>
              <Text style={editModalStyles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={editModalStyles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Child Name */}
            <View style={editModalStyles.section}>
              <Text style={editModalStyles.sectionTitle}>Child's Name</Text>
              <TextInput
                style={editModalStyles.textInput}
                value={childData.child_name}
                onChangeText={(text) => onUpdateChild(childIndex, 'child_name', text)}
                placeholder="Enter child's name"
                autoCapitalize="words"
              />
            </View>

            {/* Pronouns */}
            <View style={editModalStyles.section}>
              <Text style={editModalStyles.sectionTitle}>Pronouns (Optional)</Text>
              <PronounsDropdown
                selectedValue={childData.pronouns || null}
                onValueChange={(value) => onUpdateChild(childIndex, 'pronouns', value)}
              />
            </View>

            {/* Comments Toggle */}
            <View style={editModalStyles.section}>
              <View style={editModalStyles.toggleContainer}>
                <View style={editModalStyles.toggleInfo}>
                  <Text style={editModalStyles.sectionTitle}>Enable Comments</Text>
                  <Text style={editModalStyles.toggleDescription}>
                    Allow comments to be added to behavior logs
                  </Text>
                </View>
                <Switch
                  value={childData.commentsEnabled}
                  onValueChange={(value) => onUpdateChild(childIndex, 'commentsEnabled', value)}
                  trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
                  thumbColor={childData.commentsEnabled ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Goals */}
            <View style={editModalStyles.section}>
              <Text style={editModalStyles.sectionTitle}>Goals</Text>
              
              {/* Current Goals */}
              {childData.goals.length > 0 && (
                <View style={editModalStyles.goalsList}>
                  {childData.goals.map((goal, goalIndex) => (
                    <View key={goalIndex} style={editModalStyles.goalItem}>
                      <Text style={editModalStyles.goalText}>{goal}</Text>
                      <TouchableOpacity
                        style={editModalStyles.removeGoalButton}
                        onPress={() => onRemoveGoal(childIndex, goalIndex)}
                      >
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add New Goal */}
              <View style={editModalStyles.addGoalContainer}>
                <TextInput
                  style={editModalStyles.goalInput}
                  value={newGoal}
                  onChangeText={setNewGoal}
                  placeholder="Add a new goal"
                  onSubmitEditing={handleAddGoal}
                />
                <TouchableOpacity
                  style={[editModalStyles.addGoalButton, !newGoal.trim() && editModalStyles.addGoalButtonDisabled]}
                  onPress={handleAddGoal}
                  disabled={!newGoal.trim()}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Common Goals */}
              {/* <Text style={editModalStyles.commonGoalsTitle}>Common Goals:</Text>
              <View style={editModalStyles.commonGoalsGrid}>
                {COMMON_GOALS.map((goal, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      editModalStyles.commonGoalButton,
                      childData.goals.includes(goal) && editModalStyles.commonGoalButtonSelected
                    ]}
                    onPress={() => {
                      if (childData.goals.includes(goal)) {
                        const goalIndex = childData.goals.indexOf(goal);
                        onRemoveGoal(childIndex, goalIndex);
                      } else {
                        onAddGoal(childIndex, goal);
                      }
                    }}
                  >
                    <Text style={[
                      editModalStyles.commonGoalText,
                      childData.goals.includes(goal) && editModalStyles.commonGoalTextSelected
                    ]}>
                      {goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View> */}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default function QRConfirmationModal({ navigation, route }: any) {
  const { childrenData } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(null);
  const [editableChildrenData, setEditableChildrenData] = useState<EditableChildData[]>(
    childrenData.map((child: ChildData) => ({
      ...child,
      pronouns: null // QR codes don't include pronouns
    }))
  );
  
  // Animation values
  const modalScale = useSharedValue(0.8);
  const modalOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  React.useEffect(() => {
    // Animate modal entrance
    modalScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    modalOpacity.value = withTiming(1, { duration: 300 });
    
    // Animate content with delay
    setTimeout(() => {
      contentOpacity.value = withTiming(1, { duration: 400 });
    }, 200);
  }, []);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleLooksGood = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    Haptics.selectionAsync();
    
    try {
      // Convert the editable data to the format expected by finishOnboarding
      const childrenForOnboarding = editableChildrenData.map(child => ({
        child_name: child.child_name.trim(), // Ensure no leading/trailing spaces
        pronouns: child.pronouns || null,
        goals: child.goals || [], // Pass the goals array
        commentsEnabled: child.commentsEnabled !== undefined ? child.commentsEnabled : true
      }));
      
      console.log('[QR_CONFIRMATION] Original childrenData:', childrenData);
      console.log('[QR_CONFIRMATION] Editable childrenData:', editableChildrenData);
      console.log('[QR_CONFIRMATION] Processed childrenForOnboarding:', childrenForOnboarding);
      
      // Call finishOnboarding with the children data
      await finishOnboarding(childrenForOnboarding);
      
      // Show success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // The app will automatically switch to MainStack when onboarding_completed is set to true
      // No need to navigate manually as App.tsx handles this based on onboarding status
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        'Setup Error',
        'There was an error setting up your children. Please try again or use manual setup.',
        [
          {
            text: 'Try Again',
            onPress: () => {}, // isProcessing is already false
          },
          {
            text: 'Manual Setup',
            onPress: () => navigation.replace('ChildrenCountScrn'),
          },
        ]
      );
    }
  };

  const handleEdit = () => {
    Haptics.selectionAsync();
    setEditingChildIndex(0); // Start editing the first child
    setIsEditModalVisible(true);
  };

  const handleEditChild = (index: number) => {
    Haptics.selectionAsync();
    setEditingChildIndex(index);
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (editingChildIndex === null) return;
    
    Haptics.selectionAsync();
    setIsEditModalVisible(false);
    setEditingChildIndex(null);
  };

  const handleCancelEdit = () => {
    Haptics.selectionAsync();
    setIsEditModalVisible(false);
    setEditingChildIndex(null);
    // Reset to original data
    setEditableChildrenData(childrenData.map((child: ChildData) => ({
      ...child,
      pronouns: null
    })));
  };

  const updateChildData = (index: number, field: keyof EditableChildData, value: any) => {
    setEditableChildrenData(prev => 
      prev.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    );
  };

  const addGoal = (childIndex: number, goal: string) => {
    if (goal.trim() && !editableChildrenData[childIndex].goals.includes(goal.trim())) {
      updateChildData(childIndex, 'goals', [...editableChildrenData[childIndex].goals, goal.trim()]);
    }
  };

  const removeGoal = (childIndex: number, goalIndex: number) => {
    const newGoals = editableChildrenData[childIndex].goals.filter((_, index) => index !== goalIndex);
    updateChildData(childIndex, 'goals', newGoals);
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    navigation.replace("QRScannerScrn");
  };

  const renderChildCard = (child: EditableChildData, index: number) => (
    <View key={index} style={styles.childCard}>
      <View style={styles.childHeader}>
        <View style={styles.childIcon}>
          <Ionicons name="person" size={24} color="#007AFF" />
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.child_name}</Text>
          <Text style={styles.childSubtext}>
            {child.commentsEnabled ? 'Comments enabled' : 'Comments disabled'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editChildButton}
          onPress={() => handleEditChild(index)}
        >
            <Text style={styles.editChildButtonText}>Edit</Text>
          {/* <Ionicons name="create-outline" size={20} color="#007AFF" /> */}
        </TouchableOpacity>
      </View>
      
      {child.goals && child.goals.length > 0 && (
        <View style={styles.goalsContainer}>
          <Text style={styles.goalsTitle}>Goals:</Text>
          {child.goals.map((goal, goalIndex) => (
            <View key={goalIndex} style={styles.goalItem}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.goalText}>{goal}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backdrop} />
      
      <Animated.View style={[styles.modal, modalAnimatedStyle]}>
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Review Setup</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.titleContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              <Text style={styles.title}>QR Code Scanned Successfully!</Text>
              <Text style={styles.subtitle}>
                Review the children that will be added to your app:
              </Text>
            </View>

            <View style={styles.childrenContainer}>
              {editableChildrenData.map((child, index) => renderChildCard(child, index))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={handleBack}
              disabled={isProcessing}
            >
              {/* <Ionicons name="create-outline" size={20} color="#007AFF" /> */}
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="#007AFF" />
              <Text style={styles.editButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, isProcessing && styles.processingButton]}
              onPress={handleLooksGood}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Text style={styles.confirmButtonText}>Setting up...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Looks Good</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Edit Modal */}
          <EditChildModal
            visible={isEditModalVisible}
            childData={editingChildIndex !== null ? editableChildrenData[editingChildIndex] : null}
            childIndex={editingChildIndex}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            onUpdateChild={updateChildData}
            onAddGoal={addGoal}
            onRemoveGoal={removeGoal}
          />
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 35,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 22,
  },
  childrenContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  childCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  childIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  childInfo: {
    flex: 1,
  },
  editChildButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
  },
  editChildButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  childName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  childSubtext: {
    fontSize: 14,
    color: '#86868B',
  },
  goalsContainer: {
    marginTop: 8,
  },
  goalsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalText: {
    fontSize: 14,
    color: '#1D1D1F',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  editButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  processingButton: {
    backgroundColor: '#86868B',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// Edit Modal Styles
const editModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#86868B',
    marginTop: 4,
  },
  goalsList: {
    marginBottom: 16,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  goalText: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
  },
  removeGoalButton: {
    padding: 4,
  },
  addGoalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 76,
    gap: 12,
  },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  addGoalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addGoalButtonDisabled: {
    backgroundColor: '#E5E5E7',
  },
  commonGoalsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  commonGoalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commonGoalButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commonGoalButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  commonGoalText: {
    fontSize: 14,
    color: '#1D1D1F',
  },
  commonGoalTextSelected: {
    color: '#FFFFFF',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  dropdownButtonTextPlaceholder: {
    color: '#86868B',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
