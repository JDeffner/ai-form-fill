/**
 * AI Form Fill - framework-agnostic AI-powered form filling.
 * Public entry point.
 */

// Core
export { AIFormFill } from './core/ai-form-fill';
export { affConfig } from './core/defaults';
export type {
  AIFormFillConfig,
  FieldInfo,
  BuiltInProviderName,
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from './core/types';

// Providers
export { AIProvider } from './providers/provider';
export type { ProviderConfig, ProviderType } from './providers/provider';
export { OllamaProvider } from './providers/ollama';
export {
  OpenAICompatibleProvider,
  type OpenAICompatiblePreset,
} from './providers/openai-compatible';

// Form engine
export { analyzeField, getFormFields, getFieldIdentifier } from './form/analyze';
export { applyFieldValue } from './form/apply';

// Prompt & schema building, response parsing
export {
  buildFieldPrompt,
  buildExtractionPrompt,
  SYSTEM_PROMPTS,
  buildFormSchema,
} from './prompt/build';
export { parseModelResponse, isValidJson } from './prompt/parse-response';

// Quick setup
export { initializeAFFQuick } from './core/auto-init';
