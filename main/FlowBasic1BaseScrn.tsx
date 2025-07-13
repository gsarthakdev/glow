//@ts-ignore
import React, { useState, useEffect, useRef } from 'react';
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
import { flow_basic_1 as positive_flow_basic_1 } from '../flows/positive_flow_basic_1';
import MoodBubbleSlider from '../components/MoodBubbleSlider';

interface Question {
  id: string;
  question: string;
  answer_choices?: Array<{ label: string; emoji: string; sentiment?: string | null }>;
  subheading?: string;
}

interface Answer {
  answer: string;
  isCustom: boolean;
}

interface OtherModalState {
  isEditing: boolean;
  previousText?: string;
  sentiment?: 'positive' | 'negative';
  step: 'text' | 'sentiment';
}

export default function FlowBasic1BaseScrn({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: Answer[] }>({});
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [otherText, setOtherText] = useState<{ [key: string]: string }>({});
  const [showCommentInput, setShowCommentInput] = useState<{ [key: string]: boolean }>({});
  const [currentChild, setCurrentChild] = useState<any>(null);
  const [showOtherModal, setShowOtherModal] = useState<OtherModalState | null>(null);
  const [moodBefore, setMoodBefore] = useState<number>(0);
  const [moodAfter, setMoodAfter] = useState<number>(0);
  const [flowSentiment, setFlowSentiment] = useState<'positive' | 'negative' | null>(null);
  const [currentFlow, setCurrentFlow] = useState<Question[]>([]);

  // Add ref for ScrollView
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadCurrentChild();
  }, []);

  // Initialize flow after sentiment is determined
  useEffect(() => {
    if (flowSentiment) {
      const flow = flowSentiment === 'positive' ? positive_flow_basic_1 : flow_basic_1;
      setCurrentFlow(flow);
    }
  }, [flowSentiment]);



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

  const handleAnswer = (questionId: string, answer: { label: string; emoji: string; sentiment?: string | null }) => {
    // Handle "Other" option first
    if (answer.label === 'Other') {
      const customAnswer = selectedAnswers[questionId]?.find(a => a.isCustom);
      if (customAnswer) {
        // Already has custom text, show edit/deselect modal
        setShowOtherModal({ 
          isEditing: false, 
          previousText: customAnswer.answer,
          step: 'text'
        });
      } else {
        // New "Other" entry - only for first question, we need sentiment selection
        if (questionId === 'whatDidTheyDo') {
          setShowOtherModal({ 
            isEditing: true,
            previousText: otherText[questionId],  // Will be undefined for first time
            sentiment: undefined, // Will be selected by user
            step: 'text'
          });
        } else {
          setShowOtherModal({ 
            isEditing: true,
            previousText: otherText[questionId],  // Will be undefined for first time
            step: 'text'
          });
        }
      }
      return;
    }

    const isOther = answer.label === 'Other';
    if (isOther && !otherText[questionId]) return;

    // Handle first question sentiment detection first
    if (questionId === 'whatDidTheyDo') {
      let newSentiment: 'positive' | 'negative' | null = null;
      if (answer.sentiment === 'positive') {
        newSentiment = 'positive';
      } else if (answer.sentiment === 'negative') {
        newSentiment = 'negative';
      }
      
      // Only reset flow if sentiment is actually changing from a previous selection
      if (newSentiment && flowSentiment && newSentiment !== flowSentiment) {
        setFlowSentiment(newSentiment);
        setCurrentQuestion(0);
        setSelectedAnswers({});
        return;
      }
      
      // Set initial sentiment if not already set
      if (newSentiment && !flowSentiment) {
        setFlowSentiment(newSentiment);
      }
    }

    // Process answer selection
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

      // For the first question, replace any existing selection with the new one
      if (questionId === 'whatDidTheyDo') {
        return {
          ...prev,
          [questionId]: [{ answer: answerText, isCustom: isOther }]
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
    if (!showOtherModal?.isEditing) return;

    // If we're on the text step and it's the first question, move to sentiment step
    if (showOtherModal.step === 'text' && currentQ.id === 'whatDidTheyDo') {
      handleNextStep();
      return;
    }

    // If we're on the sentiment step or it's not the first question
    if (showOtherModal.step === 'sentiment' || currentQ.id !== 'whatDidTheyDo') {
      if (!otherText[currentQ.id]?.trim()) return;

      // For the first question, we need to handle sentiment
      if (currentQ.id === 'whatDidTheyDo' && showOtherModal.sentiment) {
        // Set the sentiment and store the custom answer directly
        setFlowSentiment(showOtherModal.sentiment);
        setSelectedAnswers(prev => ({
          ...prev,
          [currentQ.id]: [{ answer: otherText[currentQ.id], isCustom: true }]
        }));
      } else {
        // Clear all existing answers and add only the custom answer
        setSelectedAnswers(prev => ({
          ...prev,
          [currentQ.id]: [{ answer: otherText[currentQ.id], isCustom: true }]
        }));
      }
      setShowOtherModal(null);
    }
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
      previousText: selectedAnswers[currentQ.id]?.find(a => a.isCustom)?.answer,
      sentiment: currentQ.id === 'whatDidTheyDo' ? (flowSentiment || undefined) : undefined,
      step: 'text'
    });
  };

  const handleNextStep = () => {
    if (!otherText[currentQ.id]?.trim()) return;
    setShowOtherModal(prev => prev ? { ...prev, step: 'sentiment' } : null);
  };

  const isAnswerSelected = (questionId: string, answerLabel: string) => {
    const answers = selectedAnswers[questionId] || [];
    return answers.some(a => a.answer === answerLabel);
  };

  const isOtherSelected = (questionId: string) => {
    const answers = selectedAnswers[questionId] || [];
    return answers.some(a => a.isCustom);
  };

  const canProceed = () => {
    if (!currentFlow.length) return false;
    
    const currentQuestionId = currentFlow[currentQuestion].id;
    if (currentQuestionId === 'mood') {
      return moodBefore !== 0 && moodAfter !== 0;
    }
    return (selectedAnswers[currentQuestionId]?.length ?? 0) > 0;
  };

  const handleSave = async () => {
    try {
      const responses = currentFlow.reduce((acc, q) => ({
        ...acc,
        [q.id]: {
          question: q.question,
          answers: q.id === 'mood' ? [
            { answer: `Before: ${moodBefore}, After: ${moodAfter}`, isCustom: false }
          ] : (selectedAnswers[q.id] || []),
          comment: comments[q.id] || '',
          sentiment: flowSentiment
        }
      }), {});

      const localTime = new Date();
      const newLog = {
        id: `log_${uuidv4()}`,
        timestamp: new Date(localTime.getTime() - localTime.getTimezoneOffset() * 60000).toISOString(),
        responses
      };

      const storageKey = flowSentiment === 'positive' ? 'flow_basic_1_positive' : 'flow_basic_1_negative';
      
      const updatedData = {
        ...currentChild.data,
        completed_logs: {
          ...currentChild.data.completed_logs,
          [storageKey]: [
            ...(currentChild.data.completed_logs?.[storageKey] || []),
            newLog
          ]
        }
      };

      await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedData));
      navigation.replace('CelebrationScreen');
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  // Use first question from negative flow for initial question
  const firstQuestion = flow_basic_1[0];
  const currentQ = currentFlow.length > 0 ? currentFlow[currentQuestion] : firstQuestion;

  const getChoiceLabel = (choice: { label: string; emoji: string }) => {
    if (choice.label === 'Other') {
      const customAnswer = selectedAnswers[currentQ.id]?.find(a => a.isCustom);
      if (customAnswer) {
        return `${choice.emoji} ${customAnswer.answer}`; // Show the custom input instead of "Other"
      }
    }
    return `${choice.emoji} ${choice.label}`;
  };

  const handleCommentPress = (questionId: string) => {
    const showing = !showCommentInput[questionId];
    setShowCommentInput(prev => ({
      ...prev,
      [questionId]: showing
    }));
    
    if (showing && commentInputRef.current && scrollViewRef.current) {
      // Wait for TextInput to render
      setTimeout(() => {
        const input = findNodeHandle(commentInputRef.current);
        if (input) {
          commentInputRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                y: y - 100, // Account for some padding
                animated: true
              });
            }
          });
        }
      }, 100);
    } 
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.progress}>
            Step {currentQuestion + 1} of {currentFlow.length > 0 ? currentFlow.length : 1}
          </Text>
          <Text style={styles.question}>{currentQ.question}</Text>
          <Text style={styles.subheading}>{currentQ.subheading}</Text>

          {currentQ.id === 'mood' ? (
            <View style={styles.moodContainer}>
              <MoodBubbleSlider
                label="Before the incident"
                value={moodBefore}
                onValueChange={setMoodBefore}
              />
              <View style={styles.moodDivider} />
              <MoodBubbleSlider
                label="After the incident"
                value={moodAfter}
                onValueChange={setMoodAfter}
              />
            </View>
          ) : (
            <>
              {currentQ.answer_choices?.map((choice) => (
                <TouchableOpacity
                  key={choice.label}
                  style={[
                    styles.choiceButton,
                    (choice.label === 'Other' ? isOtherSelected(currentQ.id) : isAnswerSelected(currentQ.id, choice.label)) && styles.selectedChoice
                  ]}
                  onPress={() => handleAnswer(currentQ.id, choice)}
                >
                  <Text style={styles.choiceText}>
                    {getChoiceLabel(choice)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

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
                    {showOtherModal.step === 'text' ? (
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
                            style={[
                              styles.modalButton, 
                              styles.submitButton,
                              !otherText[currentQ.id]?.trim() && styles.disabledButton
                            ]}
                            disabled={!otherText[currentQ.id]?.trim()}
                            onPress={currentQ.id === 'whatDidTheyDo' ? handleNextStep : handleOtherSubmit}
                          >
                            <Text style={[styles.modalButtonText, { color: 'white' }]}>
                              {currentQ.id === 'whatDidTheyDo' ? 'Next' : 'Submit'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.modalTitle}>Is this behavior positive or negative?</Text>
                        <Text style={styles.modalText}>{otherText[currentQ.id]}</Text>
                        
                        <View style={styles.sentimentButtons}>
                          <TouchableOpacity
                            style={[
                              styles.sentimentButton,
                              showOtherModal.sentiment === 'positive' && styles.selectedSentiment
                            ]}
                            onPress={() => setShowOtherModal(prev => prev ? { ...prev, sentiment: 'positive' } : null)}
                          >
                            <Text style={styles.sentimentButtonText}>😊 Positive</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.sentimentButton,
                              showOtherModal.sentiment === 'negative' && styles.selectedSentiment
                            ]}
                            onPress={() => setShowOtherModal(prev => prev ? { ...prev, sentiment: 'negative' } : null)}
                          >
                            <Text style={styles.sentimentButtonText}>😞 Negative</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalButtons}>
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setShowOtherModal(prev => prev ? { ...prev, step: 'text' } : null)}
                          >
                            <Text style={styles.modalButtonText}>Back</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.modalButton, 
                              styles.submitButton,
                              !showOtherModal.sentiment && styles.disabledButton
                            ]}
                            disabled={!showOtherModal.sentiment}
                            onPress={handleOtherSubmit}
                          >
                            <Text style={[styles.modalButtonText, { color: 'white' }]}>Submit</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
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
                if (currentQuestion === (currentFlow.length - 1)) {
                  handleSave();
                } else {
                  setCurrentQuestion(prev => prev + 1);
                }
              }}
            >
              <Text style={styles.buttonText}>
                {currentQuestion === (currentFlow.length - 1) ? 'Submit' : 'Next'}
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
    padding: 24,
    paddingBottom: 40,
  },
  progress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  question: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subheading: {
    color: "#666",
    fontSize: 16,
    marginBottom: 32,
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
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 32,
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
  moodContainer: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  moodDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 40,
  },
  sentimentContainer: {
    marginBottom: 15,
  },
  sentimentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sentimentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sentimentButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedSentiment: {
    backgroundColor: '#E8F3F4',
    borderColor: '#5B9AA0',
  },
  sentimentButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});