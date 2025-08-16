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
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { flow_basic_1 } from '../flows/flow_basic_1';
import { flow_basic_1 as positive_flow_basic_1 } from '../flows/positive_flow_basic_1';
import MoodBubbleSlider from '../components/MoodBubbleSlider';
import { useRoute } from '@react-navigation/native';
import { getABCForBehavior, trackGPTSuggestionUsage } from '../utils/gptService';
import { getShuffledOptions, getTotalSets } from '../flows/behaviorSpecificOptions';
import { getShuffledGPTOptions, getTotalGPTSets } from '../utils/gptService';

interface Category {
  key: string;
  label: string;
  emoji: string;
  sentiment?: string | null;
  choices: Array<{ label: string; emoji: string; sentiment?: string | null; isOther?: boolean }>;
}

interface Question {
  id: string;
  question: string;
  answer_choices?: Array<{ label: string; emoji: string; sentiment?: string | null }>;
  categories?: Category[];
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

  const [currentChild, setCurrentChild] = useState<any>(null);
  const [showOtherModal, setShowOtherModal] = useState<OtherModalState | null>(null);
  const [moodBefore, setMoodBefore] = useState<number>(0);
  const [moodAfter, setMoodAfter] = useState<number>(0);
  const [flowSentiment, setFlowSentiment] = useState<'positive' | 'negative' | null>(null);
  const [currentFlow, setCurrentFlow] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gptSuggestions, setGptSuggestions] = useState<{ antecedents: Array<{ text: string; emoji: string }>; consequences: Array<{ text: string; emoji: string }>; isFallback?: boolean } | null>(null);
  const [isLoadingGpt, setIsLoadingGpt] = useState(false);
  const [optionSets, setOptionSets] = useState<{ [questionId: string]: number }>({});
  const [fadeAnim] = useState(new Animated.Value(1));
  // For shuffling Verbal Behavior choices
  const [behaviorOptionSet, setBehaviorOptionSet] = useState<number>(0);
  
  // New state for comment modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentCommentQuestionId, setCurrentCommentQuestionId] = useState<string>('');

  // Edit mode support
  const route = useRoute<any>();
  const isEditMode = route.params?.mode === 'edit';
  const editLog: any = route.params?.editLog;
  const selectedDate = route.params?.selectedDate; // For past date logging


  // Add ref for ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Inject behavior-specific options and GPT suggestions into the flow
  useEffect(() => {
    console.log('[FLOW] useEffect triggered. selectedAnswers:', selectedAnswers, 'gptSuggestions:', gptSuggestions);
    if (currentFlow.length > 0) {
      const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
      console.log('[FLOW] Selected behavior:', selectedBehavior);
      if (!selectedBehavior) {
        console.log('[FLOW] No selected behavior found, returning early');
        return;
      }

      const updatedFlow = [...currentFlow];
      
      // Inject behavior-specific antecedents into whatHappenedBefore question
      const antecedentQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatHappenedBefore');
      console.log('[FLOW] Antecedent question index:', antecedentQuestionIndex);
      if (antecedentQuestionIndex !== -1) {
        const currentSet = optionSets['whatHappenedBefore'] || 0;
        
        // Check if this is a custom "other" response (GPT should be used)
        const isCustomResponse = selectedAnswers['whatDidTheyDo']?.[0]?.isCustom;
        console.log('[FLOW] Is custom response:', isCustomResponse);
        
        let antecedentChoices = [];
        
        if (isCustomResponse && gptSuggestions && !gptSuggestions.isFallback) {
          // For custom responses, use only GPT options
          const gptAntecedents = getShuffledGPTOptions(gptSuggestions, 'antecedents', currentSet);
          console.log('[FLOW] GPT antecedents for custom response:', gptAntecedents);
          
          antecedentChoices = gptAntecedents.map(antecedent => ({
            label: antecedent.text, // Save only the text for AsyncStorage
            emoji: antecedent.emoji, // Use GPT's emoji
            sentiment: 'negative',
            isGptGenerated: true
          }));
        } else {
          // For predefined behaviors, use behavior-specific options
          const behaviorAntecedents = getShuffledOptions(selectedBehavior, 'antecedents', currentSet);
          console.log('[FLOW] Behavior antecedents for predefined behavior:', behaviorAntecedents);
          
            antecedentChoices = behaviorAntecedents.map((antecedent: string, index: number) => ({
    label: antecedent,
    emoji: getAntecedentEmoji(antecedent), // Use relevant emoji for behavior-specific options
    sentiment: 'negative',
    isBehaviorSpecific: true
  }));
        }
        
        const allAntecedentChoices = [
          ...antecedentChoices,
          { label: "Other", emoji: "➕", sentiment: null }
        ];
        console.log('[FLOW] All antecedent choices:', allAntecedentChoices);
        
        updatedFlow[antecedentQuestionIndex] = {
          ...updatedFlow[antecedentQuestionIndex],
          answer_choices: allAntecedentChoices
        };
      }
      
      // Inject behavior-specific consequences into whatHappenedAfter question
      const consequenceQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatHappenedAfter');
      console.log('[FLOW] Consequence question index:', consequenceQuestionIndex);
      if (consequenceQuestionIndex !== -1) {
        const currentSet = optionSets['whatHappenedAfter'] || 0;
        
        // Check if this is a custom "other" response (GPT should be used)
        const isCustomResponse = selectedAnswers['whatDidTheyDo']?.[0]?.isCustom;
        console.log('[FLOW] Is custom response for consequences:', isCustomResponse);
        
        let consequenceChoices = [];
        
        if (isCustomResponse && gptSuggestions && !gptSuggestions.isFallback) {
          // For custom responses, use only GPT options
          const gptConsequences = getShuffledGPTOptions(gptSuggestions, 'consequences', currentSet);
          console.log('[FLOW] GPT consequences for custom response:', gptConsequences);
          
          consequenceChoices = gptConsequences.map(consequence => ({
            label: consequence.text, // Save only the text for AsyncStorage
            emoji: consequence.emoji, // Use GPT's emoji
            sentiment: 'negative',
            isGptGenerated: true
          }));
        } else {
          // For predefined behaviors, use behavior-specific options
          const behaviorConsequences = getShuffledOptions(selectedBehavior, 'consequences', currentSet);
          console.log('[FLOW] Behavior consequences for predefined behavior:', behaviorConsequences);
          
            consequenceChoices = behaviorConsequences.map((consequence: string, index: number) => ({
    label: consequence,
    emoji: getConsequenceEmoji(consequence), // Use relevant emoji for behavior-specific options
    sentiment: 'negative',
    isBehaviorSpecific: true
  }));
        }
        
        const allConsequenceChoices = [
          ...consequenceChoices,
          { label: "Other", emoji: "➕", sentiment: null }
        ];
        console.log('[FLOW] All consequence choices:', allConsequenceChoices);
        
        updatedFlow[consequenceQuestionIndex] = {
          ...updatedFlow[consequenceQuestionIndex],
          answer_choices: allConsequenceChoices
        };
      }
      
      console.log('[FLOW] Setting currentFlow with updated flow');
      setCurrentFlow(updatedFlow);
    }
  }, [selectedAnswers, gptSuggestions, optionSets]);

  // Set sentiment immediately in edit mode
  useEffect(() => {
    if (isEditMode && editLog) {
      const sent = editLog.responses?.whatDidTheyDo?.sentiment || 'negative';
      setFlowSentiment(sent);
    }
  }, []);

  // Prefill state when editing
  useEffect(() => {
    if (isEditMode && editLog && flowSentiment && currentFlow.length > 0) {
      if (Object.keys(selectedAnswers).length === 0) {
        const answersInit: { [key: string]: Answer[] } = {};
        const otherInit: { [key: string]: string } = {};
        const commentInit: { [key: string]: string } = {};
        Object.keys(editLog.responses).forEach((qId: string) => {
          const resp = editLog.responses[qId];
          if (qId === 'mood') {
            const match = resp.answers[0]?.answer?.match(/Before: (\d+), After: (\d+)/);
            if (match) {
              setMoodBefore(parseInt(match[1], 10));
              setMoodAfter(parseInt(match[2], 10));
            }
          } else {
            answersInit[qId] = resp.answers.map((a: any) => ({ answer: a.answer, isCustom: a.isCustom }));
            const custom = resp.answers.find((a: any) => a.isCustom);
            if (custom) otherInit[qId] = custom.answer;
          }
          if (resp.comment) commentInit[qId] = resp.comment;
        });
        setSelectedAnswers(answersInit);
        setOtherText(otherInit);
        setComments(commentInit);
        if (editLog.responses?.whatDidTheyDo?.sentiment) {
          setFlowSentiment(editLog.responses.whatDidTheyDo.sentiment);
        }
      }
    }
  }, [isEditMode, editLog, flowSentiment, currentFlow]);

  // Flatten all behavior choices across categories so we can quick-search
  const allBehaviorChoices = React.useMemo(() => {
    const firstQuestion = flow_basic_1[0];
    if (!firstQuestion.categories) return [];
    return firstQuestion.categories.flatMap(cat =>
      cat.choices.map(choice => ({ ...choice, categoryKey: cat.key }))
    );
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

  const handleAnswer = (questionId: string, answer: { label: string; emoji: string; sentiment?: string | null }) => {
    // Handle "Other" option first
    if (answer.label === 'Other') {
      const customAnswer = selectedAnswers[questionId]?.find(a => a.isCustom);
      if (customAnswer) {
        // Already has custom text, show edit/deselect modal
        console.log('[DEBUG] Opening Other modal for edit. previousText:', customAnswer.answer);
        setShowOtherModal({ 
          isEditing: false, 
          previousText: customAnswer.answer,
          step: 'text'
        });
      } else {
        // New "Other" entry - only for first question, we need sentiment selection
        if (questionId === 'whatDidTheyDo') {
          console.log('[DEBUG] Opening Other modal for new entry (whatDidTheyDo). previousText:', otherText[questionId]);
          setShowOtherModal({ 
            isEditing: true,
            previousText: otherText[questionId],  // Will be undefined for first time
            sentiment: undefined, // Will be selected by user
            step: 'text'
          });
        } else {
          console.log('[DEBUG] Opening Other modal for new entry. previousText:', otherText[questionId]);
          setShowOtherModal({ 
            isEditing: true,
            previousText: otherText[questionId],  // Will be undefined for first time
            step: 'text'
          });
        }
      }
      return;
    }

    // isOther is already handled above, so we can skip this check
    if (answer.label === 'Other') return;

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

    // Track GPT suggestion usage if this is a GPT-generated answer
    if ((answer as any).isGptGenerated) {
      const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
      if (selectedBehavior) {
        const suggestionType = questionId === 'whatHappenedBefore' ? 'antecedent' : 'consequence';
        trackGPTSuggestionUsage(selectedBehavior, suggestionType, answer.label);
      }
    }

    // Track behavior-specific option usage
    if ((answer as any).isBehaviorSpecific) {
      const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
      if (selectedBehavior) {
        const suggestionType = questionId === 'whatHappenedBefore' ? 'antecedent' : 'consequence';
        trackGPTSuggestionUsage(selectedBehavior, suggestionType, answer.label);
      }
    }

    // Process answer selection - always replace for first question, toggle for others
    setSelectedAnswers(prev => {
      const answerText = answer.label;
      const current = prev[questionId] || [];
      
      // For the first question, always replace any existing selection
      if (questionId === 'whatDidTheyDo') {
        return {
          ...prev,
          [questionId]: [{ answer: answerText, isCustom: false }]
        };
      }

      // For other questions, toggle the selection
      const existingIndex = current.findIndex(a => a.answer === answerText);
      if (existingIndex >= 0) {
        // Remove if already selected
        return {
          ...prev,
          [questionId]: current.filter((_, i) => i !== existingIndex)
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          [questionId]: [...current, { answer: answerText, isCustom: false }]
        };
      }
    });
  };

  // Add new handleOtherSubmit function
  const handleOtherSubmit = () => {
    console.log('[DEBUG] handleOtherSubmit called. showOtherModal:', showOtherModal, 'otherText:', otherText);
    if (!showOtherModal?.isEditing) return;

    // If we're on the text step and it's the first question, move to sentiment step
    if (showOtherModal.step === 'text' && currentQ.id === 'whatDidTheyDo') {
      handleNextStep();
      return;
    }

    // If we're on the sentiment step or it's not the first question
    if (showOtherModal.step === 'sentiment' || currentQ.id !== 'whatDidTheyDo') {
      if (!otherText[currentQ.id]?.trim()) {
        // If input is empty, remove custom answer
        setSelectedAnswers(prev => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || []).filter(a => !a.isCustom)
        }));
        setShowOtherModal(null);
        return;
      }
      // For the first question, we need to handle sentiment
      if (currentQ.id === 'whatDidTheyDo' && showOtherModal.sentiment) {
        // Set the sentiment and store the custom answer directly
        setFlowSentiment(showOtherModal.sentiment);
        setSelectedAnswers(prev => ({
          ...prev,
          [currentQ.id]: [{ answer: otherText[currentQ.id], isCustom: true }]
        }));
        
        // Call GPT to get ABC suggestions for the custom behavior
        const customBehavior = otherText[currentQ.id];
        console.log('[GPT] About to call getABCForBehavior with behavior:', customBehavior);
        if (customBehavior) {
          setIsLoadingGpt(true);
          console.log('[GPT] Setting isLoadingGpt to true');
          getABCForBehavior(customBehavior)
            .then(suggestions => {
              console.log('[GPT] Successfully got suggestions:', suggestions);
              setGptSuggestions(suggestions);
              console.log('[GPT] Set gptSuggestions state to:', suggestions);
            })
            .catch(error => {
              console.error('[GPT] Failed to get suggestions:', error);
              console.error('[GPT] Error details:', error.message, error.stack);
            })
            .finally(() => {
              console.log('[GPT] Setting isLoadingGpt to false');
              setIsLoadingGpt(false);
            });
        } else {
          console.log('[GPT] No custom behavior text found, skipping GPT call');
        }
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
    console.log('[DEBUG] handleOtherDeselect called. currentQ.id:', currentQ.id);
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: (prev[currentQ.id] || []).filter(a => !a.isCustom)
    }));
    setShowOtherModal(null);
  };

  const handleOtherEdit = () => {
    console.log('[DEBUG] handleOtherEdit called. previousText:', selectedAnswers[currentQ.id]?.find(a => a.isCustom)?.answer);
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

  const handleShuffleOptions = (questionId: string) => {
    const currentSet = optionSets[questionId] || 0;
    const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
    const isCustomResponse = selectedAnswers['whatDidTheyDo']?.[0]?.isCustom;
    
    if (!selectedBehavior) return;
    
    const questionType = questionId === 'whatHappenedBefore' ? 'antecedents' : 'consequences';
    
    let totalSets = 0;
    if (isCustomResponse && gptSuggestions && !gptSuggestions.isFallback) {
      // For custom responses, use GPT sets
      totalSets = getTotalGPTSets(gptSuggestions, questionType);
    } else {
      // For predefined behaviors, use behavior-specific sets
      totalSets = getTotalSets(selectedBehavior || '', questionType);
    }
    
    // Cycle to next set, or back to 0 if we've reached the end
    const nextSet = (currentSet + 1) % totalSets;
    setOptionSets(prev => ({
      ...prev,
      [questionId]: nextSet
    }));
  };

  // Shuffle choices within Verbal Behaviors category
  const handleShuffleBehaviorChoices = () => {
    if (!selectedCategory || selectedCategory.key !== 'verbalBehaviors') return;
    const totalSets = Math.ceil(selectedCategory.choices.length / 5);
    setBehaviorOptionSet(prev => (prev + 1) % totalSets);
  };

  const animateBackToCategories = () => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      // Change state - go back to main categories view
      setSelectedCategory(null);
      setSearchQuery(''); // Clear any search query
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };


  // Helper function to get appropriate emoji for antecedents (for behavior-specific options only)
  const getAntecedentEmoji = (antecedent: string): string => {
    const lowerAntecedent = antecedent.toLowerCase();
    
    // Denials and restrictions
    if (lowerAntecedent.includes('denied') || lowerAntecedent.includes('told no') || lowerAntecedent.includes('said no')) return '🚫';
    if (lowerAntecedent.includes('not allowed') || lowerAntecedent.includes('forbidden')) return '🚫';
    if (lowerAntecedent.includes('candy or snack was denied')) return '🚫';
    
    // Sharing and cooperation
    if (lowerAntecedent.includes('share') || lowerAntecedent.includes('asked to share')) return '🤝';
    if (lowerAntecedent.includes('cooperate') || lowerAntecedent.includes('asked to help')) return '🤝';
    if (lowerAntecedent.includes('join') || lowerAntecedent.includes('participate')) return '👥';
    if (lowerAntecedent.includes('had to share a toy')) return '🤝';
    
    // Stopping activities
    if (lowerAntecedent.includes('stop') || lowerAntecedent.includes('told to stop')) return '⏹️';
    if (lowerAntecedent.includes('end') || lowerAntecedent.includes('finish')) return '✅';
    if (lowerAntecedent.includes('put away') || lowerAntecedent.includes('clean up')) return '🧹';
    if (lowerAntecedent.includes('was told to clean up toys')) return '🧹';
    if (lowerAntecedent.includes('was told to stop an activity')) return '⏹️';
    if (lowerAntecedent.includes('had to stop playing')) return '⏹️';
    if (lowerAntecedent.includes('screen time ended')) return '⏹️';
    if (lowerAntecedent.includes('lost a turn in a game')) return '⏹️';
    
    // Waiting and patience
    if (lowerAntecedent.includes('wait') || lowerAntecedent.includes('asked to wait')) return '⏳';
    if (lowerAntecedent.includes('patient') || lowerAntecedent.includes('calm down')) return '😌';
    if (lowerAntecedent.includes('quiet') || lowerAntecedent.includes('be quiet')) return '🤫';
    if (lowerAntecedent.includes('was told to wait their turn')) return '⏳';
    if (lowerAntecedent.includes('was asked to wait')) return '⏳';
    
    // Physical actions
    if (lowerAntecedent.includes('sit') || lowerAntecedent.includes('sit still')) return '🪑';
    if (lowerAntecedent.includes('move') || lowerAntecedent.includes('get up')) return '🚶';
    if (lowerAntecedent.includes('run') || lowerAntecedent.includes('running')) return '🏃';
    if (lowerAntecedent.includes('jump') || lowerAntecedent.includes('jumping')) return '🦘';
    if (lowerAntecedent.includes('was told to sit down')) return '🪑';
    if (lowerAntecedent.includes('was moved to a different room')) return '🚶';
    
    // Getting ready and transitions
    if (lowerAntecedent.includes('get ready') || lowerAntecedent.includes('get dressed')) return '👕';
    if (lowerAntecedent.includes('bed') || lowerAntecedent.includes('sleep')) return '🛏️';
    if (lowerAntecedent.includes('eat') || lowerAntecedent.includes('food') || lowerAntecedent.includes('meal')) return '🍽️';
    if (lowerAntecedent.includes('transition') || lowerAntecedent.includes('change activity')) return '🔄';
    if (lowerAntecedent.includes('was told to get dressed')) return '👕';
    if (lowerAntecedent.includes('was asked to eat food')) return '🍽️';
    if (lowerAntecedent.includes('clothes were put on')) return '👕';
    if (lowerAntecedent.includes('was told to get ready')) return '👕';
    if (lowerAntecedent.includes('was told to put on shoes')) return '👕';
    if (lowerAntecedent.includes('was asked to sit at the table')) return '🍽️';
    if (lowerAntecedent.includes('was asked to come inside')) return '🏠';
    if (lowerAntecedent.includes('was told to go home')) return '🏠';
    if (lowerAntecedent.includes('was told to leave the park')) return '🏠';
    if (lowerAntecedent.includes('parent said it was bedtime')) return '🛏️';
    if (lowerAntecedent.includes('was asked to join a group')) return '👥';
    if (lowerAntecedent.includes('class or group activity started')) return '👥';
    if (lowerAntecedent.includes('was asked to transition activities')) return '🔄';
    
    // Communication
    if (lowerAntecedent.includes('words') || lowerAntecedent.includes('talk') || lowerAntecedent.includes('speak')) return '💬';
    if (lowerAntecedent.includes('listen') || lowerAntecedent.includes('pay attention')) return '👂';
    if (lowerAntecedent.includes('explain') || lowerAntecedent.includes('tell')) return '📖';
    if (lowerAntecedent.includes('answer') || lowerAntecedent.includes('respond')) return '❓';
    if (lowerAntecedent.includes('was asked to use words')) return '💬';
    if (lowerAntecedent.includes('asked to answer a question')) return '❓';
    if (lowerAntecedent.includes('was told to stop repeating words')) return '💬';
    if (lowerAntecedent.includes('was told to speak up')) return '💬';
    if (lowerAntecedent.includes('was asked to say sorry')) return '🙏';
    if (lowerAntecedent.includes('was told to use inside voice')) return '🤫';
    if (lowerAntecedent.includes('was interrupted mid-sentence')) return '💬';
    if (lowerAntecedent.includes('parent changed conversation topic')) return '💬';
    
    // Social interactions
    if (lowerAntecedent.includes('social') || lowerAntecedent.includes('interact')) return '👥';
    if (lowerAntecedent.includes('gentle') || lowerAntecedent.includes('careful')) return '🤲';
    if (lowerAntecedent.includes('apologize') || lowerAntecedent.includes('sorry')) return '🙏';
    if (lowerAntecedent.includes('parent gave a toy to sibling')) return '👫';
    if (lowerAntecedent.includes('parent told them \'no\'')) return '🚫';
    if (lowerAntecedent.includes('parent walked away')) return '👨‍👩‍👧‍👦';
    if (lowerAntecedent.includes('parent started talking to someone else')) return '👨‍👩‍👧‍👦';
    if (lowerAntecedent.includes('parent opened the door')) return '👨‍👩‍👧‍👦';
    if (lowerAntecedent.includes('another child shouted')) return '👥';
    if (lowerAntecedent.includes('sibling made loud noise')) return '👫';
    if (lowerAntecedent.includes('another child joined the room')) return '👥';
    if (lowerAntecedent.includes('another child bumped into them')) return '👥';
    if (lowerAntecedent.includes('someone entered their personal space')) return '👤';
    if (lowerAntecedent.includes('someone began talking loudly')) return '👤';
    if (lowerAntecedent.includes('someone sat nearby')) return '👤';
    if (lowerAntecedent.includes('another child touched their item')) return '👥';
    if (lowerAntecedent.includes('toy was rearranged by someone')) return '👤';
    
    // Tasks and instructions
    if (lowerAntecedent.includes('task') || lowerAntecedent.includes('homework')) return '📋';
    if (lowerAntecedent.includes('follow') || lowerAntecedent.includes('instructions')) return '📝';
    if (lowerAntecedent.includes('focus') || lowerAntecedent.includes('concentrate')) return '🎯';
    if (lowerAntecedent.includes('was asked to clean up')) return '🧹';
    if (lowerAntecedent.includes('was told to clean up toys')) return '🧹';
    if (lowerAntecedent.includes('toy was put away')) return '🧹';
    if (lowerAntecedent.includes('toy was moved or cleaned up')) return '🧹';
    if (lowerAntecedent.includes('toy was removed')) return '🧹';
    if (lowerAntecedent.includes('object they were using was moved')) return '🧹';
    
    // Emotional states
    if (lowerAntecedent.includes('overwhelmed') || lowerAntecedent.includes('frustrated')) return '😰';
    if (lowerAntecedent.includes('angry') || lowerAntecedent.includes('mad')) return '😠';
    if (lowerAntecedent.includes('sad') || lowerAntecedent.includes('crying')) return '😢';
    if (lowerAntecedent.includes('tired') || lowerAntecedent.includes('exhausted')) return '😴';
    
    // Environmental factors
    if (lowerAntecedent.includes('crowded') || lowerAntecedent.includes('busy')) return '👥';
    if (lowerAntecedent.includes('noisy') || lowerAntecedent.includes('loud')) return '🔊';
    if (lowerAntecedent.includes('bright') || lowerAntecedent.includes('light')) return '💡';
    if (lowerAntecedent.includes('hot') || lowerAntecedent.includes('cold')) return '🌡️';
    if (lowerAntecedent.includes('room became crowded')) return '👥';
    if (lowerAntecedent.includes('loud noise occurred')) return '🔊';
    if (lowerAntecedent.includes('lights turned on/off')) return '💡';
    if (lowerAntecedent.includes('lights turned off')) return '💡';
    
    // Sibling interactions
    if (lowerAntecedent.includes('sibling') || lowerAntecedent.includes('brother') || lowerAntecedent.includes('sister')) return '👫';
    if (lowerAntecedent.includes('took') || lowerAntecedent.includes('grabbed')) return '🤏';
    if (lowerAntecedent.includes('sibling took their toy')) return '👫';
    if (lowerAntecedent.includes('peer hit or pushed them')) return '👥';
    
    // Routine changes
    if (lowerAntecedent.includes('routine') || lowerAntecedent.includes('schedule')) return '📅';
    if (lowerAntecedent.includes('unexpected') || lowerAntecedent.includes('surprise')) return '🎉';
    if (lowerAntecedent.includes('backpack was packed')) return '🎒';
    if (lowerAntecedent.includes('shoes were handed to them')) return '👕';
    if (lowerAntecedent.includes('meal was served')) return '🍽️';
    if (lowerAntecedent.includes('clothing was adjusted')) return '👕';
    
    // Toys and objects
    if (lowerAntecedent.includes('toy') || lowerAntecedent.includes('game')) return '🧸';
    if (lowerAntecedent.includes('phone') || lowerAntecedent.includes('screen')) return '📱';
    if (lowerAntecedent.includes('book') || lowerAntecedent.includes('read')) return '📚';
    if (lowerAntecedent.includes('ipad was taken away')) return '📱';
    if (lowerAntecedent.includes('screen was turned off')) return '📱';
    if (lowerAntecedent.includes('screen time began or ended')) return '📱';
    if (lowerAntecedent.includes('video ended')) return '📱';
    if (lowerAntecedent.includes('music or video was paused')) return '📱';
    if (lowerAntecedent.includes('music started or stopped')) return '📱';
    if (lowerAntecedent.includes('book or screen was closed')) return '📚';
    
    // Safety and boundaries
    if (lowerAntecedent.includes('dangerous') || lowerAntecedent.includes('unsafe')) return '⚠️';
    if (lowerAntecedent.includes('boundary') || lowerAntecedent.includes('limit')) return '🚧';
    
    // Timers and events
    if (lowerAntecedent.includes('timer went off')) return '⏰';
    if (lowerAntecedent.includes('doorbell or phone rang')) return '📞';
    if (lowerAntecedent.includes('door opened or slammed')) return '🚪';
    if (lowerAntecedent.includes('entered a new room')) return '🚪';
    
    // Default for common phrases
    if (lowerAntecedent.includes('asked to') || lowerAntecedent.includes('told to')) return '📢';
    if (lowerAntecedent.includes('wanted') || lowerAntecedent.includes('desired')) return '💭';
    
    return '❓'; // Default emoji
  };

  // Helper function to get appropriate emoji for consequences (for behavior-specific options only)
  const getConsequenceEmoji = (consequence: string): string => {
    const lowerConsequence = consequence.toLowerCase();
    
    // Time-based consequences
    if (lowerConsequence.includes('paused')) return '⏸️';
    if (lowerConsequence.includes('verbal')) return '💬';
    if (lowerConsequence.includes('physical prompting was used')) return '👨‍👩‍👧‍👦';
    if (lowerConsequence.includes('time out') || lowerConsequence.includes('timeout')) return '⏰';
    if (lowerConsequence.includes('extra time') || lowerConsequence.includes('more time')) return '⏰';
    if (lowerConsequence.includes('wait') || lowerConsequence.includes('delayed')) return '⏳';
    
    // Removal and taking away
    if (lowerConsequence.includes('taken away') || lowerConsequence.includes('removed') || lowerConsequence.includes('confiscated')) return '📤';
    if (lowerConsequence.includes('privilege removed') || lowerConsequence.includes('privileges taken')) return '🚫';
    if (lowerConsequence.includes('toy taken') || lowerConsequence.includes('game removed')) return '🧸';
    
    // Apologies and reconciliation
    if (lowerConsequence.includes('apology') || lowerConsequence.includes('apologize') || lowerConsequence.includes('said sorry')) return '🙏';
    if (lowerConsequence.includes('forgiven') || lowerConsequence.includes('accepted')) return '🤗';
    
    // Physical consequences and room/space management
    if (lowerConsequence.includes('sent to room') || lowerConsequence.includes('go to room')) return '🚪';
    if (lowerConsequence.includes('taken to a different room') || lowerConsequence.includes('moved to room')) return '🚪';
    if (lowerConsequence.includes('left situation') || lowerConsequence.includes('removed from')) return '🏃';
    if (lowerConsequence.includes('separated') || lowerConsequence.includes('isolated')) return '🚪';
    if (lowerConsequence.includes('separated from others')) return '🚪';
    
    // Warnings and corrections
    if (lowerConsequence.includes('warning') || lowerConsequence.includes('warned')) return '⚠️';
    if (lowerConsequence.includes('correction') || lowerConsequence.includes('corrected')) return '✏️';
    if (lowerConsequence.includes('scolded') || lowerConsequence.includes('told off')) return '📢';
    
    // Parental intervention
    if (lowerConsequence.includes('intervened') || lowerConsequence.includes('stepped in')) return '👨‍👩‍👧‍👦';
    if (lowerConsequence.includes('parent') || lowerConsequence.includes('mom') || lowerConsequence.includes('dad')) return '👨‍👩‍👧‍👦';
    if (lowerConsequence.includes('parent physically intervened')) return '👨‍👩‍👧‍👦';
    
    // Emotional responses
    if (lowerConsequence.includes('cried') || lowerConsequence.includes('tears')) return '😭';
    if (lowerConsequence.includes('angry') || lowerConsequence.includes('mad')) return '😠';
    if (lowerConsequence.includes('sad') || lowerConsequence.includes('upset')) return '😢';
    if (lowerConsequence.includes('frustrated') || lowerConsequence.includes('annoyed')) return '😤';
    
    // Stopping and ending
    if (lowerConsequence.includes('stopped') || lowerConsequence.includes('ended') || lowerConsequence.includes('halted')) return '⏹️';
    if (lowerConsequence.includes('activity stopped') || lowerConsequence.includes('game ended')) return '⏹️';
    
    // Calming and comfort
    if (lowerConsequence.includes('calm down') || lowerConsequence.includes('calmed')) return '😌';
    if (lowerConsequence.includes('comforted') || lowerConsequence.includes('hugged')) return '🤗';
    if (lowerConsequence.includes('soothed') || lowerConsequence.includes('reassured')) return '😌';
    if (lowerConsequence.includes('calm-down time') || lowerConsequence.includes('calm down time')) return '😌';
    
    // Communication and discussion
    if (lowerConsequence.includes('discussion') || lowerConsequence.includes('talked about')) return '💬';
    if (lowerConsequence.includes('explained') || lowerConsequence.includes('clarified')) return '📖';
    if (lowerConsequence.includes('communication') || lowerConsequence.includes('conversation')) return '💬';
    if (lowerConsequence.includes('consequence was verbally explained')) return '📖';
    if (lowerConsequence.includes('consequence was explained')) return '📖';
    
    // Ignoring and non-response
    if (lowerConsequence.includes('ignored') || lowerConsequence.includes('no attention')) return '🙈';
    if (lowerConsequence.includes('no response') || lowerConsequence.includes('didn\'t react')) return '💭';
    if (lowerConsequence.includes('no direct response') || lowerConsequence.includes('behavior ignored')) return '⛔️';
    
    // Redirection and alternatives
    if (lowerConsequence.includes('redirection') || lowerConsequence.includes('redirected')) return '🔄';
    if (lowerConsequence.includes('redirected to another activity') || lowerConsequence.includes('redirected to a quiet task')) return '🔄';
    if (lowerConsequence.includes('redirected to new task') || lowerConsequence.includes('redirected to a new activity')) return '🔄';
    if (lowerConsequence.includes('alternative') || lowerConsequence.includes('different activity')) return '🔄';
    if (lowerConsequence.includes('new activity') || lowerConsequence.includes('changed activity')) return '🆕';
    
    // Positive reinforcement
    if (lowerConsequence.includes('reinforcement') || lowerConsequence.includes('praise')) return '⭐';
    if (lowerConsequence.includes('reward') || lowerConsequence.includes('positive')) return '⭐';
    if (lowerConsequence.includes('good job') || lowerConsequence.includes('well done')) return '👏';
    if (lowerConsequence.includes('positive reinforcement for stopping')) return '⭐';
    
    // Gentle approaches
    if (lowerConsequence.includes('gentle reminder') || lowerConsequence.includes('kindly asked')) return '💡';
    if (lowerConsequence.includes('patience shown') || lowerConsequence.includes('patient')) return '😌';
    if (lowerConsequence.includes('understanding') || lowerConsequence.includes('understood')) return '💭';
    if (lowerConsequence.includes('gentle verbal correction') || lowerConsequence.includes('gentle behavior modeled')) return '💡';
    
    // Professional help
    if (lowerConsequence.includes('professional help') || lowerConsequence.includes('therapist')) return '👨‍⚕️';
    if (lowerConsequence.includes('counseling') || lowerConsequence.includes('therapy')) return '👨‍⚕️';
    
    // Calming techniques
    if (lowerConsequence.includes('calming technique') || lowerConsequence.includes('breathing')) return '🧘';
    if (lowerConsequence.includes('meditation') || lowerConsequence.includes('relaxation')) return '🧘';
    
    // Attention and focus
    if (lowerConsequence.includes('attention') || lowerConsequence.includes('focused on')) return '👀';
    if (lowerConsequence.includes('watched') || lowerConsequence.includes('observed')) return '👀';
    
    // Feelings and emotions
    if (lowerConsequence.includes('feelings') || lowerConsequence.includes('emotions')) return '💭';
    if (lowerConsequence.includes('understood feelings') || lowerConsequence.includes('validated')) return '💭';
    
    // Language and communication skills
    if (lowerConsequence.includes('language') || lowerConsequence.includes('words')) return '📚';
    if (lowerConsequence.includes('appropriate') || lowerConsequence.includes('proper')) return '✅';
    if (lowerConsequence.includes('asked to express themselves differently')) return '💬';
    if (lowerConsequence.includes('reminded to use indoor voice')) return '🤫';
    
    // Space and boundaries
    if (lowerConsequence.includes('space') || lowerConsequence.includes('alone time')) return '🌌';
    if (lowerConsequence.includes('boundary') || lowerConsequence.includes('limit set')) return '🚧';
    if (lowerConsequence.includes('space was provided to regulate')) return '🌌';
    
    // Continuation and persistence
    if (lowerConsequence.includes('continued without') || lowerConsequence.includes('kept going')) return '➡️';
    if (lowerConsequence.includes('persisted') || lowerConsequence.includes('didn\'t stop')) return '➡️';
    
    // Social interactions
    if (lowerConsequence.includes('social interaction') || lowerConsequence.includes('group activity')) return '👥';
    if (lowerConsequence.includes('individual activity') || lowerConsequence.includes('alone')) return '👤';
    if (lowerConsequence.includes('joining') || lowerConsequence.includes('participated')) return '🤝';
    
    // Safety and protection
    if (lowerConsequence.includes('safety check') || lowerConsequence.includes('safety')) return '🛡️';
    if (lowerConsequence.includes('protected') || lowerConsequence.includes('kept safe')) return '🛡️';
    if (lowerConsequence.includes('staying close') || lowerConsequence.includes('nearby')) return '📍';
    if (lowerConsequence.includes('safety check was performed')) return '🛡️';
    
    // Instructions and following
    if (lowerConsequence.includes('following instructions') || lowerConsequence.includes('obeyed')) return '📋';
    if (lowerConsequence.includes('listened') || lowerConsequence.includes('followed')) return '📋';
    if (lowerConsequence.includes('asked to apologize')) return '🙏';
    if (lowerConsequence.includes('guided through the transition')) return '📋';
    
    // Food and meals
    if (lowerConsequence.includes('meal ended') || lowerConsequence.includes('finished eating')) return '🍽️';
    if (lowerConsequence.includes('eating') || lowerConsequence.includes('food')) return '🍎';
    if (lowerConsequence.includes('alternative food') || lowerConsequence.includes('different meal')) return '🍕';
    
    // Sensory and fidget tools
    if (lowerConsequence.includes('fidget') || lowerConsequence.includes('sensory tool')) return '🎯';
    if (lowerConsequence.includes('given a fidget') || lowerConsequence.includes('sensory tool')) return '🎯';
    
    // Environment changes
    if (lowerConsequence.includes('environment was changed') || lowerConsequence.includes('moved to quiet room')) return '🏠';
    
    // Modeling behavior
    if (lowerConsequence.includes('modeled') || lowerConsequence.includes('modeling')) return '👥';
    if (lowerConsequence.includes('alternative behavior was modeled')) return '👥';
    
    // Visual aids
    if (lowerConsequence.includes('visual aid') || lowerConsequence.includes('cue card')) return '📋';
    if (lowerConsequence.includes('visual schedule was shown')) return '📅';
    
    // Default for common phrases
    if (lowerConsequence.includes('was given') || lowerConsequence.includes('received')) return '📦';
    if (lowerConsequence.includes('happened') || lowerConsequence.includes('resulted in')) return '➡️';
    
    return '❓'; // Default emoji
  };

  const isAnswerSelected = (questionId: string, answerLabel: string) => {
    const answers = selectedAnswers[questionId] || [];
    return answers.some(a => a.answer === answerLabel);
  };

  const isOtherSelected = (questionId: string) => {
    const answers = selectedAnswers[questionId] || [];
    return answers.some(a => a.isCustom);
  };

  // Helper to check if a category contains the selected answer
  const isCategorySelected = (category: Category) => {
    const answers = selectedAnswers[currentQ.id] || [];
    return answers.some(answer => 
      category.choices.some(choice => choice.label === answer.answer)
    );
  };

  // Helper to get the selected answer text for display
  const getSelectedAnswerText = () => {
    const answers = selectedAnswers[currentQ.id] || [];
    if (answers.length > 0) {
      const answer = answers[0];
      if (answer.isCustom) {
        return answer.answer;
      }
      return answer.answer;
    }
    return null;
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

      const storageKey = flowSentiment === 'positive' ? 'flow_basic_1_positive' : 'flow_basic_1_negative';

      if (isEditMode && editLog) {
        const updatedLog = { ...editLog, responses, edited: true };
        const updatedData = { ...currentChild.data };
        const logsArr = (updatedData.completed_logs?.[storageKey] || []).map((l: any) =>
          l.id === editLog.id ? updatedLog : l
        );
        updatedData.completed_logs = {
          ...updatedData.completed_logs,
          [storageKey]: logsArr,
        };
        await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedData));
        // Calculate date string to reopen modal (YYYY-MM-DD)
        // Convert UTC ISO timestamp back to local date components
        const utcDate = new Date(editLog.timestamp);
        const localMillis = utcDate.getTime() + utcDate.getTimezoneOffset() * 60000;
        const local = new Date(localMillis);
        const year = local.getFullYear();
        const month = String(local.getMonth() + 1).padStart(2, '0');
        const day = String(local.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        navigation.navigate('BottomTabsStack', {
          screen: 'Past Logs',
          params: { reopenDate: dateStr, refresh: Date.now() },
        });
      } else {
        // Create timestamp - use selectedDate if provided (for past date logging), otherwise use current time
        let timestamp: string;
        if (selectedDate) {
          // Check if selectedDate is today
          const today = new Date();
          const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          if (selectedDate === todayString) {
            // For current day, use exact current timestamp
            const localTime = new Date();
            timestamp = new Date(localTime.getTime() - localTime.getTimezoneOffset() * 60000).toISOString();
          } else {
            // For past dates, convert selectedDate (YYYY-MM-DD) to ISO timestamp at noon local time
            const [year, month, day] = selectedDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day, 12, 0, 0); // month is 0-indexed, set to noon
            timestamp = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString();
          }
        } else {
          // Use current time for regular logging
          const localTime = new Date();
          timestamp = new Date(localTime.getTime() - localTime.getTimezoneOffset() * 60000).toISOString();
        }
        
        const newLog = {
          id: `log_${uuidv4()}`,
          timestamp,
          responses,
        };
        const updatedData = {
          ...currentChild.data,
          completed_logs: {
            ...currentChild.data.completed_logs,
            [storageKey]: [
              ...(currentChild.data.completed_logs?.[storageKey] || []),
              newLog,
            ],
          },
        };
        await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedData));
        
        // Navigate based on whether this was a past date log or current log
        if (selectedDate) {
          // For past date logging, go back to Past Logs screen
          navigation.navigate('BottomTabsStack', {
            screen: 'Past Logs',
            params: { reopenDate: selectedDate, refresh: Date.now() },
          });
        } else {
          // For current day logging, go to celebration screen
          navigation.replace('CelebrationScreen');
        }
      }
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

  const filteredBehaviorChoices = searchQuery
    ? allBehaviorChoices.filter(c =>
        c.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];



  // New function to handle comment modal
  const handleCommentModalOpen = (questionId: string) => {
    setCurrentCommentQuestionId(questionId);
    setShowCommentModal(true);
  };

  // Build dynamic labels for mood sliders
  const buildSummary = (questionId: string) => {
    const arr = selectedAnswers[questionId] || [];
    if (arr.length === 0) return '';
    const first = arr[0].answer;
    const more = arr.length - 1;
    return more > 0 ? `${first} (+${more} more)` : first;
  };

  const antecedentSummary = buildSummary('whatHappenedBefore');
  const consequenceSummary = buildSummary('whatHappenedAfter');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.progressRow}>
            <Text style={styles.progress}>
              Step {currentQuestion + 1} of {currentFlow.length > 0 ? currentFlow.length : 1}
            </Text>
            <TouchableOpacity
              style={styles.commentIconButton}
              onPress={() => handleCommentModalOpen(currentQ.id)}
            >
              <Text style={styles.commentIcon}>💬</Text>
              {comments[currentQ.id] && (
                <View style={styles.commentBadge}>
                  <Text style={styles.commentBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.question}>{currentQ.question}</Text>
          {currentQ.subheading && (
            <Text style={styles.subheading}>{currentQ.subheading}</Text>
          )}

          {currentQ.id === 'mood' ? (
            <View style={styles.moodContainer}>
              <MoodBubbleSlider
                label="Before"
                secondary={antecedentSummary}
                value={moodBefore}
                onValueChange={setMoodBefore}
              />
              <View style={styles.moodDivider} />
              <MoodBubbleSlider
                label="After"
                secondary={consequenceSummary}
                value={moodAfter}
                onValueChange={setMoodAfter}
              />
            </View>
          ) : currentQ.id === 'whatDidTheyDo' ? (
            <>
              {/* Quick search bar */}
              <TextInput
                style={styles.modalInput}
                placeholder="Search behaviors..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Results based on search, or category/choice views */}
              {searchQuery.length > 0 ? (
                filteredBehaviorChoices.map((choice) => (
                  <TouchableOpacity
                    key={choice.label}
                    style={[
                      styles.choiceButton,
                      (choice.label === 'Other'
                        ? isOtherSelected(currentQ.id)
                        : isAnswerSelected(currentQ.id, choice.label)) && styles.selectedChoice,
                    ]}
                                          onPress={() => {
                        handleAnswer(currentQ.id, choice);
                        // Immediately go back to main categories view
                        setSelectedCategory(null);
                        setSearchQuery('');
                      }}
                  >
                    <Text style={styles.choiceText}>{getChoiceLabel(choice)}</Text>
                  </TouchableOpacity>
                ))
              ) : selectedCategory ? (
                <>
                  {(() => {
                    const catChoices = selectedCategory.key === 'verbalBehaviors'
                      ? selectedCategory.choices.slice(
                          behaviorOptionSet * 5,
                          Math.min((behaviorOptionSet + 1) * 5, selectedCategory.choices.length)
                        )
                      : selectedCategory.choices;
                    return catChoices.map((choice) => (
                     <TouchableOpacity
                       key={choice.label}
                       style={[
                         styles.choiceButton,
                         (choice.label === 'Other'
                           ? isOtherSelected(currentQ.id)
                           : isAnswerSelected(currentQ.id, choice.label)) && styles.selectedChoice,
                       ]}
                       onPress={() => {
                         handleAnswer(currentQ.id, choice);
                         // Immediately go back to main categories view
                         setSelectedCategory(null);
                         setSearchQuery('');
                         setBehaviorOptionSet(0);
                       }}
                     >
                       <Text style={styles.choiceText}>{getChoiceLabel(choice)}</Text>
                     </TouchableOpacity>
                    ));
                  })()}

                  {selectedCategory.key === 'verbalBehaviors' && (
                    <View style={styles.shuffleContainer}>
                      <TouchableOpacity
                        style={styles.shuffleButton}
                        onPress={handleShuffleBehaviorChoices}
                      >
                        <Text style={styles.shuffleButtonText}>🔄 Shuffle options</Text>
                      </TouchableOpacity>
                      <Text style={styles.shuffleInfoText}>
                        Set {behaviorOptionSet + 1} of {Math.ceil(selectedCategory.choices.length / 5)}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  {getSelectedAnswerText() && (
                    <View style={styles.selectedAnswerContainer}>
                      <Text style={styles.selectedAnswerText}>
                        ✅ Selected: {getSelectedAnswerText()}
                      </Text>
                      <Text style={styles.nextHintText}>
                        You can now press "Next" to continue
                      </Text>
                      {/* {isLoadingGpt && (
                        <Text style={styles.gptLoadingText}>
                          🤖 Generating suggestions for the next questions...
                        </Text>
                      )} */}
                    </View>
                  )}
                  {currentQ.categories?.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.choiceButton,
                        isCategorySelected(cat) && styles.selectedChoice
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setBehaviorOptionSet(0);
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.choiceText}>{`${cat.emoji} ${cat.label}`}</Text>
                        {isCategorySelected(cat) && (
                          <Text style={styles.categorySelectedText}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              {currentQ.id === 'whatHappenedBefore' || currentQ.id === 'whatHappenedAfter' ? (
                // Show loading skeleton if GPT is generating
                isLoadingGpt ? (
                  <View style={styles.skeletonContainer}>
                    {[1, 2, 3, 4, 5].map((index) => (
                      <View key={index} style={styles.skeletonChoice}>
                        <View style={styles.skeletonEmoji} />
                        <View style={styles.skeletonText} />
                      </View>
                    ))}
                    <View style={styles.skeletonChoice}>
                      <View style={styles.skeletonEmoji} />
                      <View style={styles.skeletonText} />
                    </View>
                  </View>
                ) : (
                  // Show behavior-specific options or message
                  currentQ.answer_choices && currentQ.answer_choices.length > 0 ? (
                  currentQ.answer_choices.map((choice) => (
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
                  ))
                ) : (
                  <View style={styles.noOptionsContainer}>
                    <Text style={styles.noOptionsText}>
                      Please select a behavior on the first question to see relevant options.
                    </Text>
                  </View>
                )
              )
              ) : (
                                // Regular questions (not ABC questions)
                currentQ.answer_choices?.map((choice) => (
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
                                 ))
               )}
              
              {/* Shuffle button for ABC questions */}
              {(currentQ.id === 'whatHappenedBefore' || currentQ.id === 'whatHappenedAfter') && (
                <View style={styles.shuffleContainer}>
                  <TouchableOpacity
                    style={styles.shuffleButton}
                    onPress={() => handleShuffleOptions(currentQ.id)}
                  >
                    <Text style={styles.shuffleButtonText}>🔄 Shuffle options</Text>
                  </TouchableOpacity>
                  <Text style={styles.shuffleInfoText}>
                    Set {((optionSets[currentQ.id] || 0) + 1)} of {
                      (() => {
                        const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
                        const isCustomResponse = selectedAnswers['whatDidTheyDo']?.[0]?.isCustom;
                        const questionType = currentQ.id === 'whatHappenedBefore' ? 'antecedents' : 'consequences';
                        
                        if (isCustomResponse && gptSuggestions && !gptSuggestions.isFallback) {
                          return getTotalGPTSets(gptSuggestions, questionType);
                        } else {
                          return getTotalSets(selectedBehavior || '', questionType);
                        }
                      })()
                    }
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Comment functionality moved to header icon button */}

          {/* Add Modal for Other input */}
          <Modal
            visible={!!showOtherModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
              console.log('[DEBUG] Modal closed via onRequestClose.');
              // If input is empty, remove custom answer
              if (!otherText[currentQ.id]?.trim()) {
                setSelectedAnswers(prev => ({
                  ...prev,
                  [currentQ.id]: (prev[currentQ.id] || []).filter(a => !a.isCustom)
                }));
              }
              setShowOtherModal(null);
            }}
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
                          value={otherText[currentQ.id] !== undefined ? otherText[currentQ.id] : (showOtherModal.previousText || '')}
                          onChangeText={(text) => {
                            setOtherText(prev => ({
                              ...prev,
                              [currentQ.id]: text
                            }));
                          }}
                          autoFocus
                          maxLength={50}
                        />
                        
                        <View style={styles.modalButtons}>
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                              console.log('[DEBUG] Modal closed via Cancel button.');
                              // If input is empty, remove custom answer
                              if (!otherText[currentQ.id]?.trim()) {
                                setSelectedAnswers(prev => ({
                                  ...prev,
                                  [currentQ.id]: (prev[currentQ.id] || []).filter(a => !a.isCustom)
                                }));
                              }
                              setShowOtherModal(null);
                            }}
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
                        <Text style={styles.modalTitle}>Is this a challenge or win?</Text>
                        <Text style={styles.modalText}>{otherText[currentQ.id]}</Text>
                        
                        <View style={styles.sentimentButtons}>
                          <TouchableOpacity
                            style={[
                              styles.sentimentButton,
                              showOtherModal.sentiment === 'positive' && styles.selectedSentiment,
                              {backgroundColor: "lightgreen"}
                            ]}
                            onPress={() => setShowOtherModal(prev => prev ? { ...prev, sentiment: 'positive' } : null)}
                          >
                            <Text style={styles.sentimentButtonText}>🎉 Win</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.sentimentButton,
                              showOtherModal.sentiment === 'negative' && styles.selectedSentiment,
                              {backgroundColor: "orange"}
                            ]}
                            onPress={() => setShowOtherModal(prev => prev ? { ...prev, sentiment: 'negative' } : null)}
                          >
                            <Text style={styles.sentimentButtonText}>⚔️ Challenge</Text>
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
            {currentQuestion == 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (searchQuery) {
                    setSearchQuery('');
                  } else if (selectedCategory) {
                    setSelectedCategory(null);
                  } else {
                    navigation.goBack();
                  }
                }}
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
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCommentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.commentModalOverlay}
        >
          <View style={styles.commentModalContent}>
            <View style={styles.commentModalHeader}>
              <Text style={styles.commentModalTitle}>Add Comment <Text style={{color: "#666", fontSize: 14, fontStyle: 'italic', marginTop: 8, fontWeight: '400'}}>(optional)</Text></Text>
              
            </View>
            
            <TextInput
              style={styles.commentModalInput}
              placeholder="Add your comment here..."
              multiline
              value={comments[currentCommentQuestionId] || ''}
              onChangeText={(text) => setComments(prev => ({
                ...prev,
                [currentCommentQuestionId]: text
              }))}
              autoFocus
            />
            
            <View style={styles.commentModalButtons}>
              <TouchableOpacity
                style={[styles.commentModalButton, styles.commentModalCancelButton]}
                onPress={() => setShowCommentModal(false)}
              >
                <Text style={styles.commentModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.commentModalButton, styles.commentModalSaveButton]}
                onPress={() => setShowCommentModal(false)}
              >
                <Text style={[styles.commentModalButtonText, { color: 'white' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  progressRow: {
    position: 'relative',
    // marginBottom: 24,
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
    marginBottom: 20
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
  selectedAnswerContainer: {
    backgroundColor: '#E8F3F4',
    borderColor: '#5B9AA0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  selectedAnswerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B9AA0',
    marginBottom: 5,
  },
  nextHintText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  categorySelectedText: {
    fontSize: 18,
    color: '#5B9AA0',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  gptLoadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  gptBadge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#5B9AA0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  behaviorSpecificBadge: {
    fontSize: 12,
    marginLeft: 8,
  },
  shuffleButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  shuffleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  shuffleContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  shuffleInfoText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noOptionsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  skeletonContainer: {
    marginBottom: 10,
  },
  skeletonChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  skeletonEmoji: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    flex: 1,
  },

  commentIconButton: {
    position: 'absolute',
    right: 0,
    top: -5,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#5B9AA0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentIcon: {
    fontSize: 16,
    color: '#fff',
  },
  commentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#28a745',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  commentModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  commentModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  commentModalHeader: {
    marginBottom: 15,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  commentModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  commentModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentModalButton: {
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  commentModalCancelButton: {
    backgroundColor: '#c0c0c0',
  },
  commentModalSaveButton: {
    backgroundColor: '#5B9AA0',
  },
  commentModalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});