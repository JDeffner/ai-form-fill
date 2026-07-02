/**
 * Global defaults for the library. Mutate any field to change behaviour for all
 * instances created afterwards.
 *
 * @example
 * ```typescript
 * import { affConfig } from 'ai-form-fill';
 *
 * affConfig.ollama.model = 'mistral';          // change a default model
 * affConfig.apiBase = 'https://my-app.com/api'; // point remote providers at your proxy
 * affConfig.debug = true;                        // turn on logging everywhere
 * ```
 */
export const affConfig = {
  /**
   * Base URL of your backend proxy for all remote (OpenAI-compatible)
   * providers. Each provider appends `/<name>/chat` etc. to this.
   */
  apiBase: 'http://localhost:5173/api',

  /** Default request timeout in milliseconds. */
  timeout: 30000,

  /** Enable console logging across the library. */
  debug: false,

  /** Ollama runs locally, so it has its own endpoint. */
  ollama: {
    apiEndpoint: 'http://localhost:11434',
    model: 'gemma3:4b',
  },

  /** Default model for each built-in remote preset. */
  openai: { model: 'gpt-5-nano' },
  perplexity: { model: 'sonar' },
  openrouter: { model: 'openai/gpt-4o-mini' },
};
