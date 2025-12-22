/**
 * Core types and interfaces for the AI Form Input library
 */

/**
 * A single message in a chat conversation
 * 
 * @param role - The role of the message sender (system, user, or assistant)
 * @param content - The content of the message
 */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Parameters for a chat completion request
 */
export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
}

/**
 * Response from a chat completion request
 */
export type ChatResponse = {
  content: string | null;
  model?: string;
  finishReason?: string;
}

/**
 * Configuration for the AIFormFill class
 * 
 * @param provider - The AI provider instance to use
 * @param fields - Optional array of field names to target (if omitted, all fields are filled)
 * @param debug - Enable console logging for debugging (default: false)
 */
export type AIFormFillConfig = {
  fields?: string[];
  debug?: boolean;
}

/**
 * Information about a form field
 */
export type FieldInfo = {
  element: HTMLElement;
  type: string;
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  pattern?: string;
}

/**
 * All currently implemented provider names
 */
export type AvailableProviders = 'OpenAI' | 'Ollama' | 'Perplexity';
