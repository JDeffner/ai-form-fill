/**
 * Core types and interfaces for the AI Form Input library
 */

import type { AIProvider } from "../providers/aiProvider";

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
  model: string;
  maxTokens?: number;
  format?: Record<string, any>; // For structured output formats
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
 * @example Basic usage
 * ```typescript
 * const config: AIFormFillConfig = {
 *   debug: true
 * };
 * ```
 * 
 * @example With field filtering
 * ```typescript
 * const config: AIFormFillConfig = {
 *   fields: ['firstName', 'lastName', 'email'],
 *   debug: true
 * };
 * ```
 */
export type AIFormFillConfig = {
  /** 
   * Optional array of field names to target.
   * If provided, only these fields will be filled (whitelist).
   * If omitted, all detected fields are filled.
   */
  targetFields?: string[];

  /** 
   * Optional array of allowed AI providers.
   * If provided, only these providers can be used.
   */
  allowedProviders?: AIProvider[];
  
  /** Enable console logging for debugging (default: false) */
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
  pattern?: string;
  hint?: string;
  /** For radio buttons: array of available options with value and label */
  options?: Array<{ value: string; label: string }>;
}

/**
 * All currently implemented provider names
 */
export type AvailableProviders = 'openai' | 'ollama' | 'perplexity';
