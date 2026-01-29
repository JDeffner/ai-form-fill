/**
 * Default configuration for AI Form Input library
 * 
 * Users can modify these defaults by importing and changing values:
 * 
 * @example
 * ```typescript
 * import { config } from 'ai-form-input';
 * 
 * // Change Ollama default endpoint
 * config.ollama.apiEndpoint = 'http://my-server:11434';
 * 
 * // Change OpenAI to use real API
 * config.openai.apiEndpoint = 'https://api.openai.com/v1';
 * config.openai.model = 'gpt-4';
 * ```
 */
export let affConfig = {
  ollama: {
    apiEndpoint: 'http://localhost:11434',  
    model: 'gemma3:4b',
  },
  openai: {
    apiEndpoint: 'http://localhost:5173/api', // http://localhost:5173/api for local testing proxy
    model: 'gpt-5-nano',
  },
  perplexity: {
    apiEndpoint: 'http://localhost:5173/api', // http://localhost:5173/api for local testing proxy
    model: 'sonar',
  },

  providerDebug: true,
  formFillDebug: true,
  timeout: 30000,
};
