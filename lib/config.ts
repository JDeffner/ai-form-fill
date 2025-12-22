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
 * config.providers.ollama.apiEndpoint = 'http://my-server:11434';
 * 
 * // Change OpenAI to use real API
 * config.providers.openai.apiEndpoint = 'https://api.openai.com/v1';
 * config.providers.openai.model = 'gpt-4';
 * ```
 */
export let affConfig = {
  /**
   * Provider-specific default configurations
   * These can be overridden globally or per-instance
   */
  providers: {
    ollama: {
      apiEndpoint: 'http://localhost:11434',
      model: 'gemma3:4b',
      timeout: 30000,
      chatEndpoint: '/api/chat',
      listModelsEndpoint: '/api/tags',
      availabilityEndpoint: '/api/tags',
    },
    openai: {
      apiEndpoint: 'http://localhost:5173/api',
      model: 'gpt-5-nano',
      timeout: 60000,
      chatEndpoint: undefined,
      listModelsEndpoint: undefined,
      availabilityEndpoint: undefined,
    },
    perplexity: {
      apiEndpoint: 'http://localhost:5173/api',
      model: 'sonar',
      timeout: 60000,
      chatEndpoint: undefined,
      listModelsEndpoint: undefined,
      availabilityEndpoint: undefined,
    },
  },

  
  /**
   * Global library defaults
   */
  defaults: {
    debug: true,
    timeout: 30000,
  },
};