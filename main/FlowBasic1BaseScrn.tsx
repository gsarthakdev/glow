//@ts-ignore
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { flow_basic_1 } from '../flows/flow_basic_1';
import { flow_basic_1 as positive_flow_basic_1 } from '../flows/positive_flow_basic_1';
import MoodBubbleSlider from '../components/MoodBubbleSlider';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getABCForBehavior, trackGPTSuggestionUsage } from '../utils/gptService';
import { getShuffledOptions, getTotalSets, behaviorSpecificOptions } from '../flows/behaviorSpecificOptions';
import { getShuffledGPTOptions, getTotalGPTSets } from '../utils/gptService';

interface Category {
  key: string;
  label: string;
  emoji: string;
  sentiment?: string | null;
  choices: Array<{ label: string; emoji: string; sentiment?: string | null; isOther?: boolean }>;
  is_editable?: boolean;
}

interface Question {
  id: string;
  question: string;
  answer_choices?: Array<{ label: string; emoji: string; sentiment?: string | null }>;
  categories?: Category[];
  subheading?: string;
  is_editable?: boolean;
}

interface Answer {
  answer: string;
  isCustom: boolean;
  isFromCustomCategory?: boolean;
}

interface OtherModalState {
  isEditing: boolean;
  previousText?: string;
  // sentiment and step removed since sentiment selection is commented out
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

  // New state for custom options management
  const [customOptions, setCustomOptions] = useState<{ [questionId: string]: Array<{ 
    label: string; 
    emoji: string; 
    sentiment?: string | null; 
    category?: string; 
    gptGeneratedAntecedents?: Array<{ text: string; emoji: string }>; 
    gptGeneratedConsequences?: Array<{ text: string; emoji: string }>; 
  }> }>({});
  const [deletedOptions, setDeletedOptions] = useState<{ [questionId: string]: Set<string> }>({});
  
  // Debug useEffect to monitor deletedOptions changes
  useEffect(() => {
    console.log(`[DELETED_OPTIONS_STATE] deletedOptions state changed:`, deletedOptions);
    Object.keys(deletedOptions).forEach(questionId => {
      console.log(`[DELETED_OPTIONS_STATE] Question ${questionId} has ${deletedOptions[questionId].size} deleted options:`, Array.from(deletedOptions[questionId]));
    });
  }, [deletedOptions]);
  const [selectedBehaviorCategory, setSelectedBehaviorCategory] = useState<string | null>(null);
  const [showAddOptionModal, setShowAddOptionModal] = useState<{ questionId: string; isVisible: boolean }>({ questionId: '', isVisible: false });
  const [newOptionText, setNewOptionText] = useState('');
  const [newOptionEmoji, setNewOptionEmoji] = useState('🟦');
  // newOptionSentiment state removed since sentiment selection is commented out

  // Common emojis for users to choose from
  const commonEmojis = ['😊', '😢', '😠', '😴', '😰', '😤', '😭', '😌', '🤗', '😌', '🎉', '⚔️', '🚫', '⏰', '📱', '🧸', '🍽️', '🛏️', '👕', '🚪', '👥', '👫', '💬', '📖', '❓', '🙏', '🤝', '🔄', '⭐', '💡', '🧘', '👀', '💭', '📋', '🎯', '🛡️', '📍', '🌌', '🚧', '➡️', '👤', '📦', '❓'];

  // Edit mode support
  const route = useRoute<any>();
  const isEditMode = route.params?.mode === 'edit';
  const editLog: any = route.params?.editLog;
  const selectedDate = route.params?.selectedDate; // For past date logging

  // New state for edit mode toggle
  const [isCustomEditMode, setIsCustomEditMode] = useState(false);

  // State for comment button visibility
  const [isCommentButtonEnabled, setIsCommentButtonEnabled] = useState(true);

  // Add ref for ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadCurrentChild();
    loadCommentButtonSetting();
  }, []);

  // Load comment button setting from current child's data
  const loadCommentButtonSetting = async () => {
    try {
      const selectedChildJson = await AsyncStorage.getItem('current_selected_child');
      if (selectedChildJson) {
        const selected = JSON.parse(selectedChildJson);
        const childData = await AsyncStorage.getItem(selected.id);
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          // Get the is_comment_enabled field from the child's data
          const isCommentEnabled = parsedChildData.is_comment_enabled;
          console.log('[COMMENT] Setting comment enabled to:', isCommentEnabled, 'for child:', selected.child_name);
          setIsCommentButtonEnabled(isCommentEnabled === true);
        } else {
          // Default to true if child data not found
          setIsCommentButtonEnabled(true);
        }
      } else {
        // Default to true if no current child selected
        setIsCommentButtonEnabled(true);
      }
    } catch (error) {
      console.error('Error loading comment button setting:', error);
      // Default to true on error
      setIsCommentButtonEnabled(true);
    }
  };

  // Initialize flow after sentiment is determined
  useEffect(() => {
    if (flowSentiment) {
      const flow = flowSentiment === 'positive' ? positive_flow_basic_1 : flow_basic_1;
      setCurrentFlow(flow as Question[]);
      
      // If we already have a selected behavior, trigger the ABC population useEffect
      const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
      if (selectedBehavior) {
        console.log('[FLOW] Flow initialized with existing behavior, will trigger ABC population for:', selectedBehavior);
        // Force a small delay to ensure the flow is set, then trigger the population
        setTimeout(() => {
          // This will trigger the useEffect that populates ABC questions
          setOptionSets(prev => ({ ...prev }));
        }, 100);
      }
    }
  }, [flowSentiment, selectedAnswers]);

  // Inject behavior-specific options and GPT suggestions into the flow
  useEffect(() => {
    console.log('[FLOW] MAIN useEffect triggered. selectedAnswers:', selectedAnswers, 'gptSuggestions:', gptSuggestions, 'customOptions:', customOptions);
    console.log('[FLOW] customOptions keys:', Object.keys(customOptions));
    console.log('[FLOW] whatDidTheyDo custom options:', customOptions['whatDidTheyDo']);
    
    if (currentFlow.length > 0) {
      const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
      console.log('[FLOW] Selected behaviors:', selectedBehaviors.map(b => b.answer));
      if (selectedBehaviors.length === 0) {
        console.log('[FLOW] No selected behaviors found, returning early');
        return;
      }

      const updatedFlow = [...currentFlow];
      
      // Inject behavior-specific antecedents into whatHappenedBefore question
      const antecedentQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatHappenedBefore');
      console.log('[FLOW] Antecedent question index:', antecedentQuestionIndex);
      if (antecedentQuestionIndex !== -1) {
        const currentSet = optionSets['whatHappenedBefore'] || 0;
        
        // Use intelligent selection for multiple behaviors
        const antecedentChoices = getIntelligentAntecedentChoices(selectedBehaviors, 'whatHappenedBefore');
        
        const allAntecedentChoices = [
          ...antecedentChoices,
          { label: "Other", emoji: "➕", sentiment: null }
        ];
        console.log('[FLOW] All antecedent choices:', allAntecedentChoices);
        
        // Apply filtering and custom options
        const filteredAntecedentChoices = getFilteredOptions('whatHappenedBefore', allAntecedentChoices);
        
        updatedFlow[antecedentQuestionIndex] = {
          ...updatedFlow[antecedentQuestionIndex],
          answer_choices: filteredAntecedentChoices
        };
      }
      
      // Inject behavior-specific consequences into whatHappenedAfter question
      const consequenceQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatHappenedAfter');
      console.log('[FLOW] Consequence question index:', consequenceQuestionIndex);
      if (consequenceQuestionIndex !== -1) {
        const currentSet = optionSets['whatHappenedAfter'] || 0;
        
        // Use intelligent selection for multiple behaviors
        const consequenceChoices = getIntelligentConsequenceChoices(selectedBehaviors, 'whatHappenedAfter');
        
        const allConsequenceChoices = [
          ...consequenceChoices,
          { label: "Other", emoji: "➕", sentiment: null }
        ];
        console.log('[FLOW] All consequence choices:', allConsequenceChoices);
        
        // Apply filtering and custom options
        const filteredConsequenceChoices = getFilteredOptions('whatHappenedAfter', allConsequenceChoices);
        
        updatedFlow[consequenceQuestionIndex] = {
          ...updatedFlow[consequenceQuestionIndex],
          answer_choices: filteredConsequenceChoices
        };
      }
      
      console.log('[FLOW] Setting currentFlow with updated flow');
      setCurrentFlow(updatedFlow as Question[]);
    }
  }, [selectedAnswers, gptSuggestions, optionSets, customOptions, deletedOptions]);

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
        
        // Restore GPT suggestions if this was a log with "Other" response
        const isCustomResponse = editLog.responses?.whatDidTheyDo?.answers?.[0]?.isCustom;
        console.log('[EDIT] Checking for custom response:', isCustomResponse);
        
        if (isCustomResponse) {
          // Check for GPT data in the antecedent and consequence responses
          const antecedentGptData = editLog.responses?.whatHappenedBefore?.gptGenerated;
          const consequenceGptData = editLog.responses?.whatHappenedAfter?.gptGenerated;
          
          console.log('[EDIT] Found GPT data - antecedents:', antecedentGptData, 'consequences:', consequenceGptData);
          
          if (antecedentGptData || consequenceGptData) {
            const gptData = {
              antecedents: antecedentGptData || [],
              consequences: consequenceGptData || [],
              isFallback: false
            };
            setGptSuggestions(gptData);
            console.log('[EDIT] Restored GPT suggestions from log:', gptData);
            
            // Force flow re-population to show GPT options
            // Use a longer delay to ensure state updates are processed
            setTimeout(() => {
              console.log('[EDIT] Forcing flow re-population');
              setOptionSets(prev => ({ ...prev }));
            }, 200);
          } else {
            console.log('[EDIT] No GPT data found in log responses');
          }
        } else {
          console.log('[EDIT] Not a custom response, skipping GPT restoration');
        }
      }
    }
  }, [isEditMode, editLog, flowSentiment, currentFlow]);

  // Flatten all behavior choices across categories so we can quick-search
  const allBehaviorChoices = React.useMemo(() => {
    const firstQuestion = flow_basic_1[0];
    if (!firstQuestion.categories) return [];
    
    // Get base choices from the flow
    const baseChoices = firstQuestion.categories.flatMap(cat =>
      cat.choices.map(choice => ({ ...choice, categoryKey: cat.key }))
    );
    
    // Get custom options for the first question
    const customChoices = (customOptions['whatDidTheyDo'] || []).map(option => ({
      ...option,
      categoryKey: option.category || 'custom',
      isCustom: true
    }));
    
    // Combine base choices with custom choices, filtering out any that are deleted
    const deleted = deletedOptions['whatDidTheyDo'] || new Set();
    const filteredBaseChoices = baseChoices.filter(choice => !deleted.has(choice.label));
    
    // Combine and remove duplicates based on label, prioritizing custom options
    const combined = [...filteredBaseChoices, ...customChoices];
    const seen = new Set();
    const uniqueChoices = combined.filter(choice => {
      if (seen.has(choice.label)) {
        // If we've seen this label before, only keep it if the current one is custom
        return (choice as any).isCustom;
      }
      seen.add(choice.label);
      return true;
    });
    
    return uniqueChoices;
  }, [customOptions, deletedOptions]);

  const loadCurrentChild = async () => {
    try {
      const selectedChildJson = await AsyncStorage.getItem('current_selected_child');
      if (selectedChildJson) {
        const selected = JSON.parse(selectedChildJson);
        const childData = await AsyncStorage.getItem(selected.id);
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          setCurrentChild({ ...selected, data: parsedChildData });
          
          // Load custom options and deleted options from child data
          if (parsedChildData.custom_options) {
            setCustomOptions(parsedChildData.custom_options);
          }
          
          // Load deleted options from child data
          if (parsedChildData.deleted_options) {
            const converted: { [questionId: string]: Set<string> } = {};
            Object.keys(parsedChildData.deleted_options).forEach(key => {
              converted[key] = new Set(parsedChildData.deleted_options[key]);
            });
            setDeletedOptions(converted);
          }
          
          // Load comment button setting from child data
          const isCommentEnabled = parsedChildData.is_comment_enabled;
          console.log('[COMMENT] Loading comment enabled from child data:', isCommentEnabled, 'for child:', selected.child_name);
          setIsCommentButtonEnabled(isCommentEnabled === true);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading child:', error);
    }
  };

  // Function to reload custom options from AsyncStorage
  const reloadCustomOptions = useCallback(async () => {
    try {
      if (currentChild && currentChild.id) {
        const childData = await AsyncStorage.getItem(currentChild.id);
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          if (parsedChildData.custom_options) {
            console.log('[RELOAD] Reloading custom options:', parsedChildData.custom_options);
            setCustomOptions(parsedChildData.custom_options);
          }
        }
      }
    } catch (error) {
      console.error('Error reloading custom options:', error);
    }
  }, [currentChild]);

  // Reload custom options and comment button setting when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reloadCustomOptions();
      loadCommentButtonSetting();
    }, [reloadCustomOptions])
  );

  // Update "Your Pins" category when custom options change
  // Use timeout to ensure this runs after other flow updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentFlow.length > 0 && Object.keys(customOptions).length > 0) {
        const updatedFlow = [...currentFlow];
        const firstQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatDidTheyDo');
        
        if (firstQuestionIndex !== -1 && updatedFlow[firstQuestionIndex].categories) {
          const yourPinsCategoryIndex = updatedFlow[firstQuestionIndex].categories!.findIndex(cat => cat.key === 'yourPins');
          
          if (yourPinsCategoryIndex !== -1) {
            console.log('[YOUR_PINS] Updating Your Pins category with custom options');
            const customBehaviors = customOptions['whatDidTheyDo'] || [];
            
            // Check if custom options are already in the flow to prevent unnecessary updates
            const currentCustomChoices = updatedFlow[firstQuestionIndex].categories![yourPinsCategoryIndex].choices
              .filter((choice: any) => choice.isCustom);
            
            const needsUpdate = currentCustomChoices.length !== customBehaviors.length ||
              customBehaviors.some(behavior => !currentCustomChoices.some((choice: any) => choice.label === behavior.label));
            
            if (needsUpdate) {
              // Create choices from all custom behaviors
              const customChoices = customBehaviors.map(option => {
                const choice = {
                  ...option, // Spread original properties
                  sentiment: option.sentiment || 'negative', // Ensure sentiment is set
                  isCustom: true // Override to ensure isCustom is always true
                };
                console.log('[YOUR_PINS] Creating choice from option:', option);
                console.log('[YOUR_PINS] Final choice object:', choice);
                return choice;
              });
              
              // Update the "Your Pins" category (no "Other" option needed)
              updatedFlow[firstQuestionIndex].categories![yourPinsCategoryIndex] = {
                ...updatedFlow[firstQuestionIndex].categories![yourPinsCategoryIndex],
                choices: customChoices
              };
              
              setCurrentFlow(updatedFlow as Question[]);
              console.log('[YOUR_PINS] Updated Your Pins category with', customBehaviors.length, 'custom options');
              console.log('[YOUR_PINS] Final choices in Your Pins:', updatedFlow[firstQuestionIndex].categories![yourPinsCategoryIndex].choices);
              console.log('[YOUR_PINS] Checking isCustom properties:');
              updatedFlow[firstQuestionIndex].categories![yourPinsCategoryIndex].choices.forEach((choice: any, index: number) => {
                console.log(`[YOUR_PINS] Choice ${index}:`, { 
                  label: choice.label, 
                  isCustom: choice.isCustom, 
                  isOther: choice.isOther,
                  allProps: Object.keys(choice)
                });
              });
            }
          }
        }
      }
    }, 50); // Small delay to ensure other useEffects run first
    
    return () => clearTimeout(timeoutId);
  }, [customOptions, selectedAnswers]); // Also depend on selectedAnswers to re-run after selections

  const handleAnswer = (questionId: string, answer: { label: string; emoji: string; sentiment?: string | null }) => {
    console.log('[DEBUG] handleAnswer called with:', { questionId, answer });
    console.log('[DEBUG] answer.label:', answer.label);
    console.log('[DEBUG] answer properties:', Object.keys(answer));
    console.log('[DEBUG] isOther?', (answer as any).isOther);
    console.log('[DEBUG] isCustom?', (answer as any).isCustom);
    
    // Handle "Other" option first
    if (answer.label === 'Other') {
      const customAnswer = selectedAnswers[questionId]?.find(a => a.isCustom);
      if (customAnswer) {
        // Already has custom text, show edit/deselect modal
        console.log('[DEBUG] Opening Other modal for edit. previousText:', customAnswer.answer);
        setShowOtherModal({ 
          isEditing: false, 
          previousText: customAnswer.answer
        });
      } else {
        // New "Other" entry - only for first question, we need sentiment selection
        if (questionId === 'whatDidTheyDo') {
          console.log('[DEBUG] Opening Other modal for new entry (whatDidTheyDo). previousText:', otherText[questionId]);
          setShowOtherModal({ 
            isEditing: true,
            previousText: otherText[questionId]  // Will be undefined for first time
          });
        } else {
          console.log('[DEBUG] Opening Other modal for new entry. previousText:', otherText[questionId]);
          setShowOtherModal({ 
            isEditing: true,
            previousText: otherText[questionId]  // Will be undefined for first time
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
        // trackGPTSuggestionUsage(selectedBehavior, suggestionType, answer.label);
      }
    }

    // Track behavior-specific option usage
    if ((answer as any).isBehaviorSpecific) {
      const selectedBehavior = selectedAnswers['whatDidTheyDo']?.[0]?.answer;
      if (selectedBehavior) {
        const suggestionType = questionId === 'whatHappenedBefore' ? 'antecedent' : 'consequence';
        // trackGPTSuggestionUsage(selectedBehavior, suggestionType, answer.label);
      }
    }

    // Process answer selection - handle multi-select for first question
    setSelectedAnswers(prev => {
      const answerText = answer.label;
      const current = prev[questionId] || [];
      
      // For the first question, implement multi-select (max 3 behaviors)
      if (questionId === 'whatDidTheyDo') {
        const existingIndex = current.findIndex(a => a.answer === answerText);
        
        if (existingIndex >= 0) {
          // Remove if already selected (toggle behavior)
        return {
          ...prev,
            [questionId]: current.filter((_, i) => i !== existingIndex)
          };
        } else {
          // Add if not selected, but limit to max 3 behaviors
          if (current.length >= 3) {
            // Replace the last selected behavior with the new one
            const updated = [...current.slice(0, 2), { 
              answer: answerText, 
              isCustom: (answer as any).isCustom || false,
              isFromCustomCategory: (answer as any).isCustom || false // Mark custom options from categories
            }];
            return {
              ...prev,
              [questionId]: updated
            };
          } else {
            // Add new behavior
            return {
              ...prev,
              [questionId]: [...current, { 
                answer: answerText, 
                isCustom: (answer as any).isCustom || false,
                isFromCustomCategory: (answer as any).isCustom || false // Mark custom options from categories
              }]
            };
          }
        }
      }

      // For other questions, toggle the selection (existing logic)
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
    
    // If this was a behavior selection, immediately populate ABC questions
    if (questionId === 'whatDidTheyDo' && currentFlow.length > 0) {
      const selectedBehaviors = selectedAnswers[questionId] || [];
      console.log('[FLOW] Behaviors selected, immediately populating ABC questions for:', selectedBehaviors.map(b => b.answer));
      
      // Set flow sentiment for custom behaviors (use first custom behavior's sentiment, or default to negative)
      const hasCustomBehavior = selectedBehaviors.some(b => b.isCustom);
      if (hasCustomBehavior) {
        setFlowSentiment('negative');
      }
      
      // Force immediate population of ABC questions
      const updatedFlow = [...currentFlow];
      
      // Populate antecedents with intelligent selection
      const antecedentQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatHappenedBefore');
      if (antecedentQuestionIndex !== -1) {
        const antecedentChoices = getIntelligentAntecedentChoices(selectedBehaviors, 'whatHappenedBefore');
        
        const allAntecedentChoices = [
          ...antecedentChoices,
          { label: "Other", emoji: "➕", sentiment: null }
        ];
        
        updatedFlow[antecedentQuestionIndex] = {
          ...updatedFlow[antecedentQuestionIndex],
          answer_choices: allAntecedentChoices
        };
      }
      
      // Populate consequences with intelligent selection
      const consequenceQuestionIndex = updatedFlow.findIndex(q => q.id === 'whatHappenedAfter');
      if (consequenceQuestionIndex !== -1) {
        const consequenceChoices = getIntelligentConsequenceChoices(selectedBehaviors, 'whatHappenedAfter');
        
        const allConsequenceChoices = [
          ...consequenceChoices,
          { label: "Other", emoji: "➕", sentiment: null }
        ];
        
        updatedFlow[consequenceQuestionIndex] = {
          ...updatedFlow[consequenceQuestionIndex],
          answer_choices: allConsequenceChoices
        };
      }
      
      setCurrentFlow(updatedFlow as Question[]);
    }
  };

  // Add new handleOtherSubmit function
  const handleOtherSubmit = () => {
    console.log('[DEBUG] handleOtherSubmit called. showOtherModal:', showOtherModal, 'otherText:', otherText);
    if (!showOtherModal?.isEditing) return;

    // Sentiment selection UI has been commented out - using 'negative' as default
    if (!otherText[currentQ.id]?.trim()) {
      // If input is empty, remove custom answer
      console.log('[DEBUG] Empty text, removing custom answer for:', currentQ.id);
      setSelectedAnswers(prev => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || []).filter(a => !a.isCustom)
      }));
      setShowOtherModal(null);
      return;
    }

    // Add the "Other" option to existing answers (multi-select support)
    console.log('[DEBUG] Adding "Other" answer for:', currentQ.id, 'text:', otherText[currentQ.id]);
    setSelectedAnswers(prev => {
      const existingAnswers = prev[currentQ.id] || [];
      const otherAnswer = { answer: otherText[currentQ.id], isCustom: true };
      
      // Check if this "Other" option is already selected
      const isAlreadySelected = existingAnswers.some(a => a.answer === otherText[currentQ.id]);
      if (isAlreadySelected) {
        console.log('[DEBUG] "Other" option already selected, no change needed');
        return prev;
      }
      
      // Check if we've reached the maximum of 3 behaviors
      if (existingAnswers.length >= 3) {
        console.log('[DEBUG] Maximum 3 behaviors reached, replacing last one with "Other"');
        const newAnswers = existingAnswers.slice(0, 2); // Keep first 2
        newAnswers.push(otherAnswer); // Add "Other" as 3rd
        return {
          ...prev,
          [currentQ.id]: newAnswers
        };
      }
      
      // Add "Other" option to existing answers
      const newState = {
        ...prev,
        [currentQ.id]: [...existingAnswers, otherAnswer]
      };
      console.log('[DEBUG] New selectedAnswers state:', newState);
      return newState;
    });
    
    // For the first question, set the flow sentiment to 'negative' (default)
    if (currentQ.id === 'whatDidTheyDo') {
      console.log('[DEBUG] Setting flow sentiment to: negative (default)');
      setFlowSentiment('negative');
      
      // Call GPT for the first question to get ABC suggestions
      const customBehavior = otherText[currentQ.id];
      console.log('[GPT] About to call getABCForBehavior with behavior:', customBehavior);
      if (customBehavior) {
        // For "Other" options on the first question, we don't add them to permanent custom options
        // They are only temporary for this session. Just call GPT to get suggestions.
        
        setIsLoadingGpt(true);
        console.log('[GPT] Setting isLoadingGpt to true');
        getABCForBehavior(customBehavior)
          .then(suggestions => {
            console.log('[GPT] Successfully got suggestions:', suggestions);
            setGptSuggestions(suggestions);
            console.log('[GPT] Set gptSuggestions state to:', suggestions);
            
            // GPT suggestions are stored in gptSuggestions state for temporary use
            // No need to update custom options since "Other" options are not permanent
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
    }
    
    setShowOtherModal(null);
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
      previousText: selectedAnswers[currentQ.id]?.find(a => a.isCustom)?.answer
      // Sentiment and step removed since sentiment selection is commented out
    });
  };

  // handleNextStep function removed - no longer needed since sentiment selection is commented out

  const handleShuffleOptions = (questionId: string) => {
    const currentSet = optionSets[questionId] || 0;
    const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
    if (selectedBehaviors.length === 0) return;
    let totalSets = 1;
    if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
      totalSets = 5;
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

  // New functions for custom options management
  const handleDeleteOption = async (questionId: string, optionLabel: string) => {
    console.log(`[DELETE] ===== STARTING DELETE PROCESS =====`);
    console.log(`[DELETE] Function called with questionId: "${questionId}", optionLabel: "${optionLabel}"`);
    console.log(`[DELETE] Current deletedOptions state:`, deletedOptions);
    console.log(`[DELETE] Current customOptions state:`, customOptions);
    console.log(`[DELETE] Current selectedAnswers:`, selectedAnswers);
    console.log(`[DELETE] Current currentChild:`, currentChild);
    
    try {
      // Add the option to deletedOptions so it gets filtered out
      console.log(`[DELETE] Step 1: Adding option to deletedOptions state`);
      const updatedDeleted = { ...deletedOptions };
      console.log(`[DELETE] updatedDeleted before modification:`, updatedDeleted);
      
      if (!updatedDeleted[questionId]) {
        console.log(`[DELETE] Creating new Set for questionId: ${questionId}`);
        updatedDeleted[questionId] = new Set();
      } else {
        console.log(`[DELETE] Existing Set for questionId: ${questionId} has ${updatedDeleted[questionId].size} items`);
      }
      
      console.log(`[DELETE] Adding "${optionLabel}" to deletedOptions[${questionId}]`);
      updatedDeleted[questionId].add(optionLabel);
      console.log(`[DELETE] updatedDeleted after adding option:`, updatedDeleted);
      console.log(`[DELETE] Set now has ${updatedDeleted[questionId].size} items:`, Array.from(updatedDeleted[questionId]));
      
      console.log(`[DELETE] Step 2: Calling setDeletedOptions with updated state`);
      setDeletedOptions(updatedDeleted);
      console.log(`[DELETE] setDeletedOptions called successfully`);
      
      // Save deleted options to AsyncStorage
      console.log(`[DELETE] Step 3: Saving to AsyncStorage`);
      if (currentChild?.id) {
        console.log(`[DELETE] currentChild.id exists: ${currentChild.id}`);
        const childData = await AsyncStorage.getItem(currentChild.id);
        console.log(`[DELETE] Retrieved childData from AsyncStorage:`, childData ? 'exists' : 'null');
        
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          console.log(`[DELETE] Parsed childData:`, parsedChildData);
          
          const deletedOptionsForStorage = { ...parsedChildData.deleted_options || {} };
          console.log(`[DELETE] deletedOptionsForStorage before modification:`, deletedOptionsForStorage);
          
          if (!deletedOptionsForStorage[questionId]) {
            console.log(`[DELETE] Creating new array for questionId: ${questionId}`);
            deletedOptionsForStorage[questionId] = [];
          } else {
            console.log(`[DELETE] Existing array for questionId: ${questionId} has ${deletedOptionsForStorage[questionId].length} items`);
          }
          
          if (!deletedOptionsForStorage[questionId].includes(optionLabel)) {
            console.log(`[DELETE] Adding "${optionLabel}" to storage array`);
            deletedOptionsForStorage[questionId].push(optionLabel);
          } else {
            console.log(`[DELETE] Option "${optionLabel}" already exists in storage array`);
          }
          
          console.log(`[DELETE] deletedOptionsForStorage after modification:`, deletedOptionsForStorage);
          
          const updatedChildData = {
            ...parsedChildData,
            deleted_options: deletedOptionsForStorage
          };
          console.log(`[DELETE] Saving updated childData to AsyncStorage`);
          await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
          console.log(`[DELETE] AsyncStorage save completed`);
        } else {
          console.log(`[DELETE] No childData found in AsyncStorage`);
        }
      } else {
        console.log(`[DELETE] No currentChild.id available`);
      }
      
      // Handle deleting GPT-generated options from custom behavior options
      console.log(`[DELETE] Step 4: Handling GPT-generated options`);
      if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
        console.log(`[DELETE] This is an ABC question, checking for GPT options`);
        const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
        console.log(`[DELETE] selectedBehaviors:`, selectedBehaviors);
        
        if (selectedBehaviors.length > 0) {
          const primaryBehavior = selectedBehaviors[0];
          console.log(`[DELETE] primaryBehavior:`, primaryBehavior);
          
          const behaviorOption = customOptions['whatDidTheyDo']?.find(opt => opt.label === primaryBehavior.answer);
          console.log(`[DELETE] behaviorOption found:`, behaviorOption ? 'yes' : 'no');
          
          if (behaviorOption) {
            console.log(`[DELETE] behaviorOption details:`, behaviorOption);
            
            // Check if this option was originally a GPT-generated option
            if (questionId === 'whatHappenedBefore' && behaviorOption.gptGeneratedAntecedents) {
              console.log(`[DELETE] Checking antecedents for GPT option`);
              const originalAntecedent = behaviorOption.gptGeneratedAntecedents.find(ant => ant.text === optionLabel);
              console.log(`[DELETE] originalAntecedent found:`, originalAntecedent ? 'yes' : 'no');
              
              if (!originalAntecedent) {
                console.log(`[DELETE] Option was deleted from GPT data, restoring it`);
                const updatedCustom = { ...customOptions };
                const behaviorOptionIndex = updatedCustom['whatDidTheyDo']?.findIndex(opt => opt.label === primaryBehavior.answer);
                console.log(`[DELETE] behaviorOptionIndex:`, behaviorOptionIndex);
                
                if (behaviorOptionIndex !== undefined && behaviorOptionIndex !== -1) {
                  updatedCustom['whatDidTheyDo'][behaviorOptionIndex] = {
                    ...behaviorOption,
                    gptGeneratedAntecedents: [
                      ...behaviorOption.gptGeneratedAntecedents,
                      { text: optionLabel, emoji: '🔄' } // Default emoji for restored option
                    ]
                  };
                  console.log(`[DELETE] Updating customOptions with restored antecedent`);
                  setCustomOptions(updatedCustom);
                }
              }
            } else if (questionId === 'whatHappenedAfter' && behaviorOption.gptGeneratedConsequences) {
              console.log(`[DELETE] Checking consequences for GPT option`);
              const originalConsequence = behaviorOption.gptGeneratedConsequences.find(con => con.text === optionLabel);
              console.log(`[DELETE] originalConsequence found:`, originalConsequence ? 'yes' : 'no');
              
              if (!originalConsequence) {
                console.log(`[DELETE] Option was deleted from GPT data, restoring it`);
                const updatedCustom = { ...customOptions };
                const behaviorOptionIndex = updatedCustom['whatDidTheyDo']?.findIndex(opt => opt.label === primaryBehavior.answer);
                console.log(`[DELETE] behaviorOptionIndex:`, behaviorOptionIndex);
                
                if (behaviorOptionIndex !== undefined && behaviorOptionIndex !== -1) {
                  updatedCustom['whatDidTheyDo'][behaviorOptionIndex] = {
                    ...behaviorOption,
                    gptGeneratedConsequences: [
                      ...behaviorOption.gptGeneratedConsequences,
                      { text: optionLabel, emoji: '🔄' } // Default emoji for restored option
                    ]
                  };
                  console.log(`[DELETE] Updating customOptions with restored consequence`);
                  setCustomOptions(updatedCustom);
                }
              }
            }
          }
        }
      } else {
        console.log(`[DELETE] This is not an ABC question, skipping GPT handling`);
      }
      
      console.log(`[DELETE] ===== DELETE PROCESS COMPLETED SUCCESSFULLY =====`);
    } catch (error) {
      console.error(`[DELETE] ===== ERROR IN DELETE PROCESS =====`);
      console.error('[DELETE] Error details:', error);
      console.error('[DELETE] Error stack:', (error as Error).stack);
    }
  };

    const handleAddOption = async () => {
    if (!newOptionText.trim() || !showAddOptionModal.questionId) return;
    
    // Using 'negative' as default sentiment for all questions
    // Sentiment selection UI has been commented out
    
    try {
      const questionId = showAddOptionModal.questionId;
      
      // Generate appropriate emoji based on question type and text content
      let generatedEmoji = '🟦'; // Default fallback
      // if (questionId === 'whatHappenedBefore') {
      //   generatedEmoji = getAntecedentEmoji(newOptionText.trim());
      // } else if (questionId === 'whatHappenedAfter') {
      //   generatedEmoji = getConsequenceEmoji(newOptionText.trim());
      // }
      generatedEmoji = getAntecedentEmoji(newOptionText.trim());
      
      const newOption: {
        label: string;
        emoji: string;
        sentiment: 'positive' | 'negative' | null;
        category?: string;
        gptGeneratedAntecedents?: Array<{ text: string; emoji: string }>;
        gptGeneratedConsequences?: Array<{ text: string; emoji: string }>;
      } = {
        label: newOptionText.trim(),
        emoji: generatedEmoji,
        sentiment: 'negative', // Default sentiment since UI is commented out
        category: selectedBehaviorCategory || undefined, // Associate with the selected category
        // GPT data will be populated asynchronously in the background
      };
      
      // Generate GPT antecedents and consequences for this custom option
      if (questionId === 'whatDidTheyDo') {
        // Close modal immediately for better UX, then generate GPT in background
        console.log('[CUSTOM_OPTION] Will generate GPT data in background for:', newOptionText.trim());
        
        // Generate GPT data asynchronously after modal closes
        setTimeout(async () => {
          try {
            setIsLoadingGpt(true);
            const gptSuggestions = await getABCForBehavior(newOptionText.trim());
            
            if (gptSuggestions && !gptSuggestions.isFallback) {
              // Update the custom option with GPT data
              const updatedCustom = { ...customOptions };
              const optionIndex = updatedCustom[questionId]?.findIndex(opt => opt.label === newOptionText.trim());
              
              if (optionIndex !== undefined && optionIndex !== -1) {
                updatedCustom[questionId][optionIndex].gptGeneratedAntecedents = gptSuggestions.antecedents || [];
                updatedCustom[questionId][optionIndex].gptGeneratedConsequences = gptSuggestions.consequences || [];
                
                setCustomOptions(updatedCustom);
                
                // Save updated data to AsyncStorage
                if (currentChild && currentChild.id) {
                  const childData = await AsyncStorage.getItem(currentChild.id);
                  if (childData) {
                    const parsedChildData = JSON.parse(childData);
                    const updatedChildData = {
                      ...parsedChildData,
                      custom_options: updatedCustom
                    };
                    await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
                    
                    // Update currentChild state to keep it in sync
                    setCurrentChild((prev: any) => prev ? { ...prev, data: updatedChildData } : null);
                  }
                }
                
                console.log('[CUSTOM_OPTION] Generated GPT data for:', newOptionText.trim());
                console.log('[CUSTOM_OPTION] Antecedents count:', gptSuggestions.antecedents?.length || 0);
                console.log('[CUSTOM_OPTION] Consequences count:', gptSuggestions.consequences?.length || 0);
                console.log('[CUSTOM_OPTION] First few antecedents:', gptSuggestions.antecedents?.slice(0, 3).map(a => a.text));
                console.log('[CUSTOM_OPTION] First few consequences:', gptSuggestions.consequences?.slice(0, 3).map(a => a.text));
              }
            } else {
              console.log('[CUSTOM_OPTION] No GPT suggestions generated or fallback used');
            }
          } catch (error) {
            console.error('[CUSTOM_OPTION] Failed to generate GPT data:', error);
          } finally {
            setIsLoadingGpt(false);
          }
        }, 100); // Small delay to ensure modal closes first
      }
      
      const updatedCustom = { ...customOptions };
      if (!updatedCustom[questionId]) {
        updatedCustom[questionId] = [];
      }
      
      // Check if this option already exists (prevent duplicates)
      const existingOption = updatedCustom[questionId].find(opt => opt.label === newOption.label);
      if (existingOption) {
        Alert.alert("Duplicate option", "This option already exists for the question. Please add a different option or delete the existing one.");
        console.warn(`[ADD] Custom option "${newOption.label}" already exists for ${questionId}, skipping duplicate`);
        return;
      }
      
      updatedCustom[questionId].push(newOption);
      setCustomOptions(updatedCustom);
      
      // AUTO-SELECT: For ABC questions (whatHappenedBefore/whatHappenedAfter) and the first question (whatDidTheyDo),
      // automatically select the newly added custom option
      if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter' || questionId === 'whatDidTheyDo') {
        console.log(`[AUTO-SELECT] Auto-selecting newly added custom option: "${newOptionText.trim()}" for ${questionId}`);
        
        // Replace any existing selections with the new custom option
        // Use isCustom: false since this is a predefined option in the list, not text entered via "Other"
        setSelectedAnswers(prev => ({
          ...prev,
          [questionId]: [{ answer: newOptionText.trim(), isCustom: false }]
        }));
        
        // SPECIAL HANDLING FOR FIRST QUESTION: If this is the first question (whatDidTheyDo),
        // we also need to set the flow sentiment to 'negative' (default)
        if (questionId === 'whatDidTheyDo') {
          console.log(`[AUTO-SELECT] Setting flow sentiment to: negative (default) for custom behavior`);
          setFlowSentiment('negative');
        }
      }
      
      // Save to child's data in AsyncStorage
      if (currentChild && currentChild.id) {
        const childData = await AsyncStorage.getItem(currentChild.id);
        if (childData) {
          const parsedChildData = JSON.parse(childData);
          const updatedChildData = {
            ...parsedChildData,
            custom_options: updatedCustom
          };
          await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
          
          // Update currentChild state to keep it in sync
          setCurrentChild((prev: any) => prev ? { ...prev, data: updatedChildData } : null);
        }
      }
      
        // Force a flow update to immediately show the new option
        // This triggers the useEffect that calls getFilteredOptions
        if (currentFlow.length > 0) {
          const updatedFlow = [...currentFlow];
          
          // Update the specific question that had the option added
          const questionIndex = updatedFlow.findIndex(q => q.id === questionId);
          if (questionIndex !== -1) {
            if (questionId === 'whatDidTheyDo' && updatedFlow[questionIndex].categories) {
              // For the main behavior question, update all categories
              updatedFlow[questionIndex] = {
                ...updatedFlow[questionIndex],
                categories: updatedFlow[questionIndex].categories!.map(cat => ({
                  ...cat,
                  choices: getFilteredOptions(questionId, cat.choices)
                }))
              };
            } else if (updatedFlow[questionIndex].answer_choices) {
              // For other questions, update answer choices
              updatedFlow[questionIndex] = {
                ...updatedFlow[questionIndex],
                answer_choices: getFilteredOptions(questionId, updatedFlow[questionIndex].answer_choices!)
              };
            }
          }
          
          // For ABC questions, reset to set 0 so custom options are immediately visible
          if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
            setOptionSets(prev => ({
              ...prev,
              [questionId]: 0
            }));
          }
          
          setCurrentFlow(updatedFlow as Question[]);
        }
      
      // Reset form
      setNewOptionText('');
      setNewOptionEmoji('🟦'); // Reset to default for next use
      setShowAddOptionModal({ questionId: '', isVisible: false });
    } catch (error) {
      console.error('Error adding option:', error);
    }
  };

  const openAddOptionModal = (questionId: string) => {
    setShowAddOptionModal({ questionId, isVisible: true });
    setNewOptionText('');
    setNewOptionEmoji('🟦'); // This will be overridden by generated emoji in handleAddOption
  };

  const closeAddOptionModal = () => {
    setShowAddOptionModal({ questionId: '', isVisible: false });
    setNewOptionText('');
    setNewOptionEmoji('🟦'); // This will be overridden by generated emoji in handleAddOption
  };

  // Function to restore deleted options
  const handleRestoreOption = async (questionId: string, optionLabel: string) => {
    try {
      const updatedDeleted = { ...deletedOptions };
      if (updatedDeleted[questionId]) {
        updatedDeleted[questionId].delete(optionLabel);
        if (updatedDeleted[questionId].size === 0) {
          delete updatedDeleted[questionId];
        }
        setDeletedOptions(updatedDeleted);
        
        // Handle restoring GPT-generated options to custom behavior options
        if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
          const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
          if (selectedBehaviors.length > 0 && customOptions['whatDidTheyDo']) {
            // Check all selected behaviors for GPT data
            for (const behavior of selectedBehaviors) {
              const behaviorOptionIndex = customOptions['whatDidTheyDo'].findIndex(opt => opt.label === behavior.answer);
            if (behaviorOptionIndex !== -1) {
              const behaviorOption = customOptions['whatDidTheyDo'][behaviorOptionIndex];
              
              // Check if this option was originally a GPT-generated option
              if (questionId === 'whatHappenedBefore' && behaviorOption.gptGeneratedAntecedents) {
                // Check if this option exists in the original GPT data (it might have been deleted)
                const originalAntecedent = behaviorOption.gptGeneratedAntecedents.find(ant => ant.text === optionLabel);
                if (!originalAntecedent) {
                  // This option was deleted from GPT data, we need to restore it
                  // For now, we'll add it back with a default emoji since we don't have the original
                  const updatedCustom = { ...customOptions };
                  updatedCustom['whatDidTheyDo'][behaviorOptionIndex] = {
                    ...behaviorOption,
                    gptGeneratedAntecedents: [
                      ...behaviorOption.gptGeneratedAntecedents,
                      { text: optionLabel, emoji: '🔄' } // Default emoji for restored option
                    ]
                  };
                  setCustomOptions(updatedCustom);
                  
                  // Save updated custom options to AsyncStorage
                  if (currentChild && currentChild.id) {
                    const childData = await AsyncStorage.getItem(currentChild.id);
                    if (childData) {
                      const parsedChildData = JSON.parse(childData);
                      const updatedChildData = {
                        ...parsedChildData,
                        custom_options: updatedCustom
                      };
                      await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
                      
                      // Update currentChild state to keep it in sync
                      setCurrentChild((prev: any) => prev ? { ...prev, data: updatedChildData } : null);
                    }
                  }
                }
              } else if (questionId === 'whatHappenedAfter' && behaviorOption.gptGeneratedConsequences) {
                // Check if this option was originally a GPT-generated option
                const originalConsequence = behaviorOption.gptGeneratedConsequences.find(con => con.text === optionLabel);
                if (!originalConsequence) {
                  // This option was deleted from GPT data, we need to restore it
                  const updatedCustom = { ...customOptions };
                  updatedCustom['whatDidTheyDo'][behaviorOptionIndex] = {
                    ...behaviorOption,
                    gptGeneratedConsequences: [
                      ...behaviorOption.gptGeneratedConsequences,
                      { text: optionLabel, emoji: '🔄' } // Default emoji for restored option
                    ]
                  };
                  setCustomOptions(updatedCustom);
                  
                  // Save updated custom options to AsyncStorage
                  if (currentChild && currentChild.id) {
                    const childData = await AsyncStorage.getItem(currentChild.id);
                    if (childData) {
                      const parsedChildData = JSON.parse(childData);
                      const updatedChildData = {
                        ...parsedChildData,
                        custom_options: updatedCustom
                      };
                      await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
                      
                      // Update currentChild state to keep it in sync
                      setCurrentChild((prev: any) => prev ? { ...prev, data: updatedChildData } : null);
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        // Save to child's data in AsyncStorage
        if (currentChild && currentChild.id) {
          const childData = await AsyncStorage.getItem(currentChild.id);
          if (childData) {
            const parsedChildData = JSON.parse(childData);
            const updatedChildData = {
              ...parsedChildData,
              deleted_options: Object.keys(updatedDeleted).reduce((acc, key) => {
                acc[key] = Array.from(updatedDeleted[key]);
                return acc;
              }, {} as { [key: string]: string[] })
            };
            await AsyncStorage.setItem(currentChild.id, JSON.stringify(updatedChildData));
            
            // Update currentChild state to keep it in sync
            setCurrentChild((prev: any) => prev ? { ...prev, data: updatedChildData } : null);
          }
        }
        
          // Force a flow update to immediately reflect the restored option
          if (currentFlow.length > 0) {
            const updatedFlow = [...currentFlow];
            const questionIndex = updatedFlow.findIndex(q => q.id === questionId);
            if (questionIndex !== -1) {
              if (questionId === 'whatDidTheyDo' && updatedFlow[questionIndex].categories) {
                // For the main behavior question, update all categories
                updatedFlow[questionIndex] = {
                  ...updatedFlow[questionIndex],
                  categories: updatedFlow[questionIndex].categories!.map(cat => ({
                    ...cat,
                    choices: getFilteredOptions(questionId, cat.choices)
                  }))
                };
              } else if (updatedFlow[questionIndex].answer_choices) {
                // For other questions, update answer choices
                updatedFlow[questionIndex] = {
                  ...updatedFlow[questionIndex],
                  answer_choices: getFilteredOptions(questionId, updatedFlow[questionIndex].answer_choices!)
                };
              }
            }
            
            // For ABC questions, reset to set 0 so changes are immediately visible
            if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
              setOptionSets(prev => ({
                ...prev,
                [questionId]: 0
              }));
            }
            
            setCurrentFlow(updatedFlow as Question[]);
          }
      }
    } catch (error) {
      console.error('Error restoring option:', error);
    }
  };

  // Helper function to get filtered and merged options for a question
  // Helper function to get filtered and merged options for a question
  // For antecedent/consequence questions, if GPT is used, show 65% GPT options and 35% hardcoded options
  const getFilteredOptions = (questionId: string, originalChoices: Array<{ label: string; emoji: string; sentiment?: string | null }>) => {
    console.log(`[FILTER] getFilteredOptions called for ${questionId}`);
    console.log(`[FILTER] originalChoices:`, originalChoices);
    if (questionId === 'whatDidTheyDo') {
      console.log(`[FILTER] Processing whatDidTheyDo - checking for isCustom properties:`);
      originalChoices.forEach((choice, index) => {
        console.log(`[FILTER] Choice ${index}:`, { 
          label: choice.label, 
          isCustom: (choice as any).isCustom, 
          isOther: (choice as any).isOther,
          allProps: Object.keys(choice)
        });
      });
    }
    if ((questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') && gptSuggestions && !gptSuggestions.isFallback) {
      const gptOptions = (questionId === 'whatHappenedBefore')
        ? (gptSuggestions.antecedents || []).map(opt => ({ label: opt.text, emoji: opt.emoji, isGptGenerated: true }))
        : (gptSuggestions.consequences || []).map(opt => ({ label: opt.text, emoji: opt.emoji, isGptGenerated: true }));
      const hardcodedOptions = originalChoices.filter(opt => !gptOptions.some(g => g.label === opt.label && opt.label !== 'Other'));
      // Remove 'Other' from gptOptions if present
      const filteredGptOptions = gptOptions.filter(opt => opt.label !== 'Other');
      const filteredHardcodedOptions = hardcodedOptions.filter(opt => opt.label !== 'Other');
      const allOptions = [...filteredGptOptions, ...filteredHardcodedOptions];
      const optionsPerSet = 5;
      const currentSet = optionSets[questionId] || 0;
      // Calculate split for this set
      const gptCount = Math.round(optionsPerSet * 0.65);
      const hardcodedCount = optionsPerSet - gptCount;
      const gptStart = currentSet * gptCount;
      const hardcodedStart = currentSet * hardcodedCount;
      const gptSlice = filteredGptOptions.slice(gptStart, gptStart + gptCount);
      const hardcodedSlice = filteredHardcodedOptions.slice(hardcodedStart, hardcodedStart + hardcodedCount);
      // Always add 'Other' option at the end
      const otherOption = originalChoices.find(opt => opt.label === 'Other');
      return [
        ...gptSlice,
        ...hardcodedSlice,
        ...(otherOption ? [otherOption] : [])
      ];
    }
    let deleted = deletedOptions[questionId] || new Set();
    const custom = customOptions[questionId] || [];
    
    console.log(`[FILTER] getFilteredOptions called for ${questionId}`);
    console.log(`[FILTER] Original choices count: ${originalChoices.length}`);
    console.log(`[FILTER] Custom options count: ${custom.length}`);
    console.log(`[FILTER] Custom options for ${questionId}:`, custom.map(opt => ({ label: opt.label, category: opt.category })));
    console.log(`[FILTER] Selected behavior category: ${selectedBehaviorCategory}`);
    console.log(`[FILTER] Deleted options count: ${deleted.size}`);
    
    // For ABC questions, also check if we need to sync deleted options from custom behavior options
    if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
      const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
      if (selectedBehaviors.length > 0 && customOptions['whatDidTheyDo']) {
        // Check primary behavior first for GPT data
        const primaryBehavior = selectedBehaviors[0];
        const behaviorOption = customOptions['whatDidTheyDo'].find(opt => opt.label === primaryBehavior.answer);
        if (behaviorOption) {
          // Check if this custom option has GPT data that should be considered for deletion tracking
          const gptOptions = questionId === 'whatHappenedBefore' 
            ? behaviorOption.gptGeneratedAntecedents || []
            : behaviorOption.gptGeneratedConsequences || [];
          
          // If we have GPT options, ensure they're properly tracked in deletedOptions
          if (gptOptions.length > 0) {
            const updatedDeleted = { ...deletedOptions };
            if (!updatedDeleted[questionId]) {
              updatedDeleted[questionId] = new Set();
            }
            
            // Add any options that exist in the original GPT data but not in the current GPT data
            // This handles the case where options were deleted from custom options
            // IMPORTANT: Exclude the "Other" option from this comparison since it's not part of GPT data
            const currentGptLabels = new Set(gptOptions.map(opt => opt.text));
            const originalGptLabels = new Set(originalChoices
              .filter(choice => choice.label !== 'Other') // Exclude "Other" from deletion tracking
              .map(choice => choice.label)
            );
            
            originalGptLabels.forEach(label => {
              if (!currentGptLabels.has(label) && !updatedDeleted[questionId].has(label)) {
                updatedDeleted[questionId].add(label);
              }
            });
            
            // Update the deletedOptions state if there were changes
            if (JSON.stringify(updatedDeleted) !== JSON.stringify(deletedOptions)) {
              setDeletedOptions(updatedDeleted);
            }
            
            // Use the updated deleted options for filtering
            deleted = updatedDeleted[questionId] || new Set();
          }
        }
      }
    }
    
    // For multi-select, show custom options from ALL selected behaviors, not just the current category
    // This allows users to see custom options they added for behaviors from different categories
    const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
    let filteredCustom = custom;
    
    if (selectedBehaviors.length > 0) {
      // Get all categories that have selected behaviors
      const selectedCategories = new Set();
      selectedBehaviors.forEach(behavior => {
        // Check if this is a custom behavior (has isCustom property)
        if (behavior.isCustom) {
          selectedCategories.add('yourPins');
        } else {
          // Find which category this behavior belongs to
          currentQ.categories?.forEach(cat => {
            if (cat.choices.some(choice => choice.label === behavior.answer)) {
              selectedCategories.add(cat.key);
            }
          });
        }
      });
      
      console.log(`[FILTER] Selected categories:`, Array.from(selectedCategories));
      
      // Show custom options ONLY in their own category, not across all categories
      // This prevents "Your Pins" options from appearing in other categories
      filteredCustom = custom.filter(option => 
        option.category === selectedBehaviorCategory
      );
    } else {
      // Fallback to original logic if no behaviors selected
      filteredCustom = custom.filter(option => 
      !option.category || option.category === selectedBehaviorCategory
    );
    }
    
    console.log(`[FILTER] Filtered custom options count: ${filteredCustom.length}`);
    console.log(`[FILTER] Filtered custom options:`, filteredCustom.map(opt => ({ label: opt.label, category: opt.category, matchesCategory: opt.category === selectedBehaviorCategory ? 'same-category' : 'different-category' })));
    
    // Filter out deleted options from original choices
    console.log(`[FILTER] ===== FILTERING DELETED OPTIONS =====`);
    console.log(`[FILTER] deleted Set for ${questionId}:`, deleted);
    console.log(`[FILTER] deleted Set size: ${deleted.size}`);
    console.log(`[FILTER] deleted Set contents:`, Array.from(deleted));
    console.log(`[FILTER] originalChoices before filtering:`, originalChoices.map(c => c.label));
    
    const filteredOriginal = originalChoices.filter(choice => {
      const isDeleted = deleted.has(choice.label);
      console.log(`[FILTER] Checking choice "${choice.label}": isDeleted = ${isDeleted}`);
      return !isDeleted;
    });
    
    console.log(`[FILTER] filteredOriginal after filtering:`, filteredOriginal.map(c => c.label));
    console.log(`[FILTER] Filtered original choices count: ${filteredOriginal.length}`);
    
    // Separate "Other" option from other choices
    const otherOption = filteredOriginal.find(choice => choice.label === 'Other');
    const nonOtherChoices = filteredOriginal.filter(choice => choice.label !== 'Other');
    
    console.log(`[FILTER] Non-Other choices count: ${nonOtherChoices.length}`);
    console.log(`[FILTER] Has Other option: ${!!otherOption}`);
    
    // For ABC questions (antecedents/consequences), implement proper set-based distribution
    if (questionId === 'whatHappenedBefore' || questionId === 'whatHappenedAfter') {
      const currentSet = optionSets[questionId] || 0;
      
      // Use intelligent choice functions to get all available options for multiple behaviors
      const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
      let allAvailableOptions: Array<{ label: string; emoji: string; sentiment?: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean }> = [];
      
      if (selectedBehaviors.length > 0) {
        if (questionId === 'whatHappenedBefore') {
          allAvailableOptions = getIntelligentAntecedentChoices(selectedBehaviors, questionId);
        } else {
          allAvailableOptions = getIntelligentConsequenceChoices(selectedBehaviors, questionId);
        }
        console.log(`[FILTER] Got ${allAvailableOptions.length} intelligent options for ${questionId}`);
        
        // CRITICAL FIX: Filter the intelligent options to remove deleted ones
        const deletedSet = deletedOptions[questionId] || new Set();
        allAvailableOptions = allAvailableOptions.filter(option => !deletedSet.has(option.label));
        console.log(`[FILTER] After filtering deleted options: ${allAvailableOptions.length} intelligent options remain for ${questionId}`);
      }
      
      let finalOptions: Array<{ label: string; emoji: string; sentiment?: string | null }> = [];
      
      if (allAvailableOptions.length > 0) {
        // SMART DISTRIBUTION SYSTEM: Always show exactly 5 sets total
        // All antecedents/consequences from selected behaviors are spread evenly across these 5 sets
        // Each set shows exactly 5 options (except possibly the last set)
        const totalSets = 5;
        const optionsPerSet = 5;
        
        // Calculate start and end indices for this set
        const startIndex = currentSet * optionsPerSet;
        const endIndex = Math.min(startIndex + optionsPerSet, allAvailableOptions.length);
        const currentSetOptions = allAvailableOptions.slice(startIndex, endIndex);
        
        console.log(`[SMART_DISTRIBUTION] ${questionId}: ${selectedBehaviors.length} behaviors, ${allAvailableOptions.length} total options, Set ${currentSet + 1}/${totalSets}: Options ${startIndex + 1}-${endIndex} of ${allAvailableOptions.length} total`);
        console.log(`[FILTER] Set ${currentSet + 1}: current set options (${currentSetOptions.length}):`, currentSetOptions.map(opt => opt.label));
        
        finalOptions = currentSetOptions;
        } else {
        // Fallback to original logic if no intelligent options available
        if (currentSet === 0) {
          // Set 0: Custom options first, then hardcoded options
          const customOptionsForSet0 = filteredCustom.slice(0, 5); // Max 5 custom options in Set 0
          const remainingSlots = 5 - customOptionsForSet0.length;
          
          // Get hardcoded options, but exclude any that have the same label as custom options
          const customLabels = new Set(customOptionsForSet0.map(opt => opt.label));
          const hardcodedOptionsForSet0 = nonOtherChoices
            .filter(choice => !customLabels.has(choice.label))
            .slice(0, remainingSlots);
          
          finalOptions = [...customOptionsForSet0, ...hardcodedOptionsForSet0];
        } else {
          // Set 1+: Only hardcoded options (no custom options duplicated)
          const startIndex = (currentSet - 1) * 5 + (5 - filteredCustom.length); // Adjust for custom options in Set 0
          const endIndex = startIndex + 5;
          const hardcodedOptionsForSet = nonOtherChoices.slice(startIndex, endIndex);
          
          finalOptions = hardcodedOptionsForSet;
        }
      }
      
      // Always add "Other" option at the end
      if (otherOption) {
        finalOptions.push(otherOption);
        console.log(`[FILTER] Added "Other" option to final options for ${questionId} Set ${currentSet}`);
      } else {
        console.warn(`[FILTER] WARNING: No "Other" option found for ${questionId} Set ${currentSet}!`);
        console.warn(`[FILTER] Original choices:`, originalChoices.map(c => c.label));
        console.warn(`[FILTER] Filtered original:`, filteredOriginal.map(c => c.label));
        console.warn(`[FILTER] Deleted options:`, Array.from(deleted));
      }
      
      console.log(`[FILTER] ${questionId} Set ${currentSet}: ${finalOptions.length} options (${finalOptions.length - (otherOption ? 1 : 0)} content + Other)`);
      
      // Ensure no duplicate labels in the final options
      const uniqueOptions = finalOptions.filter((option, index, self) => 
        index === self.findIndex(o => o.label === option.label)
      );
      
      if (uniqueOptions.length !== finalOptions.length) {
        console.warn(`[FILTER] Duplicate labels detected in ${questionId} Set ${currentSet}. Original: ${finalOptions.length}, Unique: ${uniqueOptions.length}`);
      }
      
      console.log(`[FILTER] Returning ${uniqueOptions.length} options for ${questionId}`);
      return uniqueOptions;
    }
    
    // For non-shuffle questions (like whatDidTheyDo), always include custom options
    // Order: non-Other choices + custom options + Other option
    const nonShuffleOptions = [...nonOtherChoices, ...filteredCustom, ...(otherOption ? [otherOption] : [])];
    
    // Log the "Other" option status for non-ABC questions
    if (otherOption) {
      console.log(`[FILTER] Non-ABC: Added "Other" option to final options for ${questionId}`);
    } else {
      console.warn(`[FILTER] Non-ABC: WARNING: No "Other" option found for ${questionId}!`);
      console.warn(`[FILTER] Non-ABC: Original choices:`, originalChoices.map(c => c.label));
      console.warn(`[FILTER] Non-ABC: Filtered original:`, filteredOriginal.map(c => c.label));
      console.warn(`[FILTER] Non-ABC: Deleted options:`, Array.from(deleted));
    }
    
    // Ensure no duplicate labels in the final options for non-ABC questions too
    const uniqueNonShuffleOptions = nonShuffleOptions.filter((option, index, self) => 
      index === self.findIndex(o => o.label === option.label)
    );
    
    if (uniqueNonShuffleOptions.length !== nonShuffleOptions.length) {
      console.warn(`[FILTER] Duplicate labels detected in ${questionId} (non-ABC). Original: ${nonShuffleOptions.length}, Unique: ${uniqueNonShuffleOptions.length}`);
      console.warn(`[FILTER] Duplicates found:`, nonShuffleOptions.filter((option, index, self) => 
        self.findIndex(o => o.label === option.label) !== index
      ).map(o => o.label));
    }
    
    console.log(`[FILTER] Final options count for ${questionId}: ${uniqueNonShuffleOptions.length}`);
    
    if (questionId === 'whatDidTheyDo') {
      console.log(`[FILTER] Non-shuffle return for whatDidTheyDo:`, uniqueNonShuffleOptions);
      console.log(`[FILTER] Checking non-shuffle returned options for isCustom:`);
      uniqueNonShuffleOptions.forEach((option, index) => {
        console.log(`[FILTER] Non-shuffle option ${index}:`, { 
          label: option.label, 
          isCustom: (option as any).isCustom, 
          isOther: (option as any).isOther,
          allProps: Object.keys(option)
        });
      });
    }
    
    return uniqueNonShuffleOptions;
  };

  // Helper function to calculate total sets for ABC questions based on available options
  const getTotalSetsWithCustomOptions = (questionId: string): number => {
    if (questionId !== 'whatHappenedBefore' && questionId !== 'whatHappenedAfter') {
      return 1; // Non-ABC questions only have 1 set
    }
    
    // Get the selected behaviors to determine original options
    const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
    if (selectedBehaviors.length === 0) {
      return 1;
    }
    
    // Always return exactly 5 sets for ABC questions
    // All antecedents/consequences are distributed evenly across these 5 sets
    const totalSets = 5;
    
    console.log(`[SETS] ${questionId}: ${selectedBehaviors.length} behaviors selected, showing exactly ${totalSets} sets`);
    
    return totalSets;
  };

  // Helper function to get choice button border radius
  const getChoiceButtonStyle = (choice: any, questionId: string) => {
    const baseStyle = [
      styles.choiceButton,
      (choice.label === 'Other' ? isOtherSelected(questionId) : isAnswerSelected(questionId, choice.label)) && styles.selectedChoice,
    ];
    
    // If edit mode is active and this choice can have a delete button, adjust border radius
    if (isCustomEditMode && choice.label !== 'Other' && !(choice as any).isGptGenerated && !(choice as any).isBehaviorSpecific && !(choice as any).isCustom) {
      baseStyle.push({
        borderRightWidth: 0,
        borderBottomRightRadius: 0,
      } as any);
    }
    
    return baseStyle;
  };

  // New function to get intelligent antecedent choices for multiple behaviors
  const getIntelligentAntecedentChoices = (selectedBehaviors: Answer[], questionId: string) => {
    if (selectedBehaviors.length === 0) return [];
    
    // EQUAL DISTRIBUTION: Collect all antecedents from all behaviors first
    let allAntecedents: Array<{ label: string; emoji: string; sentiment: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean }> = [];
    
    // Collect antecedents from all behaviors equally
    selectedBehaviors.forEach(behavior => {
      // Check if this is a custom behavior OR an "Other" option
      const isCustomBehavior = behavior.isCustom || behavior.answer === otherText['whatDidTheyDo'];
      
      if (isCustomBehavior) {
        // For custom behaviors or "Other" options, check if we have GPT data
        const customOption = customOptions['whatDidTheyDo']?.find(opt => opt.label === behavior.answer);
        if (customOption?.gptGeneratedAntecedents) {
          const behaviorAntecedents = customOption.gptGeneratedAntecedents.map(antecedent => ({
            label: antecedent.text,
            emoji: antecedent.emoji,
            sentiment: 'negative',
            isGptGenerated: true,
            isFromCustomOption: true,
            sourceBehavior: behavior.answer // Track which behavior this came from
          }));
          allAntecedents.push(...behaviorAntecedents);
        } else if (customOption && !customOption.gptGeneratedAntecedents) {
          // Custom option exists but doesn't have GPT data yet
          console.log(`[GPT_GENERATION] Custom option "${behavior.answer}" doesn't have GPT antecedents - this should have been generated when the option was added`);
        } else if (behavior.answer === otherText['whatDidTheyDo']) {
          // For "Other" options, check if we have GPT data in gptSuggestions state
          if (gptSuggestions && !gptSuggestions.isFallback && gptSuggestions.antecedents) {
            const behaviorAntecedents = gptSuggestions.antecedents.map(antecedent => ({
              label: antecedent.text,
              emoji: antecedent.emoji,
              sentiment: 'negative',
              isGptGenerated: true,
              isFromOtherOption: true,
              sourceBehavior: behavior.answer // Track which behavior this came from
            }));
            allAntecedents.push(...behaviorAntecedents);
            console.log(`[OTHER_OPTION] Using GPT antecedents for "Other" option "${behavior.answer}":`, behaviorAntecedents.length);
          } else {
            console.log(`[OTHER_OPTION] "Other" option "${behavior.answer}" needs GPT antecedents generated`);
            // Note: GPT generation will happen asynchronously in the background
          }
        }
      } else {
        // For predefined behaviors, use behavior-specific options
        const behaviorAntecedents = behaviorSpecificOptions[behavior.answer]?.antecedents?.map(antecedent => ({
          label: antecedent,
          emoji: getAntecedentEmoji(antecedent),
          sentiment: 'negative',
          isBehaviorSpecific: true,
          sourceBehavior: behavior.answer // Track which behavior this came from
        })) || [];
        allAntecedents.push(...behaviorAntecedents);
      }
    });
    
    // Get custom options added directly to this question (prioritize these)
    const directCustomOptions = (customOptions[questionId] || []).map(option => ({
      label: option.label,
      emoji: option.emoji,
      sentiment: option.sentiment || 'negative',
      isCustomOption: true,
      sourceBehavior: 'direct' // Track that this came from direct addition
    }));
    
    // Remove duplicates based on label (preserve sourceBehavior)
    const uniqueAntecedents = allAntecedents.filter((antecedent, index, self) => 
      index === self.findIndex(a => a.label === antecedent.label)
    );
    
    // EQUAL DISTRIBUTION: Interleave antecedents from different behaviors
    // This ensures each behavior gets equal representation across the sets
    const interleavedAntecedents: Array<{ label: string; emoji: string; sentiment: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean; sourceBehavior?: string }> = [];
    
    // Simple interleaving: take one option from each behavior in rotation
    const behaviorOptionsMap = new Map<string, Array<{ label: string; emoji: string; sentiment: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean; sourceBehavior?: string }>>();
    
    // Group options by behavior
    selectedBehaviors.forEach(behavior => {
      const behaviorOptions = uniqueAntecedents.filter(opt => (opt as any).sourceBehavior === behavior.answer);
      behaviorOptionsMap.set(behavior.answer, behaviorOptions);
    });
    
    // Interleave by taking one option from each behavior in rotation
    let maxLength = 0;
    behaviorOptionsMap.forEach(options => {
      maxLength = Math.max(maxLength, options.length);
    });
    
    for (let i = 0; i < maxLength; i++) {
      selectedBehaviors.forEach(behavior => {
        const options = behaviorOptionsMap.get(behavior.answer) || [];
        if (options[i]) {
          interleavedAntecedents.push(options[i]);
        }
      });
    }
    
    // Combine: direct custom options first, then interleaved behavior options
    const combined = [...directCustomOptions, ...interleavedAntecedents];
    
    console.log(`[EQUAL_DISTRIBUTION] ${questionId}: ${selectedBehaviors.length} behaviors, ${combined.length} total antecedents, interleaved for equal representation`);
    
    // Return ALL options so they can be properly distributed across sets
    return combined;
  };

  // New function to get intelligent consequence choices for multiple behaviors
  const getIntelligentConsequenceChoices = (selectedBehaviors: Answer[], questionId: string) => {
    if (selectedBehaviors.length === 0) return [];
    
    // EQUAL DISTRIBUTION: Collect all consequences from all behaviors first
    let allConsequences: Array<{ label: string; emoji: string; sentiment: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean; sourceBehavior?: string }> = [];
    
    // Collect consequences from all behaviors equally
    selectedBehaviors.forEach(behavior => {
      // Check if this is a custom behavior OR an "Other" option
      const isCustomBehavior = behavior.isCustom || behavior.answer === otherText['whatDidTheyDo'];
      
      if (isCustomBehavior) {
        // For custom behaviors or "Other" options, check if we have GPT data
        const customOption = customOptions['whatDidTheyDo']?.find(opt => opt.label === behavior.answer);
        if (customOption?.gptGeneratedConsequences) {
          const behaviorConsequences = customOption.gptGeneratedConsequences.map(consequence => ({
            label: consequence.text,
            emoji: consequence.emoji,
            sentiment: 'negative',
            isGptGenerated: true,
            isFromCustomOption: true,
            sourceBehavior: behavior.answer // Track which behavior this came from
          }));
          allConsequences.push(...behaviorConsequences);
        } else if (customOption && !customOption.gptGeneratedConsequences) {
          // Custom option exists but doesn't have GPT data yet
          console.log(`[GPT_GENERATION] Custom option "${behavior.answer}" doesn't have GPT consequences - this should have been generated when the option was added`);
        } else if (behavior.answer === otherText['whatDidTheyDo']) {
          // For "Other" options, check if we have GPT data in gptSuggestions state
          if (gptSuggestions && !gptSuggestions.isFallback && gptSuggestions.consequences) {
            const behaviorConsequences = gptSuggestions.consequences.map(consequence => ({
              label: consequence.text,
              emoji: consequence.emoji,
              sentiment: 'negative',
              isGptGenerated: true,
              isFromOtherOption: true,
              sourceBehavior: behavior.answer // Track which behavior this came from
            }));
            allConsequences.push(...behaviorConsequences);
            console.log(`[OTHER_OPTION] Using GPT consequences for "Other" option "${behavior.answer}":`, behaviorConsequences.length);
    } else {
            console.log(`[OTHER_OPTION] "Other" option "${behavior.answer}" needs GPT consequences generated`);
            // Note: GPT generation will happen asynchronously in the background
          }
        }
      } else {
        // For predefined behaviors, use behavior-specific options
        const behaviorConsequences = behaviorSpecificOptions[behavior.answer]?.consequences?.map(consequence => ({
          label: consequence,
          emoji: getConsequenceEmoji(consequence),
          sentiment: 'negative',
          isBehaviorSpecific: true,
          sourceBehavior: behavior.answer // Track which behavior this came from
        })) || [];
        allConsequences.push(...behaviorConsequences);
      }
    });
    
    // Get custom options added directly to this question (prioritize these)
    const directCustomOptions = (customOptions[questionId] || []).map(option => ({
      label: option.label,
      emoji: option.emoji,
      sentiment: option.sentiment || 'negative',
      isCustomOption: true,
      sourceBehavior: 'direct' // Track that this came from direct addition
    }));
    
    // Remove duplicates based on label (preserve sourceBehavior)
    const uniqueConsequences = allConsequences.filter((consequence, index, self) => 
      index === self.findIndex(c => c.label === consequence.label)
    );
    
    // EQUAL DISTRIBUTION: Interleave consequences from different behaviors
    // This ensures each behavior gets equal representation across the sets
    const interleavedConsequences: Array<{ label: string; emoji: string; sentiment: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean; sourceBehavior?: string }> = [];
    
    // Simple interleaving: take one option from each behavior in rotation
    const behaviorOptionsMap = new Map<string, Array<{ label: string; emoji: string; sentiment: string | null; isGptGenerated?: boolean; isFromCustomOption?: boolean; isBehaviorSpecific?: boolean; isCustomOption?: boolean; sourceBehavior?: string }>>();
    
    // Group options by behavior
    selectedBehaviors.forEach(behavior => {
      const behaviorOptions = uniqueConsequences.filter(opt => (opt as any).sourceBehavior === behavior.answer);
      behaviorOptionsMap.set(behavior.answer, behaviorOptions);
    });
    
    // Interleave by taking one option from each behavior in rotation
    let maxLength = 0;
    behaviorOptionsMap.forEach(options => {
      maxLength = Math.max(maxLength, options.length);
    });
    
    for (let i = 0; i < maxLength; i++) {
      selectedBehaviors.forEach(behavior => {
        const options = behaviorOptionsMap.get(behavior.answer) || [];
        if (options[i]) {
          interleavedConsequences.push(options[i]);
        }
      });
    }
    
    // Combine: direct custom options first, then interleaved behavior options
    const combined = [...directCustomOptions, ...interleavedConsequences];
    
    console.log(`[EQUAL_DISTRIBUTION] ${questionId}: ${selectedBehaviors.length} behaviors, ${combined.length} total consequences, interleaved for equal representation`);
    
    // Return ALL options so they can be properly distributed across sets
    return combined;
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
    if (lowerConsequence.includes('modeled') || lowerConsequence.includes('modeling')) return '��';
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
    // The "Other" option should be selected if there's a custom answer that was submitted via "Other"
    // This should NOT include custom options selected from "Your Pins" category
    // Custom options from "Your Pins" are handled by isAnswerSelected, not isOtherSelected
    return answers.some(a => a.isCustom && !a.isFromCustomCategory);
  };

  // Helper to check if a category contains the selected answer
  const isCategorySelected = (category: Category) => {
    const answers = selectedAnswers[currentQ.id] || [];
    return answers.some(answer => {
      // Check if this answer matches any choice in the category
      const matchesCategoryChoice = category.choices.some(choice => choice.label === answer.answer);
      
      // Also check if this is an "Other" option that was selected from this category
      // (since "Other" options are stored separately but belong to the current category)
      const isOtherFromThisCategory = answer.answer === otherText[currentQ.id] && selectedCategory?.key === category.key;
      
      return matchesCategoryChoice || isOtherFromThisCategory;
    });
  };

  // Helper to get the selected answer text for display
  const getSelectedAnswerText = () => {
    const answers = selectedAnswers[currentQ.id] || [];
    if (answers.length === 0) return null;
    
    if (currentQ.id === 'whatDidTheyDo') {
      // For first question, show multiple behaviors if selected
      if (answers.length === 1) {
        return answers[0].answer;
      } else if (answers.length === 2) {
        return `${answers[0].answer} + ${answers[1].answer}`;
      } else if (answers.length === 3) {
        return `${answers[0].answer} + ${answers[1].answer} + ${answers[2].answer}`;
      }
    } else {
      // For other questions, show first answer (existing logic)
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
    
    // For first question, require at least 1 behavior selected
    if (currentQuestionId === 'whatDidTheyDo') {
      return (selectedAnswers[currentQuestionId]?.length ?? 0) > 0;
    }
    
    // For other questions, require at least 1 answer
    return (selectedAnswers[currentQuestionId]?.length ?? 0) > 0;
  };

  const handleSave = async () => {
    try {
      const responses = currentFlow.reduce((acc, q) => {
        const baseResponse: {
          question: string;
          answers: any[];
          comment: string;
          sentiment: 'positive' | 'negative' | null;
          gptGenerated?: Array<{ text: string; emoji: string }>;
        } = {
          question: q.question,
          answers: q.id === 'mood' ? [
            { answer: `Before: ${moodBefore}, After: ${moodAfter}`, isCustom: false }
          ] : (selectedAnswers[q.id] || []),
          comment: comments[q.id] || '',
          sentiment: flowSentiment
        };

        // Add GPT-generated antecedents and consequences for "Other" responses
        if (q.id === 'whatHappenedBefore' && gptSuggestions && !gptSuggestions.isFallback) {
          const isCustomResponse = selectedAnswers['whatDidTheyDo']?.[0]?.isCustom;
          if (isCustomResponse) {
            baseResponse.gptGenerated = gptSuggestions.antecedents || [];
          }
        } else if (q.id === 'whatHappenedAfter' && gptSuggestions && !gptSuggestions.isFallback) {
          const isCustomResponse = selectedAnswers['whatDidTheyDo']?.[0]?.isCustom;
          if (isCustomResponse) {
            baseResponse.gptGenerated = gptSuggestions.consequences || [];
          }
        }

        return {
          ...acc,
          [q.id]: baseResponse
        };
      }, {});

      const storageKey = flowSentiment === 'positive' ? 'flow_basic_1_positive' : 'flow_basic_1_negative';

      if (isEditMode && editLog) {
        const updatedLog = { ...editLog, responses, edited: true };
        const updatedData = { 
          ...currentChild.data,
          custom_options: customOptions,
          deleted_options: Object.keys(deletedOptions).reduce((acc, key) => {
            acc[key] = Array.from(deletedOptions[key]);
            return acc;
          }, {} as { [key: string]: string[] })
        };
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
          custom_options: customOptions,
          deleted_options: Object.keys(deletedOptions).reduce((acc, key) => {
            acc[key] = Array.from(deletedOptions[key]);
            return acc;
          }, {} as { [key: string]: string[] }),
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
      // Only show custom text for "Other" if it was specifically selected via the "Other" option
      // This should NOT include custom options selected from "Your Pins" category
      const customAnswer = selectedAnswers[currentQ.id]?.find(a => a.isCustom && !a.isFromCustomCategory);
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
            <View style={styles.headerButtons}>
              {/* Show comment button only when NOT in edit mode AND setting is enabled */}
              {console.log('[COMMENT] Button visibility check - isCustomEditMode:', isCustomEditMode, 'isCommentButtonEnabled:', isCommentButtonEnabled)}
              {!isCustomEditMode && isCommentButtonEnabled && (
                <>
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
                </>
              )}
              
              {/* Show add option button in header when in edit mode */}
              {isCustomEditMode && currentQ.is_editable !== false && (
                <TouchableOpacity
                  style={styles.headerAddOptionButton}
                  onPress={() => openAddOptionModal(currentQ.id)}
                >
                  <Text style={styles.headerAddOptionButtonText}>➕ Add an option</Text>
                </TouchableOpacity>
              )}
              
              {currentQ.is_editable !== false && (
                <TouchableOpacity
                  style={[
                    styles.editModeButton,
                    isCustomEditMode && styles.editModeButtonActive
                  ]}
                  onPress={() => setIsCustomEditMode(!isCustomEditMode)}
                >
                  <Text style={[
                    styles.editModeIcon,
                    isCustomEditMode && { color: '#fff' }
                  ]}>
                    {isCustomEditMode ? '✓ Finish' : '✏️'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Show manage behaviors button only for the first question */}
              {currentQ.id === 'whatDidTheyDo' && (
                <TouchableOpacity
                  style={styles.manageBehaviorsButton}
                  onPress={() => navigation.navigate('CustomOptionsScreen', { currentChild })}
                >
                  <Text style={styles.manageBehaviorsButtonText}>⚙️ Manage</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Edit Mode Indicator */}
          {isCustomEditMode && (
            <TouchableOpacity style={styles.editModeIndicator} onPress={() => {
              Alert.alert("Finished editing?", "Are you sure you want to close edit mode?", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Finish', style: 'default', onPress: () => {
                  setIsCustomEditMode(false);
                } }
              ]);
            }}>
              <Text style={styles.editModeIndicatorText}>✏️ Edit Mode</Text>
            </TouchableOpacity>
          )}
          {/* we also need to account for length of the question. IF the length of question is less than 64 characters, we need to set
          the fontSize to 22, otherwise we need to set it to 24 */}
          {currentQ.question.length < 49 ? (
            <Text style={currentQ.subheading ? styles.question : [styles.question, { marginBottom: 30,  }]}>{currentQ.question}</Text>
          ) : (
            <Text style={currentQ.subheading ? styles.question : [styles.question, { marginBottom: 30, fontSize: 22 }]}>{currentQ.question}</Text>
          )}
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
                <>
                  {filteredBehaviorChoices.map((choice, index) => (
                    <View key={`${choice.label}-${index}-${(choice as any).isCustom ? 'custom' : 'base'}`} style={styles.choiceContainer}>
                      <TouchableOpacity
                        style={getChoiceButtonStyle(choice, currentQ.id)}
                        onPress={() => {
                          handleAnswer(currentQ.id, choice);
                          // Don't go back to categories for multi-select - let user select multiple behaviors
                          // Only go back if they've reached the max limit
                          const currentAnswers = selectedAnswers[currentQ.id] || [];
                          console.log(`[MULTI-SELECT] Selected behavior: ${choice.label}, total selected: ${currentAnswers.length + 1}`);
                          if (currentAnswers.length >= 3) {
                          setSelectedCategory(null);
                          setSearchQuery('');
                          }
                        }}
                      >
                        <View style={styles.choiceContent}>
                          <Text style={styles.choiceText}>{getChoiceLabel(choice)}</Text>
                          {(choice as any).isCustom && (
                            <Text style={styles.customBadge}>You added</Text>
                          )}
                          {/* {(choice as any).isGptGenerated && (
                            <Text style={styles.gptBadge}>🤖 AI</Text>
                          )} */}
                        </View>
                      </TouchableOpacity>
                      {choice.label !== 'Other'
                        && isCustomEditMode
                        && currentQ.is_editable !== false
                        && (choice as any).isCustom && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => {
                            Alert.alert(
                              'Delete option?',
                              `Are you sure you want to delete "${choice.label}"?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => {
                                    console.log(`[DELETE_BUTTON] Delete button pressed for choice: "${choice.label}" in question: "${currentQ.id}"`);
                                    console.log(`[DELETE_BUTTON] Choice details:`, choice);
                                    console.log(`[DELETE_BUTTON] Current question details:`, currentQ);
                                    handleDeleteOption(currentQ.id, choice.label);
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.deleteButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {/* Add option button moved to header during edit mode */}
                </>
              ) : selectedCategory ? (
                <>
                  {(() => {
                    const catChoices = selectedCategory.key === 'verbalBehaviors'
                      ? selectedCategory.choices.slice(
                          behaviorOptionSet * 5,
                          Math.min((behaviorOptionSet + 1) * 5, selectedCategory.choices.length)
                        )
                      : selectedCategory.choices;
                    
                    // Apply filtering and custom options
                    const filteredChoices = getFilteredOptions(currentQ.id, catChoices);
                    
                    // TEMP FIX: Ensure custom options in "Your Pins" category have isCustom property
                    if (selectedCategory.key === 'yourPins') {
                      console.log('[TEMP_FIX] Your Pins category detected, fixing isCustom properties');
                      filteredChoices.forEach((choice: any) => {
                        if (!choice.isOther) {
                          choice.isCustom = true;
                          console.log('[TEMP_FIX] Added isCustom to:', choice.label);
                        }
                      });
                    }
                    
                    return filteredChoices.map((choice, index) => (
                     <View key={`${choice.label}-${index}-${(choice as any).isCustom ? 'custom' : 'base'}`} style={styles.choiceContainer}>
                       <TouchableOpacity
                         style={getChoiceButtonStyle(choice, currentQ.id)}
                         onPress={() => {
                           handleAnswer(currentQ.id, choice);
                          // Don't go back to categories for multi-select - let user select multiple behaviors
                          // Only go back if they've reached the max limit
                          const currentAnswers = selectedAnswers[currentQ.id] || [];
                          console.log(`[MULTI-SELECT] Selected behavior: ${choice.label}, total selected: ${currentAnswers.length + 1}`);
                          if (currentAnswers.length >= 3) {
                           setSelectedCategory(null);
                           setSearchQuery('');
                           setBehaviorOptionSet(0);
                          }
                         }}
                       >
                                                  <View style={styles.choiceContent}>
                           <Text style={styles.choiceText}>{getChoiceLabel(choice)}</Text>
                           {customOptions[currentQ.id]?.some(opt => opt.label === choice.label) && (
                             <Text style={styles.customBadge}>You added</Text>
                           )}
                           {/* {(choice as any).isGptGenerated && (
                             <Text style={styles.gptBadge}>🤖 AI</Text>
                           )} */}
                         </View>
                       </TouchableOpacity>
                       {choice.label !== 'Other' && !(choice as any).isGptGenerated && !(choice as any).isBehaviorSpecific && isCustomEditMode && currentQ.is_editable !== false && (
                         <TouchableOpacity
                           style={styles.deleteButton}
                           onPress={() => {
                             Alert.alert(
                               'Delete option?',
                               `Are you sure you want to delete "${choice.label}"?`,
                               [
                                 { text: 'Cancel', style: 'cancel' },
                                 {
                                   text: 'Delete',
                                   style: 'destructive',
                                   onPress: () => {
                                    console.log(`[DELETE_BUTTON] Delete button pressed for choice: "${choice.label}" in question: "${currentQ.id}"`);
                                    console.log(`[DELETE_BUTTON] Choice details:`, choice);
                                    console.log(`[DELETE_BUTTON] Current question details:`, currentQ);
                                    handleDeleteOption(currentQ.id, choice.label);
                                  }
                                 }
                               ]
                             );
                           }}
                         >
                           <Text style={styles.deleteButtonText}>🗑️</Text>
                         </TouchableOpacity>
                       )}
                     </View>
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
                  
                  {/* Add option button moved to header during edit mode */}
                </>
              ) : (
                <>
                  {getSelectedAnswerText() && (
                    <View style={styles.selectedAnswerContainer}>
                      <Text style={styles.selectedAnswerText}>
                        ✅ Selected: {getSelectedAnswerText()}
                      </Text>
                      <Text style={styles.nextHintText}>
                        {(() => {
                          const selectedCount = (selectedAnswers['whatDidTheyDo'] || []).length;
                          if (selectedCount === 1) {
                            return "You can select up to 2 more behaviors, or press 'Next' to continue";
                          } else if (selectedCount === 2) {
                            return "You can select 1 more behavior, or press 'Next' to continue";
                          } else if (selectedCount === 3) {
                            return "Maximum behaviors selected. You can press 'Next' to continue";
                          }
                          return "You can now press 'Next' to continue";
                        })()}
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
                        // Don't clear previous selections when switching categories for multi-select
                        // Users should be able to select behaviors from multiple categories
                        const currentAnswers = selectedAnswers['whatDidTheyDo'] || [];
                        console.log(`[CATEGORY] Switching to category: ${cat.key}, current behaviors:`, currentAnswers.map(b => b.answer));
                        setSelectedCategory(cat);
                        setBehaviorOptionSet(0);
                        // Track the selected category for custom options
                        setSelectedBehaviorCategory(cat.key);
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.choiceText}>{`${cat.emoji} ${cat.label}`}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isCategorySelected(cat) && (
                          <Text style={styles.categorySelectedText}>✓</Text>
                        )}
                          {(() => {
                            const selectedCount = (selectedAnswers['whatDidTheyDo'] || []).length;
                            if (selectedCount > 0) {
                              return (
                                <Text style={[styles.categorySelectedText, { marginLeft: 8, fontSize: 12 }]}>
                                  {selectedCount}/3
                                </Text>
                              );
                            }
                            return null;
                          })()}
                        </View>
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
                  <>
                    {currentQ.answer_choices.map((choice, index) => (
                      <View key={`${currentQ.id}-${choice.label}-${index}-${(choice as any).isCustom ? 'custom' : (choice as any).isGptGenerated ? 'gpt' : 'base'}`} style={styles.choiceContainer}>
                        <TouchableOpacity
                          style={getChoiceButtonStyle(choice, currentQ.id)}
                          onPress={() => handleAnswer(currentQ.id, choice)}
                        >
                          <View style={styles.choiceContent}>
                            <Text style={styles.choiceText}>
                              {getChoiceLabel(choice)}
                            </Text>
                            {customOptions[currentQ.id]?.some(opt => opt.label === choice.label) && (
                              <Text style={styles.customBadge}>You added</Text>
                            )}
                            {/* {(choice as any).isGptGenerated && (
                              <Text style={styles.gptBadge}>🤖 AI</Text>
                            )} */}
                          </View>
                        </TouchableOpacity>
                        {choice.label !== 'Other' && isCustomEditMode && currentQ.is_editable !== false && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                              Alert.alert(
                                'Delete option?',
                                `Are you sure you want to delete "${choice.label}"?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => {
                                    console.log(`[DELETE_BUTTON] Delete button pressed for choice: "${choice.label}" in question: "${currentQ.id}"`);
                                    console.log(`[DELETE_BUTTON] Choice details:`, choice);
                                    console.log(`[DELETE_BUTTON] Current question details:`, currentQ);
                                    handleDeleteOption(currentQ.id, choice.label);
                                  }
                                  }
                                ]
                              );
                            }}
                          >
                            <Text style={styles.deleteButtonText}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    
                    {/* Show GPT generation status for custom options */}
                    {(() => {
                      const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
                      const primaryBehavior = selectedBehaviors[0];
                      const customOption = customOptions['whatDidTheyDo']?.find(opt => opt.label === primaryBehavior?.answer);
                      const isGeneratingGpt = isLoadingGpt && primaryBehavior && customOption;
                      const hasGptData = customOption && 
                        ((currentQ.id === 'whatHappenedBefore' && customOption.gptGeneratedAntecedents && customOption.gptGeneratedAntecedents.length > 0) ||
                         (currentQ.id === 'whatHappenedAfter' && customOption.gptGeneratedConsequences && customOption.gptGeneratedConsequences.length > 0));
                      
                      // if (isGeneratingGpt) {
                      //   return (
                      //     <View style={styles.gptStatusContainer}>
                      //       <Text style={styles.gptStatusText}>🤖 Generating AI suggestions...</Text>
                      //     </View>
                      //   );
                      // } else if (hasGptData) {
                      //     <View style={styles.gptStatusContainer}>
                      //       <Text style={styles.gptStatusText}>🤖 AI suggestions ready</Text>
                      //     </View>
                      //   );
                      // }
                      return null;
                    })()}
                  </>
                ) : (
                  <View style={styles.noOptionsContainer}>
                    <Text style={styles.noOptionsText}>
                      Tap the "Shuffle options" button below. 
                    </Text>
                    <Text style={[styles.noOptionsText, { marginTop: 10 }]}>
                    If not, make sure you selected a behavior on the first question to see relevant options.
                    </Text>
                  </View>
                )
              )
              ) : (
                                // Regular questions (not ABC questions)
                currentQ.answer_choices?.map((choice, index) => (
                  <View key={`${currentQ.id}-${choice.label}-${index}-${(choice as any).isCustom ? 'custom' : (choice as any).isGptGenerated ? 'gpt' : 'base'}`} style={styles.choiceContainer}>
                    <TouchableOpacity
                      style={getChoiceButtonStyle(choice, currentQ.id)}
                      onPress={() => handleAnswer(currentQ.id, choice)}
                    >
                      <View style={styles.choiceContent}>
                        <Text style={styles.choiceText}>
                          {getChoiceLabel(choice)}
                        </Text>
                        {customOptions[currentQ.id]?.some(opt => opt.label === choice.label) && (
                          <Text style={styles.customBadge}>You added</Text>
                        )}
                        {/* {(choice as any).isGptGenerated && (
                          <Text style={styles.gptBadge}>🤖 AI</Text>
                        )} */}
                      </View>
                    </TouchableOpacity>
                    {choice.label !== 'Other' && isCustomEditMode && currentQ.is_editable !== false && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Delete option?',
                            `Are you sure you want to delete "${choice.label}"?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => handleDeleteOption(currentQ.id, choice.label)
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                    Set {((optionSets[currentQ.id] || 0) + 1)} of 5
                    {(() => {
                      // Show selected behaviors count for multi-behavior scenarios
                      if (currentQ.id === 'whatHappenedBefore' || currentQ.id === 'whatHappenedAfter') {
                        const selectedBehaviors = selectedAnswers['whatDidTheyDo'] || [];
                        if (selectedBehaviors.length > 1) {
                          const behaviorNames = selectedBehaviors.map(b => b.answer).join(' + ');
                          return ` • ${selectedBehaviors.length} behaviors`;
                        }
                      }
                      return '';
                    })()}
                  </Text>
                </View>
              )}
              
              {/* Add option button moved to header during edit mode */}
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
                    {/* Commented out sentiment selection - using 'negative' as default */}
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
                        onPress={handleOtherSubmit}
                      >
                        <Text style={[styles.modalButtonText, { color: 'white' }]}>
                          Submit
                        </Text>
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
                onPress={() => {
                  setCurrentQuestion(prev => prev - 1);
                  // Exit edit mode when navigating
                  if (isCustomEditMode) {
                    setIsCustomEditMode(false);
                  }
                }}
              >
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
            )}
            {currentQuestion == 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  // Exit edit mode when navigating
                  if (isCustomEditMode) {
                    setIsCustomEditMode(false);
                  }
                  
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
                // Exit edit mode when navigating
                if (isCustomEditMode) {
                  setIsCustomEditMode(false);
                }
                
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

                {/* Add Option Modal */}
          <Modal
            visible={showAddOptionModal.isVisible}
            transparent
            animationType="slide"
            onRequestClose={closeAddOptionModal}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.commentModalOverlay}
            >
              <View style={styles.commentModalContent}>
                <Text style={styles.modalTitle}>Add New Option</Text>
                
                <Text style={styles.modalLabel}>Option Text:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Type your option here..."
                  value={newOptionText}
                  onChangeText={setNewOptionText}
                  autoFocus
                  maxLength={50}
                />
                
                {/* <Text style={styles.modalLabel}>Emoji:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Choose an emoji..."
                  value={newOptionEmoji}
                  onChangeText={setNewOptionEmoji}
                  maxLength={2}
                />
                <Text style={styles.modalLabel}>Quick Emoji Picks:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScrollView}>
                  {commonEmojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emojiOption,
                        newOptionEmoji === emoji && styles.selectedEmoji
                      ]}
                      onPress={() => setNewOptionEmoji(emoji)}
                    >
                      <Text style={styles.emojiOptionText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView> */}
                
                {/* Show deleted options for restoration */}
                {/* {deletedOptions[currentQ.id] && deletedOptions[currentQ.id].size > 0 && (
                  <>
                    <Text style={styles.modalLabel}>Restore Deleted Options:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deletedOptionsScrollView}>
                      {Array.from(deletedOptions[currentQ.id]).map((deletedOption, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.deletedOptionButton}
                          onPress={() => handleRestoreOption(currentQ.id, deletedOption)}
                        >
                          <Text style={styles.deletedOptionText}>{deletedOption}</Text>
                          <Text style={styles.restoreIcon}>↩️</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )} */}
                
                {/* {currentQ.id === 'whatDidTheyDo' && ( */}
                  {/* Commented out sentiment selection - using 'negative' as default */}
                  {/* {currentQ.id !== 'whoWasInvolved' && ( */}
                    <>
                      {/* Sentiment selection completely removed - using 'negative' as default */}
                      {/* {currentQ.id === 'whatDidTheyDo' && ( */}
                      {/*   {currentQ.id !== 'whoWasInvolved' && ( */}
                      {/*     <>
                      {/*       <Text style={styles.modalLabel}>Sentiment: <Text style={{color: "grey", fontWeight: 'normal'}}>(Required)</Text></Text>
                      {/*       <View style={styles.sentimentButtons}>
                      {/*         <TouchableOpacity
                      {/*           style={[
                      {/*             styles.sentimentButton,
                      {/*             newOptionSentiment === 'positive' && styles.selectedSentiment,
                      {/*             {backgroundColor: "lightgreen"}
                      {/*           ]}
                      {/*           onPress={() => setNewOptionSentiment('positive')}
                      {/*         >
                      {/*           <Text style={styles.modalButtonText}>🎉 Win</Text>
                      {/*         </TouchableOpacity>
                      {/*         <TouchableOpacity
                      {/*           style={[
                      {/*             styles.sentimentButton,
                      {/*             newOptionSentiment === 'negative' && styles.selectedSentiment,
                      {/*             {backgroundColor: "orange"}
                      {/*           ]}
                      {/*           onPress={() => setNewOptionSentiment('negative')}
                      {/*         >
                      {/*           <Text style={styles.modalButtonText}>⚔️ Challenge</Text>
                      {/*         </TouchableOpacity>
                      {/*       </View>
                      {/*     </> */}
                      {/*   )} */}
                      {/* )} */}
                    </>
                  {/* )} */}
                {/* )} */}
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={closeAddOptionModal}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                                          style={[
                        styles.modalButton, 
                        styles.submitButton,
                        !newOptionText.trim() ? styles.disabledButton : undefined
                      ]}
                    disabled={!newOptionText.trim()}
                    onPress={handleAddOption}
                  >
                    <Text style={[styles.modalButtonText, { color: 'white' }]}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

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
    padding: 22,
    paddingBottom: 36,
  },
  progress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  progressRow: {
    position: 'relative',
    marginBottom: 20,
  },
  question: {
    fontSize: 29,
    // fontWeight: 'bold',
    fontWeight: '600',
    marginBottom: 12,
  },
  subheading: {
    color: "#666",
    fontSize: 16,
    marginBottom: 26,
  },
  choiceButton: {
    padding: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 9,
    flex: 1,
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
    marginTop: 26,
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
    width: '100%',
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
    marginTop: 20,
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  moodDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 30,
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

  behaviorSpecificBadge: {
    fontSize: 12,
    marginLeft: 8,
  },
  shuffleButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
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
    marginTop: 8,
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
    // fontStyle: 'italic',
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
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
    // borderTopRightRadius: 0,
    // borderBottomRightRadius: 0,
  },
  deleteButton: {
    marginLeft: 0,
    padding: 8,
    borderRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    height: 50
    // height: 100,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  addOptionButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  addOptionButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  emojiScrollView: {
    maxHeight: 60,
    marginBottom: 15,
  },
  emojiOption: {
    padding: 8,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEmoji: {
    backgroundColor: '#E8F3F4',
    borderColor: '#5B9AA0',
  },
  emojiOptionText: {
    fontSize: 20,
  },
  choiceContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customBadge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#28a745',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  gptBadge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  deletedOptionsScrollView: {
    maxHeight: 60,
    marginBottom: 15,
  },
  deletedOptionButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'space-between',
  },
  deletedOptionText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  restoreIcon: {
    fontSize: 14,
  },
  deletedCountText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
  headerButtons: {
    position: 'absolute',
    right: 0,
    top: -5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editModeButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 36,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editModeButtonActive: {
    backgroundColor: '#5B9AA0',
    borderColor: '#5B9AA0',
  },
  manageBehaviorsButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#6C63FF',
    minWidth: 80,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#6C63FF',
    marginLeft: 8,
  },
  manageBehaviorsButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  editModeIcon: {
    fontSize: 16,
    color: '#666',
  },
  headerAddOptionButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#28a745',
    minWidth: 36,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  headerAddOptionButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  editModeIndicator: {
    position: 'absolute',
    left: 20,
    top: 45,
    backgroundColor: '#E8F3F4',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#5B9AA0',
  },
  editModeIndicatorText: {
    fontSize: 12,
    color: '#5B9AA0',
    fontWeight: '600',
  },
  gptStatusContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  gptStatusText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});