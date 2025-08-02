import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';

interface Option {
  label: string;
  emoji: string;
}

interface QuestionScreenProps {
  questionNumber: number;
  totalQuestions: number;
  title: string;
  options: Option[];
  currentAnswer?: {
    answers: Array<{answer: string; isCustom: boolean}>;
    comment?: string;
  };
  onAnswer: (response: {
    answers: Array<{answer: string; isCustom: boolean}>;
    comment?: string;
  }) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstQuestion: boolean;
}

export default function QuestionScreen({
  questionNumber,
  totalQuestions,
  title,
  options,
  currentAnswer,
  onAnswer,
  onNext,
  onBack,
  isFirstQuestion,
}: QuestionScreenProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Array<{answer: string; isCustom: boolean}>>(
    currentAnswer?.answers || []
  );
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState(currentAnswer?.comment || '');

  // Only initialize otherText when the modal is first opened
  useEffect(() => {
    if (showOtherModal) {
      // Only set if just opened
      const custom = selectedAnswers.find(a => a.isCustom);
      setOtherText(custom ? custom.answer : '');
      console.log('[DEBUG] Modal opened. Initializing otherText to:', custom ? custom.answer : '');
    } else {
      console.log('[DEBUG] Modal closed. otherText was:', otherText);
    }
    // Do not reset on close, let handleOtherSubmit handle clearing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOtherModal]);

  const handleOptionSelect = (option: Option) => {
    if (option.label === 'Other') {
      console.log('[DEBUG] handleOptionSelect: Opening modal for Other.');
      setShowOtherModal(true);
      return;
    }

    const existingAnswerIndex = selectedAnswers.findIndex(a => a.answer === option.label);
    let newAnswers;

    if (existingAnswerIndex >= 0) {
      newAnswers = selectedAnswers.filter((_, index) => index !== existingAnswerIndex);
    } else {
      newAnswers = [...selectedAnswers, { answer: option.label, isCustom: false }];
    }

    setSelectedAnswers(newAnswers);
    onAnswer({ answers: newAnswers, comment });
  };

  const handleOtherSubmit = () => {
    console.log('[DEBUG] handleOtherSubmit called. otherText:', otherText);
    if (otherText.trim()) {
      // Remove any previous custom answers
      const newAnswers = selectedAnswers.filter(a => !a.isCustom);
      newAnswers.push({ answer: otherText.trim(), isCustom: true });
      setSelectedAnswers(newAnswers);
      onAnswer({ answers: newAnswers, comment });
    } else {
      // If empty, remove any custom answer
      const newAnswers = selectedAnswers.filter(a => !a.isCustom);
      setSelectedAnswers(newAnswers);
      onAnswer({ answers: newAnswers, comment });
    }
    setOtherText('');
    setShowOtherModal(false);
  };

  const handleCommentChange = (text: string) => {
    setComment(text);
    onAnswer({ answers: selectedAnswers, comment: text });
  };

  const isOptionSelected = (label: string) => 
    selectedAnswers.some(answer => answer.answer === label);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.progress}>Question {questionNumber} of {totalQuestions}</Text>
        <Text style={styles.question}>{title}</Text>

        {options.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.optionButton,
              isOptionSelected(option.label) && styles.selectedOption,
              option.label === 'Other' && selectedAnswers.some(a => a.isCustom) && styles.selectedOption
            ]}
            onPress={() => handleOptionSelect(option)}
          >
            <Text style={styles.optionText}>
              {option.emoji} {option.label}
              {option.label === 'Other' && selectedAnswers.some(a => a.isCustom) && 
                `: ${selectedAnswers.find(a => a.isCustom)?.answer}`}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Other input modal */}
        <Modal
          visible={showOtherModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOtherModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowOtherModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Other Option</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your answer here..."
                value={otherText}
                onChangeText={text => {
                  setOtherText(text);
                }}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={() => setShowOtherModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleOtherSubmit}
                >
                  <Text style={styles.modalButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        <TouchableOpacity
          style={styles.commentButton}
          onPress={() => setShowCommentInput(!showCommentInput)}
        >
          <Text style={styles.commentButtonText}>
            {showCommentInput ? 'Hide Comment' : 'Add Comment'}
          </Text>
        </TouchableOpacity>

        {showCommentInput && (
          <TextInput
            style={styles.commentInput}
            placeholder="Add your comment here..."
            value={comment}
            onChangeText={handleCommentChange}
            multiline
          />
        )}

        <View style={styles.navigationContainer}>
          {!isFirstQuestion && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.navigationButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              !selectedAnswers.length && styles.disabledButton
            ]}
            onPress={onNext}
            disabled={!selectedAnswers.length}
          >
            <Text style={styles.navigationButtonText}>
              {questionNumber === totalQuestions ? 'Submit' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 8,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  selectedOption: {
    backgroundColor: '#E8F3F4',
    borderColor: '#5B9AA0',
  },
  optionText: {
    fontSize: 16,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  commentButton: {
    padding: 16,
    alignItems: 'center',
  },
  commentButtonText: {
    color: '#5B9AA0',
    fontSize: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    height: 100,
    marginBottom: 24,
    fontSize: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ddd',
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#5B9AA0',
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    padding: 12,
  },
  submitButton: {
    backgroundColor: '#5B9AA0',
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#5B9AA0',
    fontSize: 16,
    fontWeight: '600',
  },
});
