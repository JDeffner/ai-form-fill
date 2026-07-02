/**
 * AI Form Fill - framework-agnostic AI-powered form filling.
 * Public entry point.
 */

// Core
export { AIFormFill, type AIFormFillOptions, type FillOptions } from './core/ai-form-fill';
export { autoInit, type AutoInitOptions } from './core/auto-init';
export { AFF_DEFAULTS } from './core/defaults';
export { AFFError, ProviderError, ResponseParseError } from './core/errors';
export type {
  AIFormFillConfig,
  FieldInfo,
  FieldOption,
  FillResult,
  SkipReason,
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
  type OpenAICompatibleConfig,
} from './providers/openai-compatible';
export { requestJson, type RequestJsonOptions } from './providers/http';

// Form engine
export { analyzeField, getFormFields } from './form/analyze';
export { applyFieldValue, type ApplyResult } from './form/apply';

// Prompt & schema building, response parsing
export {
  buildFieldPrompt,
  buildExtractionPrompt,
  SYSTEM_PROMPTS,
  buildFormSchema,
} from './prompt/build';
export { parseModelResponse, isValidJson } from './prompt/parse-response';
