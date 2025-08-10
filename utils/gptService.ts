import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOpenAIAPIKey, ENV } from '../config/env';

interface ABCSuggestions {
  antecedents: Array<{ text: string; emoji: string }>;
  consequences: Array<{ text: string; emoji: string }>;
  isFallback?: boolean; // Add flag to distinguish fallback from real GPT
}

interface CachedSuggestion {
  suggestions: ABCSuggestions;
  timestamp: number;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getABCForBehaviour(behaviour: string): Promise<ABCSuggestions> {
  console.log('[GPT] getABCForBehaviour called with behaviour:', behaviour);
  try {
    // Check cache first
    const cacheKey = `gpt_suggestion_${behaviour.toLowerCase().trim()}`;
    console.log('[GPT] Cache key:', cacheKey);
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (cached) {
      console.log('[GPT] Found cached data');
      const parsed: CachedSuggestion = JSON.parse(cached);
      const now = Date.now();
      const age = now - parsed.timestamp;
      console.log('[GPT] Cache age:', age, 'ms, CACHE_DURATION:', CACHE_DURATION, 'ms');
      
      // If cache is still valid, return cached result
      if (age < CACHE_DURATION) {
        console.log('[GPT] Using cached suggestion for:', behaviour);
        console.log('[GPT] Cached suggestions:', parsed.suggestions);
        return parsed.suggestions;
      } else {
        console.log('[GPT] Cache expired, will call API');
      }
    } else {
      console.log('[GPT] No cached data found');
    }

    // If no cache or expired, call OpenAI API
    console.log('[GPT] Calling API for:', behaviour);
    const suggestions = await callOpenAIAPI(behaviour);
    console.log('[GPT] API returned suggestions:', suggestions);
    
    // Cache the result
    const cacheData: CachedSuggestion = {
      suggestions,
      timestamp: Date.now()
    };
    console.log('[GPT] Caching suggestions with timestamp:', cacheData.timestamp);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('[GPT] Successfully cached suggestions');
    
    return suggestions;
  } catch (error) {
    console.error('[GPT] Error getting ABC suggestions:', error);
    if (error instanceof Error) {
      console.error('[GPT] Error details:', error.message, error.stack);
    }
    // Return offline fallback
    console.log('[GPT] Returning offline fallback');
    const fallback = getOfflineFallback(behaviour);
    return { ...fallback, isFallback: true };
  }
}

async function callOpenAIAPI(behaviour: string): Promise<ABCSuggestions> {
  console.log('[GPT] callOpenAIAPI called with behaviour:', behaviour);
  const OPENAI_API_KEY = getOpenAIAPIKey();
  const OPENAI_API_URL = ENV.OPENAI_API_URL;
  
  console.log('[GPT] API URL:', OPENAI_API_URL);
  console.log('[GPT] API Key length:', OPENAI_API_KEY?.length || 0);
  console.log('[GPT] API Key starts with:', OPENAI_API_KEY?.substring(0, 10) + '...');
  
  const prompt = `For the behavior "${behaviour}" in a child, provide 15 likely antecedents (what happened before) and 15 likely consequences (what happened after). 

Return only a JSON object in this exact format:
{
  "antecedents": [
    {"text": "antecedent 1", "emoji": "🚫"},
    {"text": "antecedent 2", "emoji": "⏳"},
    {"text": "antecedent 3", "emoji": "💬"},
    {"text": "antecedent 4", "emoji": "🧹"},
    {"text": "antecedent 5", "emoji": "🍽️"},
    {"text": "antecedent 6", "emoji": "🛏️"},
    {"text": "antecedent 7", "emoji": "👕"},
    {"text": "antecedent 8", "emoji": "📋"},
    {"text": "antecedent 9", "emoji": "🎯"},
    {"text": "antecedent 10", "emoji": "😰"},
    {"text": "antecedent 11", "emoji": "👥"},
    {"text": "antecedent 12", "emoji": "🔄"},
    {"text": "antecedent 13", "emoji": "🧸"},
    {"text": "antecedent 14", "emoji": "📅"},
    {"text": "antecedent 15", "emoji": "⚠️"}
  ],
  "consequences": [
    {"text": "consequence 1", "emoji": "⏰"},
    {"text": "consequence 2", "emoji": "📤"},
    {"text": "consequence 3", "emoji": "🙏"},
    {"text": "consequence 4", "emoji": "🚪"},
    {"text": "consequence 5", "emoji": "⚠️"},
    {"text": "consequence 6", "emoji": "👨‍👩‍👧‍👦"},
    {"text": "consequence 7", "emoji": "😭"},
    {"text": "consequence 8", "emoji": "⏹️"},
    {"text": "consequence 9", "emoji": "😌"},
    {"text": "consequence 10", "emoji": "💬"},
    {"text": "consequence 11", "emoji": "🙈"},
    {"text": "consequence 12", "emoji": "🔄"},
    {"text": "consequence 13", "emoji": "⭐"},
    {"text": "consequence 14", "emoji": "💡"},
    {"text": "consequence 15", "emoji": "🤗"}
  ]
}

Keep each item short and specific. Focus on common scenarios parents might encounter. Avoid starting with "child" or "child is" - make it natural like "Denied request for toy" instead of "Child was denied request for toy".

Choose appropriate emojis: 🚫(denials) ⏳(waiting) 💬(communication) 🧹(cleaning) 🍽️(food) 🛏️(sleep) 👕(dressing) 📋(tasks) 🎯(focus) 😰(overwhelmed) 👥(social) 🔄(transitions) 🧸(toys) 📅(routine) ⚠️(warnings) ⏰(timeout) 📤(removal) 🙏(apologies) 🚪(room) 👨‍👩‍👧‍👦(parent) 😭(crying) ⏹️(stopping) 😌(calming) 🙈(ignoring) ⭐(positive) 💡(reminders) 🤗(comfort)`;

  console.log('[GPT] Sending prompt:', prompt);
  
  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1600, // Increased to ensure complete JSON response
    temperature: 0.7,
  };
  
  console.log('[GPT] Request body:', JSON.stringify(requestBody, null, 2));

  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId); // Clear timeout if request succeeds

    console.log('[GPT] Response status:', response.status);
    console.log('[GPT] Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GPT] Response error text:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[GPT] Response data:', JSON.stringify(data, null, 2));
    
    const content = data.choices[0].message.content;
    console.log('[GPT] Response content:', content);
    
    try {
      const parsed = JSON.parse(content);
      console.log('[GPT] Parsed JSON:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('[GPT] Failed to parse API response:', parseError);
      console.error('[GPT] Raw content that failed to parse:', content);
      throw new Error('Invalid API response format');
    }
  } catch (fetchError) {
    console.error('[GPT] Fetch error:', fetchError);
    if (fetchError instanceof Error) {
      console.error('[GPT] Fetch error details:', fetchError.message, fetchError.stack);
      if (fetchError.name === 'AbortError') {
        console.error('[GPT] Request timed out after 10 seconds');
        throw new Error('Request timed out');
      }
    }
    throw fetchError;
  }
}

function getOfflineFallback(behaviour: string): Omit<ABCSuggestions, 'isFallback'> {
  console.log('[GPT] getOfflineFallback called with behaviour:', behaviour);
  
  // Static fallback suggestions based on common behaviors (expanded to 15 each)
  const fallbackMap: { [key: string]: ABCSuggestions } = {
    'hitting': {
      antecedents: [
        { text: 'Denied request for toy', emoji: '🚫' },
        { text: 'Asked to stop playing', emoji: '⏹️' },
        { text: 'Told to do homework', emoji: '📋' },
        { text: 'Asked to share with others', emoji: '🤝' },
        { text: 'Told to clean up toys', emoji: '🧹' },
        { text: 'Asked to wait their turn', emoji: '⏳' },
        { text: 'Told to be quiet', emoji: '🤫' },
        { text: 'Asked to put away electronics', emoji: '📱' },
        { text: 'Told to eat their food', emoji: '🍽️' },
        { text: 'Asked to get dressed', emoji: '👕' },
        { text: 'Told to go to bed', emoji: '🛏️' },
        { text: 'Asked to stop running', emoji: '🏃' },
        { text: 'Told to sit still', emoji: '🪑' },
        { text: 'Asked to apologize', emoji: '🙏' },
        { text: 'Told to follow instructions', emoji: '📋' }
      ],
      consequences: [
        { text: 'Time out given', emoji: '⏰' },
        { text: 'Toy taken away', emoji: '📤' },
        { text: 'Apology required', emoji: '🙏' },
        { text: 'Sent to room', emoji: '🚪' },
        { text: 'Given warning', emoji: '⚠️' },
        { text: 'Parent intervened', emoji: '👨‍👩‍👧‍👦' },
        { text: 'Sibling cried', emoji: '😭' },
        { text: 'Activity stopped', emoji: '⏹️' },
        { text: 'Privilege removed', emoji: '🚫' },
        { text: 'Calm down time', emoji: '😌' },
        { text: 'Discussion about behavior', emoji: '💬' },
        { text: 'Consequence explained', emoji: '📖' },
        { text: 'Behavior ignored', emoji: '🙈' },
        { text: 'Redirection to different activity', emoji: '🔄' },
        { text: 'Positive reinforcement for stopping', emoji: '⭐' }
      ]
    },
    'screaming': {
      antecedents: [
        { text: 'Asked to leave park', emoji: '🏃' },
        { text: 'Told no to candy', emoji: '🚫' },
        { text: 'Routine disrupted', emoji: '🔄' },
        { text: 'Asked to be quiet', emoji: '🤫' },
        { text: 'Told to stop making noise', emoji: '🔊' },
        { text: 'Asked to wait', emoji: '⏳' },
        { text: 'Told to calm down', emoji: '😌' },
        { text: 'Asked to use inside voice', emoji: '💬' },
        { text: 'Told to stop crying', emoji: '😭' },
        { text: 'Asked to be patient', emoji: '😌' },
        { text: 'Told to finish activity', emoji: '✅' },
        { text: 'Asked to transition', emoji: '🔄' },
        { text: 'Told to put away toys', emoji: '🧹' },
        { text: 'Asked to get ready', emoji: '👕' },
        { text: 'Told to follow rules', emoji: '📋' }
      ],
      consequences: [
        { text: 'Left the situation', emoji: '🏃' },
        { text: 'Given attention', emoji: '👀' },
        { text: 'Comforted', emoji: '🤗' },
        { text: 'Asked to calm down', emoji: '😌' },
        { text: 'Given time out', emoji: '⏰' },
        { text: 'Activity ended', emoji: '⏹️' },
        { text: 'Parent intervened', emoji: '👨‍👩‍👧‍👦' },
        { text: 'Given space', emoji: '🌌' },
        { text: 'Redirection offered', emoji: '🔄' },
        { text: 'Discussion about volume', emoji: '💬' },
        { text: 'Consequence explained', emoji: '📖' },
        { text: 'Behavior ignored', emoji: '🙈' },
        { text: 'Positive reinforcement for quiet', emoji: '⭐' },
        { text: 'Alternative activity', emoji: '🆕' },
        { text: 'Calming technique used', emoji: '🧘' }
      ]
    },
    'tantrum': {
      antecedents: [
        { text: 'Denied request', emoji: '🚫' },
        { text: 'Asked to transition', emoji: '🔄' },
        { text: 'Overwhelmed by choices', emoji: '😰' },
        { text: 'Told no to something', emoji: '🚫' },
        { text: 'Asked to stop activity', emoji: '⏹️' },
        { text: 'Routine changed', emoji: '📅' },
        { text: 'Asked to do something unwanted', emoji: '📋' },
        { text: 'Told to wait', emoji: '⏳' },
        { text: 'Given too many options', emoji: '😰' },
        { text: 'Asked to share', emoji: '🤝' },
        { text: 'Told to finish task', emoji: '✅' },
        { text: 'Asked to be patient', emoji: '😌' },
        { text: 'Told to follow instructions', emoji: '📋' },
        { text: 'Asked to clean up', emoji: '🧹' },
        { text: 'Given unexpected news', emoji: '🎉' }
      ],
      consequences: [
        { text: 'Ignored behavior', emoji: '🙈' },
        { text: 'Given what they wanted', emoji: '📦' },
        { text: 'Removed from situation', emoji: '🏃' },
        { text: 'Time out given', emoji: '⏰' },
        { text: 'Comforted', emoji: '🤗' },
        { text: 'Discussion about feelings', emoji: '💭' },
        { text: 'Activity ended', emoji: '⏹️' },
        { text: 'Parent intervened', emoji: '👨‍👩‍👧‍👦' },
        { text: 'Given space', emoji: '🌌' },
        { text: 'Redirection offered', emoji: '🔄' },
        { text: 'Consequence explained', emoji: '📖' },
        { text: 'Behavior ignored', emoji: '🙈' },
        { text: 'Positive reinforcement for stopping', emoji: '⭐' },
        { text: 'Alternative offered', emoji: '🆕' },
        { text: 'Calming technique used', emoji: '🧘' }
      ]
    }
  };

  // Try to find a close match
  const lowerBehaviour = behaviour.toLowerCase();
  console.log('[GPT] Looking for match in fallback map for:', lowerBehaviour);
  
  for (const [key, suggestions] of Object.entries(fallbackMap)) {
    if (lowerBehaviour.includes(key)) {
      console.log('[GPT] Found fallback match for key:', key);
      console.log('[GPT] Returning fallback suggestions:', suggestions);
      return suggestions;
    }
  }

  // Generic fallback (expanded to 15 each)
  console.log('[GPT] No specific fallback match found, using generic fallback');
  const genericFallback = {
    antecedents: [
      { text: 'Denied a request', emoji: '🚫' },
      { text: 'Asked to do something', emoji: '📋' },
      { text: 'Routine changed', emoji: '📅' },
      { text: 'Told to stop activity', emoji: '⏹️' },
      { text: 'Asked to wait', emoji: '⏳' },
      { text: 'Given instructions', emoji: '📝' },
      { text: 'Asked to share', emoji: '🤝' },
      { text: 'Told to be quiet', emoji: '🤫' },
      { text: 'Asked to transition', emoji: '🔄' },
      { text: 'Told to finish task', emoji: '✅' },
      { text: 'Asked to be patient', emoji: '😌' },
      { text: 'Given unexpected news', emoji: '🎉' },
      { text: 'Asked to clean up', emoji: '🧹' },
      { text: 'Told to follow rules', emoji: '📋' },
      { text: 'Asked to help', emoji: '🆘' }
    ],
    consequences: [
      { text: 'Given time out', emoji: '⏰' },
      { text: 'Comforted', emoji: '🤗' },
      { text: 'Behavior ignored', emoji: '🙈' },
      { text: 'Activity ended', emoji: '⏹️' },
      { text: 'Parent intervened', emoji: '👨‍👩‍👧‍👦' },
      { text: 'Discussion about behavior', emoji: '💬' },
      { text: 'Consequence explained', emoji: '📖' },
      { text: 'Redirection offered', emoji: '🔄' },
      { text: 'Positive reinforcement', emoji: '⭐' },
      { text: 'Alternative activity', emoji: '🆕' },
      { text: 'Calming technique used', emoji: '🧘' },
      { text: 'Given space', emoji: '🌌' },
      { text: 'Privilege removed', emoji: '🚫' },
      { text: 'Apology required', emoji: '🙏' },
      { text: 'Professional help considered', emoji: '👨‍⚕️' }
    ]
  };
  console.log('[GPT] Generic fallback:', genericFallback);
  return genericFallback;
}

// Helper function to get shuffled GPT options (similar to getShuffledOptions for behavior-specific)
export function getShuffledGPTOptions(gptSuggestions: ABCSuggestions | null, questionType: 'antecedents' | 'consequences', currentSet: number = 0): Array<{ text: string; emoji: string }> {
  if (!gptSuggestions || gptSuggestions.isFallback) {
    return [];
  }

  const allOptions = gptSuggestions[questionType];
  const optionsPerSet = 5; // Show 5 options at a time
  const startIndex = (currentSet * optionsPerSet) % allOptions.length;
  const endIndex = Math.min(startIndex + optionsPerSet, allOptions.length);
  
  return allOptions.slice(startIndex, endIndex);
}

// Helper function to get total number of GPT sets
export function getTotalGPTSets(gptSuggestions: ABCSuggestions | null, questionType: 'antecedents' | 'consequences'): number {
  if (!gptSuggestions || gptSuggestions.isFallback) {
    return 0;
  }

  return Math.ceil(gptSuggestions[questionType].length / 5);
}

// Analytics tracking
export async function trackGPTSuggestionUsage(behaviour: string, suggestionType: 'antecedent' | 'consequence', selectedSuggestion: string) {
  try {
    const analyticsKey = 'gpt_suggestion_analytics';
    const existing = await AsyncStorage.getItem(analyticsKey);
    const analytics = existing ? JSON.parse(existing) : [];
    
    analytics.push({
      behaviour,
      suggestionType,
      selectedSuggestion,
      timestamp: Date.now(),
      source: 'gpt'
    });
    
    await AsyncStorage.setItem(analyticsKey, JSON.stringify(analytics));
  } catch (error) {
    console.error('[Analytics] Failed to track GPT suggestion usage:', error);
  }
} 