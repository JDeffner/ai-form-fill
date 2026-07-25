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
  /** Abort signal, merged with the provider's timeout. */
  signal?: AbortSignal;
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
   * Whitelist of field keys to fill (keys are name-first, so targeting by
   * `name` attribute works naturally). If omitted, all detected fields are
   * filled.
   */
  targetFields?: string[];

  /** Enable console logging for this instance only. */
  debug?: boolean;
};

/**
 * A selectable option of a select, radio group or checkbox group.
 */
export type FieldOption = {
  /** The value submitted with the form. */
  value: string;
  /** The human-visible label. */
  label: string;
};

/**
 * Metadata extracted from a form field.
 */
export type FieldInfo = {
  element: HTMLElement;
  /**
   * Stable identifier used consistently in the prompt, the JSON schema and the
   * fill step. Derived as `name` → `id` → `field_<index>`, deduplicated on
   * collision (`email`, `email_2`).
   */
  key: string;
  type: string;
  name?: string;
  label?: string;
  placeholder?: string;
  pattern?: string;
  hint?: string;
  /** For selects, radio groups and checkbox groups: the available options. */
  options?: FieldOption[];
  /** True when the field accepts multiple values (checkbox group, `<select multiple>`). */
  multiple?: boolean;
};

/**
 * Why a field was skipped during {@link AIFormFill.fillForm}.
 */
export type SkipReason =
  /** The model returned null/empty or an explicit "no value" marker. */
  | 'empty-value'
  /** A date/time value did not match the required ISO format. */
  | 'invalid-date-format'
  /** No option of a select/radio/checkbox group matched the value. */
  | 'no-matching-option'
  /** The value's type cannot be applied to this field (e.g. an object). */
  | 'unsupported-value';

/**
 * Outcome of a {@link AIFormFill.extract} call: what the model produced,
 * before anything is written to the form.
 */
export type ExtractResult = {
  /** The parsed model output, keyed by {@link FieldInfo.key}. */
  data: Record<string, unknown>;
  /** The fields the extraction schema was built from, in document order. */
  fields: FieldInfo[];
  /** The raw model output, for debugging. */
  raw: string;
};

/**
 * Outcome of a {@link AIFormFill.fillForm} call.
 */
export type FillResult = {
  /** Fields that were written, with the value that was applied. */
  filled: Array<{ key: string; element: HTMLElement; value: string | string[] }>;
  /** Fields the model answered for but whose value could not be applied. */
  skipped: Array<{ key: string; reason: SkipReason }>;
  /** Keys in the model's response that match no form field. */
  unmatchedKeys: string[];
  /** The raw model output, for debugging. */
  raw: string;
};

/**
 * Built-in provider names accepted by the {@link AIFormFill} constructor.
 */
export type BuiltInProviderName = 'ollama' | 'openai' | 'perplexity' | 'openrouter';
