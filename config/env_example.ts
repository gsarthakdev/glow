

export const ENV = {
    OPENAI_API_KEY: 'openai-api-key-here', // Replace with your actual API key
    OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  };
  
  // Helper to get API key with validation
  export function getOpenAIAPIKey(): string {
    const key = ENV.OPENAI_API_KEY;
    if (!key || key === 'your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured. Please add your API key to config/env.ts');
    }
    return key;
  } 