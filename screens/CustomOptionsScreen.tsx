import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

// Types
interface CustomOption {
  label: string;
  emoji: string;
  sentiment?: string | null;
  category?: string;
  gptGeneratedAntecedents?: Array<{ text: string; emoji: string }>;
  gptGeneratedConsequences?: Array<{ text: string; emoji: string }>;
}

interface CustomOptionsData {
  [questionId: string]: CustomOption[];
}

// All custom options go in the "Your Pins" category
const YOUR_PINS_CATEGORY = 'yourPins';

const CustomOptionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const currentChild = route.params?.currentChild;

  // State
  const [customOptions, setCustomOptions] = useState<CustomOptionsData>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  // All custom options go in "Your Pins" category
  const [isLoading, setIsLoading] = useState(true);

  // Load custom options on component mount
  useEffect(() => {
    loadCustomOptions();
  }, []);

  const loadCustomOptions = async () => {
    try {
      if (currentChild && currentChild.id) {
        const childData = await AsyncStorage.getItem(currentChild.id);
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          const customOptionsData = parsedChildData.custom_options || {};
          setCustomOptions(customOptionsData);
        }
      }
    } catch (error) {
      console.error('Error loading custom options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCustomOptions = async (updatedOptions: CustomOptionsData) => {
    try {
      if (currentChild && currentChild.id) {
        const childData = await AsyncStorage.getItem(currentChild.id);
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          const updatedChildData = {
            ...parsedChildData,
            custom_options: updatedOptions
          };
          await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
        }
      }
    } catch (error) {
      console.error('Error saving custom options:', error);
      Alert.alert('Error', 'Failed to save custom options. Please try again.');
    }
  };

  const addCustomOption = async () => {
    if (!newOptionText.trim()) {
      Alert.alert('Error', 'Please enter a behavior description.');
      return;
    }

    const newOption: CustomOption = {
      label: newOptionText.trim(),
      emoji: '📌', // Pin emoji for Your Pins category
      sentiment: 'negative', // Default sentiment
      category: YOUR_PINS_CATEGORY,
    };

    // Check for duplicates
    const existingOptions = customOptions['whatDidTheyDo'] || [];
    const isDuplicate = existingOptions.some(option => 
      option.label.toLowerCase() === newOption.label.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Duplicate', 'This behavior already exists. Please enter a different behavior.');
      return;
    }

    // Add the new option
    const updatedOptions = {
      ...customOptions,
      whatDidTheyDo: [...existingOptions, newOption]
    };

    setCustomOptions(updatedOptions);
    await saveCustomOptions(updatedOptions);

    // Reset form
    setNewOptionText('');
    setShowAddModal(false);

    Alert.alert('Success', 'Custom behavior added successfully!');
  };

  const deleteCustomOption = async (optionLabel: string) => {
    Alert.alert(
      'Delete Behavior',
      `Are you sure you want to delete "${optionLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const existingOptions = customOptions['whatDidTheyDo'] || [];
            const updatedOptions = {
              ...customOptions,
              whatDidTheyDo: existingOptions.filter(option => option.label !== optionLabel)
            };

            setCustomOptions(updatedOptions);
            await saveCustomOptions(updatedOptions);
          }
        }
      ]
    );
  };

  const getAllOptions = () => {
    return customOptions['whatDidTheyDo'] || [];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading custom options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Behaviors</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          Manage your custom behaviors. These will appear in the "Your Pins" category in the behavior selection screen.
        </Text>

        {getAllOptions().length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No custom behaviors yet.</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the "Add" button to create your first custom behavior.
            </Text>
          </View>
        ) : (
          <View style={styles.categorySection}>
            <Text style={styles.categoryHeader}>
              📌 Your Pins
            </Text>
            {getAllOptions().map((option, index) => (
              <View key={index} style={styles.optionItem}>
                <View style={styles.optionContent}>
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteCustomOption(option.label)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Option Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Behavior</Text>

            <Text style={styles.modalLabel}>Behavior Description:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Throws toys when frustrated"
              value={newOptionText}
              onChangeText={setNewOptionText}
              autoFocus
              maxLength={50}
              multiline
            />

            <Text style={styles.modalNote}>
              📌 This behavior will be added to your "Your Pins" category.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setNewOptionText('');
                  setShowAddModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.addModalButton,
                  !newOptionText.trim() && styles.disabledButton
                ]}
                disabled={!newOptionText.trim()}
                onPress={addCustomOption}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 60, // Account for status bar
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#5B9AA0',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#5B9AA0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 50,
  },
  modalNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addModalButton: {
    backgroundColor: '#5B9AA0',
    borderColor: '#5B9AA0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default CustomOptionsScreen;
