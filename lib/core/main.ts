/**
 * AI Form Input Library
 * Framework-agnostic library for AI-powered form filling
 */

// Core
export { AIFormFill } from './aiFormFill';
export type {
  AIFormFillConfig,
  FieldInfo,
  AvailableProviders,
} from './types';

// Configuration
export { affConfig } from './config';

// Provider interface and types
export type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './types';
export { AIProvider } from '../providers/aiProvider';
export type { ProviderConfig, ProviderType } from '../providers/aiProvider';

// Built-in providers
export { LocalOllamaProvider } from '../providers/localOllama';
export { OpenAIProvider } from '../providers/openai';
export { PerplexityProvider } from '../providers/perplexity';

// Utils
export { analyzeField, getFillTargets, setFieldValue, getFieldIdentifier } from '../utils/fieldUtils';
export { buildFieldPrompt, buildParsePrompt, SYSTEM_PROMPTS } from '../utils/prompts';
export { parseJsonResponse, isValidJson } from '../utils/jsonParser';

// Initialization script
export { initializeAFFQuick } from './initialize';
