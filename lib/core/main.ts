/**
 * AI Form Fill - framework-agnostic AI-powered form filling.
 * Public entry point.
 */

// Core
export { AIFormFill } from './aiFormFill';
export { affConfig } from './config';
export type {
  AIFormFillConfig,
  FieldInfo,
  AvailableProviders,
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './types';

// Providers
export { AIProvider } from '../providers/aiProvider';
export type { ProviderConfig, ProviderType } from '../providers/aiProvider';
export { LocalOllamaProvider } from '../providers/localOllama';
export {
  OpenAICompatibleProvider,
  type OpenAICompatiblePreset,
} from '../providers/openAICompatible';

// Utilities
export {
  analyzeField,
  getFillTargets,
  setFieldValue,
  getFieldIdentifier,
} from '../utils/fieldUtils';
export {
  buildFieldPrompt,
  buildParsePrompt,
  SYSTEM_PROMPTS,
  generateFormSchema,
} from '../utils/prompts';
export { parseJsonResponse, isValidJson } from '../utils/jsonParser';

// Quick setup
export { initializeAFFQuick } from './initialize';
