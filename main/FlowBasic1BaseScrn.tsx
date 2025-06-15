import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  findNodeHandle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { flow_basic_1 } from '../flows/flow_basic_1';

interface Question {
  id: string;
  question: string;
  answer_choices: Array<{ label: string; emoji: string }>;
}

interface Answer {
  answer: string;
  isCustom: boolean;
}

interface OtherModalState {
  isEditing: boolean;
  previousText?: string;
}

export default function FlowBasic1BaseScrn({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: Answer[] }>({});
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [otherText, setOtherText] = useState<{ [key: string]: string }>({});
  const [showCommentInput, setShowCommentInput] = useState<{ [key: string]: boolean }>({});
  const [currentChild, setCurrentChild] = useState<any>(null);
  const [showOtherModal, setShowOtherModal] = useState<OtherModalState | null>(null);

  // Add ref for ScrollView
  const scrollViewRef = React.useRef(null);
  const commentInputRef = React.useRef(null);

  useEffect(() => {
    loadCurrentChild();
  }, []);

  const loadCurrentChild = async () => {
    try {
      const selectedChildJson = await AsyncStorage.getItem('current_selected_child');
      if (selectedChildJson) {
        const selected = JSON.parse(selectedChildJson);
        const childData = await AsyncStorage.getItem(selected.id);
        if (childData) {
          setCurrentChild({ ...selected, data: JSON.parse(childData) });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading child:', error);
    }
  };

  const handleAnswer = (questionId: string, answer: { label: string; emoji: string }) => {
    if (answer.label === 'Other') {
      const customAnswer = selectedAnswers[questionId]?.find(a => a.isCustom);
      if (customAnswer) {
        // Already has custom text, show edit/deselect modal
        setShowOtherModal({ 
          isEditing: false, 
          previousText: customAnswer.answer 
        });
      } else {
        // New "Other" entry
        setShowOtherModal({ 
          isEditing: true,
          previousText: otherText[questionId]  // Will be undefined for first time
        });
      }
      return;
    }

    const isOther = answer.label === 'Other';
    if (isOther && !otherText[questionId]) return;

    setSelectedAnswers(prev => {
      const current = prev[questionId] || [];
      const answerText = isOther ? otherText[questionId] : answer.label;
      const existingIndex = current.findIndex(a => a.answer === answerText);

      if (existingIndex >= 0) {
        return {
          ...prev,
          [questionId]: current.filter((_, i) => i !== existingIndex)
        };
      }

      return {
        ...prev,
        [questionId]: [...current, { answer: answerText, isCustom: isOther }]
      };
    });
  };

  // Add new handleOtherSubmit function
  const handleOtherSubmit = () => {
    if (!showOtherModal?.isEditing || !otherText[currentQ.id]?.trim()) return;

    const newAnswers = selectedAnswers[currentQ.id]?.filter(a => !a.isCustom) || [];
    newAnswers.push({ answer: otherText[currentQ.id], isCustom: true });
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: newAnswers
    }));
    setShowOtherModal(null);
  };

  const handleOtherDeselect = () => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: (prev[currentQ.id] || []).filter(a => !a.isCustom)
    }));
    setShowOtherModal(null);
  };

  const handleOtherEdit = () => {
    setShowOtherModal({ 
      isEditing: true, 
      previousText: selectedAnswers[currentQ.id]?.find(a => a.isCustom)?.answer 
    });
  };

  const isAnswerSelected = (questionId: string, answerLabel: string) => {
    const answers = selectedAnswers[questionId] || [];
    return answers.some(a => a.answer === answerLabel);
  };

  const canProceed = () => {
    const currentQuestionId = flow_basic_1[currentQuestion].id;
    return (selectedAnswers[currentQuestionId]?.length ?? 0) > 0;
  };

  const handleSave = async () => {
    try {
      const responses = flow_basic_1.reduce((acc, q) => ({
        ...acc,
        [q.id]: {
          question: q.question,
          answers: selectedAnswers[q.id] || [],
          comment: comments[q.id] || ''
        }
      }), {});

      const newLog = {
        id: `log_${uuidv4()}`,
        timestamp: new Date().toISOString(),
        responses
      };

      const updatedData = {
        ...currentChild.data,
        completed_logs: {
          ...currentChild.data.completed_logs,
          flow_basic_1: [
            ...(currentChild.data.completed_logs.flow_basic_1 || []),
            newLog
          ]
        }
      };

      await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedData));
      navigation.replace('CelebrationScreen'); // Changed from goBack() to replace()
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  const currentQ = flow_basic_1[currentQuestion];

  const getChoiceLabel = (choice: { label: string; emoji: string }) => {
    if (choice.label === 'Other') {
      const customAnswer = selectedAnswers[currentQ.id]?.find(a => a.isCustom);
      if (customAnswer) {
        return `${choice.emoji} ${customAnswer.answer}`; // Show the custom input instead of "Other"
      }
    }
    return `${choice.emoji} ${choice.label}`;
  };

  const handleCommentPress = (questionId) => {
    const showing = !showCommentInput[questionId];
    setShowCommentInput(prev => ({
      ...prev,
      [questionId]: showing
    }));
    
    if (showing) {
      // Wait for TextInput to render
      setTimeout(() => {
        commentInputRef.current?.measureInWindow((x, y, width, height) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Account for some padding
            animated: true
          });
        });
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20} // Reduced from previous values
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.progress}>Step {currentQuestion + 1} of {flow_basic_1.length}</Text>
          <Text style={styles.question}>{currentQ.question}</Text>

          {currentQ.answer_choices.map((choice) => (
            <TouchableOpacity
              key={choice.label}
              style={[
                styles.choiceButton,
                isAnswerSelected(currentQ.id, choice.label === 'Other' ? 
                  selectedAnswers[currentQ.id]?.find(a => a.isCustom)?.answer || choice.label 
                  : choice.label) && styles.selectedChoice
              ]}
              onPress={() => handleAnswer(currentQ.id, choice)}
            >
              <Text style={styles.choiceText}>
                {getChoiceLabel(choice)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Comment section */}
          <TouchableOpacity
            style={styles.commentButton}
            onPress={() => handleCommentPress(currentQ.id)}
          >
            <Text style={styles.commentButtonText}>
              {showCommentInput[currentQ.id] ? 'Hide Comment' : 'Add Comment'}
            </Text>
          </TouchableOpacity>

          {showCommentInput[currentQ.id] && (
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Add your comment here"
              multiline
              value={comments[currentQ.id]}
              onChangeText={(text) => setComments(prev => ({
                ...prev,
                [currentQ.id]: text
              }))}
              autoFocus
            />
          )}

          {/* Add Modal for Other input */}
          <Modal
            visible={!!showOtherModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowOtherModal(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowOtherModal(null)}
            >
              <View style={styles.modalContent}>
                {showOtherModal?.isEditing ? (
                  <>
                    <Text style={styles.modalTitle}>Add Other Option</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Type your answer here..."
                      value={otherText[currentQ.id] || showOtherModal.previousText || ''}
                      onChangeText={(text) => setOtherText(prev => ({
                        ...prev,
                        [currentQ.id]: text
                      }))}
                      autoFocus
                    />
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => setShowOtherModal(null)}
                      >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.submitButton]}
                        onPress={handleOtherSubmit}
                      >
                        <Text style={[styles.modalButtonText, { color: 'white' }]}>Submit</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Other Option</Text>
                    <Text style={styles.modalText}>{showOtherModal?.previousText}</Text>
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={styles.modalButton}
                        onPress={handleOtherDeselect}
                      >
                        <Text style={styles.modalButtonText}>Deselect</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.submitButton]}
                        onPress={handleOtherEdit}
                      >
                        <Text style={[styles.modalButtonText, { color: 'white' }]}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          <View style={styles.navigationButtons}>
            {currentQuestion > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentQuestion(prev => prev - 1)}
              >
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.disabledButton]}
              disabled={!canProceed()}
              onPress={() => {
                if (currentQuestion === flow_basic_1.length - 1) {
                  handleSave();
                } else {
                  setCurrentQuestion(prev => prev + 1);
                }
              }}
            >
              <Text style={styles.buttonText}>
                {currentQuestion === flow_basic_1.length - 1 ? 'Submit' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  progress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  choiceButton: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  selectedChoice: {
    backgroundColor: '#E8F3F4',
    borderColor: '#5B9AA0',
  },
  choiceText: {
    fontSize: 16,
  },
  commentButton: {
    padding: 15,
    alignItems: 'center',
  },
  commentButtonText: {
    color: '#5B9AA0',
    fontSize: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    minHeight: 100, // Changed from fixed height
    maxHeight: 200,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#c0c0c0',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
  },
  nextButton: {
    backgroundColor: '#5B9AA0',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#5B9AA0',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});