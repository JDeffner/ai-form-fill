/**
 * Frozen library defaults. These are used as constructor fallbacks; all actual
 * configuration is per-instance and resolved once at construction time.
 *
 * @example
 * ```typescript
 * import { AFF_DEFAULTS, OllamaProvider } from 'ai-form-fill';
 *
 * // Override a default per instance:
 * const provider = new OllamaProvider({ model: 'mistral' });
 * // Read a default:
 * console.log(AFF_DEFAULTS.ollama.baseUrl); // http://localhost:11434
 * ```
 */
export const AFF_DEFAULTS = Object.freeze({
  /** Default request timeout in milliseconds. */
  timeout: 30000,

  /** Ollama runs locally and is talked to directly. */
  ollama: Object.freeze({
    baseUrl: 'http://localhost:11434',
    model: 'gemma3:4b',
  }),

  /** Built-in OpenAI-compatible presets: default base URL and model. */
  openai: Object.freeze({
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5-nano',
  }),
  perplexity: Object.freeze({
    baseUrl: 'https://api.perplexity.ai',
    model: 'sonar',
  }),
  openrouter: Object.freeze({
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
  }),
} as const);
