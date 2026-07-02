/**
 * Core types shared across the library.
 */

/**
 * A single message in a chat conversation.
 */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Parameters for a chat completion request.
 */
export type ChatRequest = {
  messages: ChatMessage[];
  model: string;
  maxTokens?: number;
  /** JSON schema for structured output, when the provider supports it. */
  format?: Record<string, unknown>;
};

/**
 * Normalised response from a chat completion request.
 */
export type ChatResponse = {
  content: string | null;
  model?: string;
  finishReason?: string;
};

/**
 * Options for the {@link AIFormFill} class.
 */
export type AIFormFillConfig = {
  /**
   * Whitelist of field names to fill. If omitted, all detected fields are
   * filled.
   */
  targetFields?: string[];

  /** Enable console logging for this instance (sets the global debug flag). */
  debug?: boolean;
};

/**
 * Metadata extracted from a form field.
 */
export type FieldInfo = {
  element: HTMLElement;
  type: string;
  name?: string;
  label?: string;
  placeholder?: string;
  pattern?: string;
  hint?: string;
  /** For radio groups: the available options. */
  options?: Array<{ value: string; label: string }>;
};

/**
 * Built-in provider names accepted by the {@link AIFormFill} constructor.
 */
export type BuiltInProviderName = 'ollama' | 'openai' | 'perplexity' | 'openrouter';
