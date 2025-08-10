// Environment configuration
// Uses environment variables for production builds, with fallbacks for development

// For EAS builds, these will be available as environment variables
// For local development, you can use a .env file or set them manually
export const ENV = {
  OPENAI_API_KEY: process.env.EXPO_PRIVATE_OPENAI_API_KEY || '',
  OPENAI_API_URL: process.env.EXPO_PUBLIC_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
};

// Helper to get API key with validation
export function getOpenAIAPIKey(): string {
  const key = ENV.OPENAI_API_KEY;
  if (!key || key === '') {
    throw new Error('OpenAI API key not configured. Please set EXPO_PRIVATE_OPENAI_API_KEY environment variable');
  }
  return key;
} 