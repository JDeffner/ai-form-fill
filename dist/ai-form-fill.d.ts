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
export declare const AFF_DEFAULTS: Readonly<{
    /** Default request timeout in milliseconds. */
    readonly timeout: 30000;
    /** Ollama runs locally and is talked to directly. */
    readonly ollama: Readonly<{
        baseUrl: "http://localhost:11434";
        model: "gemma3:4b";
    }>;
    /** Built-in OpenAI-compatible presets: default base URL and model. */
    readonly openai: Readonly<{
        baseUrl: "https://api.openai.com/v1";
        model: "gpt-5-nano";
    }>;
    readonly perplexity: Readonly<{
        baseUrl: "https://api.perplexity.ai";
        model: "sonar";
    }>;
    readonly openrouter: Readonly<{
        baseUrl: "https://openrouter.ai/api/v1";
        model: "openai/gpt-4o-mini";
    }>;
}>;

/**
 * Typed errors thrown by the library. Catch {@link AFFError} to handle all of
 * them, or the subclasses to react to specific failure modes.
 */
/** Base class for all errors thrown by ai-form-fill. */
export declare class AFFError extends Error {
    constructor(message: string, options?: ErrorOptions);
}

/**
 * AI-powered form filling.
 *
 * - {@link fillForm}: extract structured data from unstructured text and fill
 *   a whole form, reporting the outcome as a {@link FillResult}.
 * - {@link fillField}: generate content for a single field.
 * - Works with any {@link AIProvider} (built-in or custom).
 *
 * Provider failures reject with `ProviderError`; unusable model output rejects
 * with `ResponseParseError`. Per-field application problems never throw — they
 * are collected in the {@link FillResult}.
 */
export declare class AIFormFill {
    private provider;
    private targetFields?;
    private readonly debug;
    /**
     * @param provider - A built-in provider name or a custom {@link AIProvider}.
     * @param options - Field targeting, debug, and provider configuration.
     */
    constructor(provider: BuiltInProviderName | AIProvider, options?: AIFormFillOptions);
    private log;
    /**
     * Generate and apply content for a single field, inferred from its label,
     * name, placeholder and type. Useful when there is no source text.
     *
     * @param element - The input, textarea or select to fill.
     * @param options - Optional abort signal.
     * @returns The applied value, or `null` when the model produced no usable value.
     * @throws ProviderError when the provider request fails.
     */
    fillField(element: HTMLElement, options?: FillOptions): Promise<{
        value: string;
    } | null>;
    /**
     * Parse unstructured text into field values **without touching the form**.
     *
     * This is the review path: show the user what the model produced, let them
     * accept or edit it, and only then write it. Apply an accepted value with
     * the exported `applyFieldValue(field.element, value)`.
     *
     * {@link fillForm} is exactly this call followed by applying every value.
     *
     * @param formElement - The form whose fields define the extraction schema.
     * @param text - Source text (resume, email, description, ...).
     * @param options - Optional abort signal.
     * @returns The extracted record, the fields it was built from, and the raw
     *   model output.
     * @throws ProviderError when the provider request fails.
     * @throws ResponseParseError when the model output is empty or not a JSON object.
     */
    extract(formElement: HTMLFormElement, text: string, options?: FillOptions): Promise<ExtractResult>;
    /**
     * Parse unstructured text and fill every matching field in the form.
     *
     * @param formElement - The form to fill.
     * @param text - Source text (resume, email, description, ...).
     * @param options - Optional abort signal.
     * @returns Which fields were filled, which were skipped and why, plus the
     *   raw model output.
     * @throws ProviderError when the provider request fails.
     * @throws ResponseParseError when the model output is empty or not a JSON object.
     */
    fillForm(formElement: HTMLFormElement, text: string, options?: FillOptions): Promise<FillResult>;
    /**
     * List the models offered by the current provider.
     * @throws ProviderError when the list cannot be fetched.
     */
    getAvailableModels(): Promise<string[]>;
    /**
     * Select the model to use. Validated against the provider's model list by
     * default; see {@link AIProvider.setSelectedModel}.
     */
    setSelectedModel(modelName: string, options?: {
        validate?: boolean;
    }): Promise<boolean>;
    /** The currently selected model. */
    getSelectedModel(): string;
    /** Restrict filling to these field keys, or pass `undefined` to fill all. */
    setFields(fields: string[] | undefined): void;
    /** The field keys currently targeted, or `undefined` if all are targeted. */
    getFields(): string[] | undefined;
    /** Whether the current provider is reachable. Never throws. */
    isProviderAvailable(): Promise<boolean>;
    /** Swap the active provider. */
    setProvider(provider: AIProvider): void;
    /** The active provider. */
    getProvider(): AIProvider;
    /** Build a built-in provider from its name. */
    private static createProvider;
}

/**
 * Options for the {@link AIFormFill} class.
 */
export declare type AIFormFillConfig = {
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
 * Options accepted by the {@link AIFormFill} constructor: field targeting and
 * debug plus provider configuration (baseUrl, model, timeout, apiKey, ...)
 * used when a built-in provider name is passed.
 */
export declare type AIFormFillOptions = AIFormFillConfig & OpenAICompatibleConfig;

/**
 * Base class that every AI provider extends.
 *
 * A provider is responsible for:
 * - making the network call to its service,
 * - translating the common {@link ChatRequest} / {@link ChatResponse} shapes
 *   to and from the service's own wire format,
 * - reporting which models it offers and whether it is reachable.
 *
 * Network failures surface as {@link ProviderError}.
 */
export declare abstract class AIProvider {
    /** Stable, lowercase identifier for the provider (e.g. `ollama`). */
    protected abstract readonly providerName: string;
    /** Whether the provider runs locally or remotely. */
    protected abstract readonly providerType: ProviderType;
    /** Whether the provider can enforce a JSON schema on its output. */
    protected supportsStructured: boolean;
    protected selectedModel: string;
    protected baseUrl: string;
    protected timeout: number;
    protected fetchImpl?: typeof fetch;
    constructor(config?: ProviderConfig);
    /**
     * Send a chat request and return the normalised response.
     * @param request - Messages, model, optional schema and abort signal.
     * @throws ProviderError on network/HTTP/timeout failures.
     */
    abstract chat(request: ChatRequest): Promise<ChatResponse>;
    /**
     * List the model identifiers this provider currently offers.
     * @throws ProviderError when the list cannot be fetched.
     */
    abstract listModels(): Promise<string[]>;
    /** Resolve to `true` if the provider is reachable. Never throws. */
    abstract isAvailable(): Promise<boolean>;
    /** The provider's identifier (e.g. `ollama`, `openrouter`). */
    getName(): string;
    /** Whether the provider is `local` or `remote`. */
    getType(): ProviderType;
    /** The model currently selected for requests. */
    getSelectedModel(): string;
    /**
     * Select a model.
     *
     * By default the name is validated against {@link listModels}: the model is
     * only set — and `true` returned — when it is actually offered. When the
     * model list cannot be fetched, nothing is set and `false` is returned.
     *
     * Pass `{ validate: false }` to set the model unvalidated (always `true`),
     * e.g. for providers whose model list endpoint is unavailable.
     */
    setSelectedModel(modelName: string, options?: {
        validate?: boolean;
    }): Promise<boolean>;
    /** Whether the provider supports structured (JSON schema) output. */
    supportsStructuredOutput(): boolean;
}

/**
 * Extract metadata (key, type, name, label, placeholder, options, hint) from a
 * field element. The key defaults to `name` → `id` → `field`;
 * {@link getFormFields} re-derives keys with per-form collision handling.
 */
export declare function analyzeField(element: HTMLElement): FieldInfo;

/**
 * Apply a model value to a field and trigger change events for framework
 * reactivity. Handles text, checkbox (single and group), radio, date/time and
 * select (single and multiple) inputs.
 *
 * Never throws for value problems — returns a discriminated result instead so
 * callers can report per-field outcomes.
 */
export declare function applyFieldValue(element: HTMLElement, value: unknown): ApplyResult;

/** Outcome of {@link applyFieldValue}. */
export declare type ApplyResult = {
    applied: true;
    value: string | string[];
} | {
    applied: false;
    reason: SkipReason;
};

/**
 * Wire up AI form filling for a page that follows the quick-start layout:
 *
 * - a `<form id="aff-form">` (id configurable) to fill,
 * - a `<textarea id="aff-text">` holding the source text,
 * - a button `#aff-text-button` that triggers the fill.
 *
 * The provider is read from the form's `data-aff-provider` attribute
 * (case-insensitive; defaults to `ollama`), the model from `data-aff-model`.
 *
 * @returns The created {@link AIFormFill} instance, or `null` (with a console
 *   warning, never an exception) when a required element is missing or the
 *   provider name is unknown.
 */
export declare function autoInit(options?: AutoInitOptions): AIFormFill | null;

/** Options for {@link autoInit}. */
export declare type AutoInitOptions = {
    /** Id of the form element to fill. Defaults to `aff-form`. */
    formId?: string;
    /** Provider to use; overrides the form's `data-aff-provider` attribute. */
    provider?: BuiltInProviderName;
    /** Model to use; overrides the form's `data-aff-model` attribute. */
    model?: string;
    /** Enable console logging. Defaults to `false`. */
    debug?: boolean;
};

/**
 * Build a prompt that asks the AI to extract data from unstructured text and
 * map it onto the given form fields, returning a JSON object keyed by
 * {@link FieldInfo.key}.
 */
export declare function buildExtractionPrompt(fields: FieldInfo[], unstructuredText: string): string;

/**
 * Build a prompt for generating content for a single field, based on its label,
 * name, type, placeholder and pattern.
 *
 * @param field - The field to describe.
 * @param context - Optional extra instructions for the AI.
 */
export declare function buildFieldPrompt(field: FieldInfo, context?: string): string;

/**
 * Build a JSON Schema from form fields for structured AI output. Property
 * names are the fields' {@link FieldInfo.key | keys} so they line up with the
 * fill step; option-based fields carry `enum` so structured-output providers
 * return exact option values.
 *
 * The schema is intentionally non-strict (no `required`): extraction is
 * optional per field.
 */
export declare function buildFormSchema(fields: FieldInfo[]): Record<string, unknown>;

/**
 * Built-in provider names accepted by the {@link AIFormFill} constructor.
 */
export declare type BuiltInProviderName = 'ollama' | 'openai' | 'perplexity' | 'openrouter';

/**
 * Core types shared across the library.
 */
/**
 * A single message in a chat conversation.
 */
export declare type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

/**
 * Parameters for a chat completion request.
 */
export declare type ChatRequest = {
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
export declare type ChatResponse = {
    content: string | null;
    model?: string;
    finishReason?: string;
};

/**
 * Outcome of a {@link AIFormFill.extract} call: what the model produced,
 * before anything is written to the form.
 */
export declare type ExtractResult = {
    /** The parsed model output, keyed by {@link FieldInfo.key}. */
    data: Record<string, unknown>;
    /** The fields the extraction schema was built from, in document order. */
    fields: FieldInfo[];
    /** The raw model output, for debugging. */
    raw: string;
};

/**
 * Metadata extracted from a form field.
 */
export declare type FieldInfo = {
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
 * A selectable option of a select, radio group or checkbox group.
 */
export declare type FieldOption = {
    /** The value submitted with the form. */
    value: string;
    /** The human-visible label. */
    label: string;
};

/** Per-call options for {@link AIFormFill.fillForm} / {@link AIFormFill.fillField}. */
export declare type FillOptions = {
    /** Cancels the provider request when aborted. */
    signal?: AbortSignal;
};

/**
 * Outcome of a {@link AIFormFill.fillForm} call.
 */
export declare type FillResult = {
    /** Fields that were written, with the value that was applied. */
    filled: Array<{
        key: string;
        element: HTMLElement;
        value: string | string[];
    }>;
    /** Fields the model answered for but whose value could not be applied. */
    skipped: Array<{
        key: string;
        reason: SkipReason;
    }>;
    /** Keys in the model's response that match no form field. */
    unmatchedKeys: string[];
    /** The raw model output, for debugging. */
    raw: string;
};

/**
 * Return every fillable field in a form, in DOM order.
 *
 * - Radio buttons sharing a `name` are grouped into one {@link FieldInfo}
 *   carrying all options.
 * - Checkboxes sharing a `name` are grouped into one multi-value field.
 * - Every field receives a stable, unique {@link FieldInfo.key}.
 */
export declare function getFormFields(formElement: HTMLFormElement): FieldInfo[];

/**
 * Returns true if the string is valid JSON.
 */
export declare function isValidJson(str: string): boolean;

/**
 * Provider for a locally running Ollama instance.
 *
 * @example
 * ```typescript
 * const provider = new OllamaProvider({
 *   baseUrl: 'http://localhost:11434',
 *   model: 'gemma3:4b',
 * });
 * ```
 * @see {@link https://docs.ollama.com/api | Ollama API Documentation}
 */
export declare class OllamaProvider extends AIProvider {
    protected readonly providerName: string;
    protected readonly providerType: ProviderType;
    protected supportsStructured: boolean;
    constructor(config?: ProviderConfig);
    chat(request: ChatRequest): Promise<ChatResponse>;
    listModels(): Promise<string[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * Configuration for {@link OpenAICompatibleProvider}.
 */
export declare interface OpenAICompatibleConfig extends ProviderConfig {
    /**
     * API key sent as `Authorization: Bearer <key>`.
     *
     * **Do not ship API keys in frontend code.** In the browser this option
     * throws unless {@link allowApiKeyInBrowser} is set; the production setup is
     * pointing {@link ProviderConfig.baseUrl | baseUrl} at your own
     * OpenAI-compatible passthrough proxy that injects the key server-side.
     */
    apiKey?: string;
    /**
     * Explicit opt-in to use {@link apiKey} in a browser context. Only for local
     * prototyping — anyone can read the key from the page.
     */
    allowApiKeyInBrowser?: boolean;
    /** Extra headers to send with every request. */
    headers?: Record<string, string>;
}

/**
 * Built-in presets for OpenAI-compatible services. A preset supplies a default
 * `baseUrl` and model (see {@link AFF_DEFAULTS}).
 */
export declare type OpenAICompatiblePreset = 'openai' | 'perplexity' | 'openrouter';

/**
 * Provider for OpenAI and any OpenAI-compatible service.
 *
 * Requests use the standard wire format: `POST {baseUrl}/chat/completions`
 * and `GET {baseUrl}/models`. Structured output is requested via
 * `response_format: { type: 'json_schema', ... }`.
 *
 * @example
 * ```typescript
 * // A preset, via your own passthrough proxy (recommended for production):
 * const openai = new OpenAICompatibleProvider('openai', { baseUrl: '/api/openai' });
 * // Direct with a key (prototyping only!):
 * const router = new OpenAICompatibleProvider('openrouter', {
 *   apiKey: '...',
 *   allowApiKeyInBrowser: true,
 * });
 * // Any other OpenAI-compatible service:
 * const local = new OpenAICompatibleProvider('lmstudio', {
 *   baseUrl: 'http://localhost:1234/v1',
 *   model: 'qwen2.5-7b-instruct',
 * });
 * ```
 */
export declare class OpenAICompatibleProvider extends AIProvider {
    protected readonly providerName: string;
    protected readonly providerType: ProviderType;
    protected supportsStructured: boolean;
    private readonly apiKey?;
    private readonly extraHeaders?;
    /**
     * @param name - A preset (`openai` | `perplexity` | `openrouter`) or any
     *   name for a custom OpenAI-compatible service (requires `baseUrl`).
     * @param config - baseUrl / apiKey / model / timeout / headers overrides.
     */
    constructor(name?: OpenAICompatiblePreset | (string & {}), config?: OpenAICompatibleConfig);
    private buildHeaders;
    chat(request: ChatRequest): Promise<ChatResponse>;
    listModels(): Promise<string[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * Parsing of model output into a field-value map.
 */
/**
 * Parse a model response into a key → value map, tolerating markdown code
 * fences around the JSON. Values keep their JSON types (string, number,
 * boolean, array) — coercion happens at fill time, per field type.
 *
 * @throws ResponseParseError when the response is not valid JSON or not a
 *   JSON object; the error carries the raw model output.
 */
export declare function parseModelResponse(rawResponse: string): Record<string, unknown>;

/**
 * User-facing configuration options accepted by every provider.
 */
export declare interface ProviderConfig {
    /** Base URL the provider talks to (a local runtime, an API, or your proxy). */
    baseUrl?: string;
    /** Model identifier to use for requests. */
    model?: string;
    /** Request timeout in milliseconds. */
    timeout?: number;
    /** Custom fetch implementation (testing, polyfills). */
    fetch?: typeof fetch;
}

/**
 * A provider request failed: network error, HTTP error status or timeout.
 * Carries the provider name and, for HTTP errors, the status code.
 */
export declare class ProviderError extends AFFError {
    /** Name of the provider that failed (e.g. `ollama`, `openai`). */
    readonly provider: string;
    /** HTTP status code, when the failure was an HTTP error response. */
    readonly status?: number;
    constructor(message: string, options: {
        provider: string;
        status?: number;
        cause?: unknown;
    });
}

/**
 * Whether a provider runs on the user's machine (`local`) or behind a remote
 * service (`remote`). Used purely as metadata, e.g. for UI grouping.
 */
export declare type ProviderType = 'local' | 'remote';

/**
 * Perform an HTTP request and parse the JSON response.
 *
 * Failures are translated into {@link ProviderError}: HTTP error status
 * (carries `status`), timeout, network failure and invalid JSON. An abort
 * triggered by the caller's own `signal` is re-thrown untranslated so callers
 * can distinguish cancellation from provider failure.
 */
export declare function requestJson<T>(url: string, options: RequestJsonOptions): Promise<T>;

/**
 * Shared HTTP helper for providers: JSON requests with a timeout, optional
 * caller-supplied AbortSignal and uniform ProviderError translation.
 */
export declare interface RequestJsonOptions {
    method?: 'GET' | 'POST';
    /** JSON-serialisable request body; sets Content-Type automatically. */
    body?: unknown;
    headers?: Record<string, string>;
    /** Timeout in milliseconds. */
    timeout: number;
    /** External abort signal, merged with the internal timeout controller. */
    signal?: AbortSignal;
    /** Provider name used in error messages. */
    provider: string;
    /** Custom fetch implementation (testing, polyfills). */
    fetchImpl?: typeof fetch;
}

/**
 * The model's response could not be interpreted (not valid JSON, or not a JSON
 * object). Carries the raw model output for debugging.
 */
export declare class ResponseParseError extends AFFError {
    /** The unmodified model output that failed to parse. */
    readonly raw: string;
    constructor(message: string, options: {
        raw: string;
        cause?: unknown;
    });
}

/**
 * Why a field was skipped during {@link AIFormFill.fillForm}.
 */
export declare type SkipReason = 
/** The model returned null/empty or an explicit "no value" marker. */
'empty-value'
/** A date/time value did not match the required ISO format. */
| 'invalid-date-format'
/** No option of a select/radio/checkbox group matched the value. */
| 'no-matching-option'
/** The value's type cannot be applied to this field (e.g. an object). */
| 'unsupported-value';

/**
 * System prompts that set the AI's behaviour for each task.
 */
export declare const SYSTEM_PROMPTS: {
    /** Single-field generation: return only the value. */
    readonly FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.";
    /** Data extraction: return only valid JSON. */
    readonly EXTRACT: "You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If a field is a checkbox, return true if it should be checked, otherwise return false or omit the field.";
};

export { }
