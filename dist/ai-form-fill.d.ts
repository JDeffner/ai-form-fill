/**
 * Global defaults for the library. Mutate any field to change behaviour for all
 * instances created afterwards.
 *
 * @example
 * ```typescript
 * import { affConfig } from 'ai-form-fill';
 *
 * affConfig.ollama.model = 'mistral';          // change a default model
 * affConfig.apiBase = 'https://my-app.com/api'; // point remote providers at your proxy
 * affConfig.debug = true;                        // turn on logging everywhere
 * ```
 */
export declare const affConfig: {
    /**
     * Base URL of your backend proxy for all remote (OpenAI-compatible)
     * providers. Each provider appends `/<name>/chat` etc. to this.
     */
    apiBase: string;
    /** Default request timeout in milliseconds. */
    timeout: number;
    /** Enable console logging across the library. */
    debug: boolean;
    /** Ollama runs locally, so it has its own endpoint. */
    ollama: {
        apiEndpoint: string;
        model: string;
    };
    /** Default model for each built-in remote preset. */
    openai: {
        model: string;
    };
    perplexity: {
        model: string;
    };
    openrouter: {
        model: string;
    };
};

/**
 * AI-powered form filling.
 *
 * - Extract structured data from unstructured text and fill a whole form.
 * - Generate content for a single field.
 * - Works with any {@link AIProvider} (built-in or custom).
 */
export declare class AIFormFill {
    private provider;
    private selectedFields?;
    /**
     * @param provider - A built-in provider name or a custom {@link AIProvider}.
     * @param options - Field targeting, debug, and provider overrides.
     */
    constructor(provider: AvailableProviders | AIProvider, options?: AIFormFillConfig & Partial<ProviderConfig>);
    /**
     * Generate and set content for a single field, inferred from its label,
     * name, placeholder and type. Useful when there is no source text.
     *
     * @param element - The input, textarea or select to fill.
     */
    fillSingleField(element: HTMLElement): Promise<void>;
    /**
     * Parse unstructured text and fill every matching field in the form.
     *
     * @param formElement - The form to fill.
     * @param unstructuredText - Source text (resume, email, description, ...).
     */
    parseAndFillForm(formElement: HTMLFormElement, unstructuredText: string): Promise<void>;
    /** List the models offered by the current provider. */
    getAvailableModels(): Promise<string[]>;
    /** Select the model to use, validated against the provider when possible. */
    setSelectedModel(modelName: string): Promise<boolean>;
    /** The currently selected model. */
    getSelectedModel(): string;
    /** Restrict filling to these field names, or pass `undefined` to fill all. */
    setFields(fields: string[] | undefined): void;
    /** The field names currently targeted, or `undefined` if all are targeted. */
    getFields(): string[] | undefined;
    /** Whether the current provider is reachable. */
    providerAvailable(): Promise<boolean>;
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
     * Whitelist of field names to fill. If omitted, all detected fields are
     * filled.
     */
    targetFields?: string[];
    /** Enable console logging for this instance (sets the global debug flag). */
    debug?: boolean;
};

/**
 * Base class that every AI provider extends.
 *
 * A provider is responsible for:
 * - making the network call to its service,
 * - translating the common {@link ChatRequest} / {@link ChatResponse} shapes
 *   to and from the service's own format,
 * - reporting which models it offers and whether it is reachable.
 */
export declare abstract class AIProvider {
    /** Stable, lowercase identifier for the provider (e.g. `ollama`). */
    protected abstract readonly providerName: string;
    /** Whether the provider runs locally or remotely. */
    protected abstract readonly providerType: ProviderType;
    /** Whether the provider can enforce a JSON schema on its output. */
    protected supportsStructured: boolean;
    protected selectedModel: string;
    protected apiEndpoint: string;
    protected timeout: number;
    constructor(config?: ProviderConfig);
    /**
     * Send a chat request and return the normalised response.
     * @param request - Messages, model and optional structured-output schema.
     */
    abstract chat(request: ChatRequest): Promise<ChatResponse>;
    /** List the model identifiers this provider currently offers. */
    abstract listModels(): Promise<string[]>;
    /** Resolve to `true` if the provider is reachable. */
    abstract isAvailable(): Promise<boolean>;
    /** The provider's identifier (e.g. `ollama`, `openrouter`). */
    getName(): string;
    /** Whether the provider is `local` or `remote`. */
    getType(): ProviderType;
    /** The model currently selected for requests. */
    getSelectedModel(): string;
    /**
     * Select a model, validating against {@link listModels} when possible.
     * Falls back to setting it unvalidated if the list cannot be fetched.
     * @returns `true` if the model was set.
     */
    setSelectedModel(modelName: string): Promise<boolean>;
    /** Whether the provider supports structured (JSON schema) output. */
    supportsStructuredOutput(): boolean;
}

/**
 * Extract metadata (type, name, label, placeholder, hint) from a field element.
 */
export declare function analyzeField(element: HTMLElement): FieldInfo;

/**
 * Built-in provider names accepted by the {@link AIFormFill} constructor.
 */
export declare type AvailableProviders = 'ollama' | 'openai' | 'perplexity' | 'openrouter';

/**
 * Build a prompt for generating content for a single field, based on its label,
 * name, type, placeholder and pattern.
 *
 * @param field - The field to describe.
 * @param context - Optional extra instructions for the AI.
 */
export declare function buildFieldPrompt(field: FieldInfo, context?: string): string;

/**
 * Build a prompt that asks the AI to extract data from unstructured text and map
 * it onto the given form fields, returning a JSON object keyed by field name.
 */
export declare function buildParsePrompt(clientFieldInfos: FieldInfo[], unstructuredText: string): string;

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
    format?: Record<string, any>;
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
 * Metadata extracted from a form field.
 */
export declare type FieldInfo = {
    element: HTMLElement;
    type: string;
    name?: string;
    label?: string;
    placeholder?: string;
    pattern?: string;
    hint?: string;
    /** For radio groups: the available options. */
    options?: Array<{
        value: string;
        label: string;
    }>;
};

/**
 * Build a JSON Schema from form fields for structured AI output. Keys match
 * {@link getFieldIdentifier} so they line up with the fill step.
 */
export declare function generateFormSchema(fields: FieldInfo[]): Record<string, any>;

/**
 * The best identifier for a field: name, then label, then placeholder,
 * else `'unknown'`.
 */
export declare function getFieldIdentifier(field: FieldInfo): string;

/**
 * Return every fillable field in a form. Radio buttons are grouped by name into
 * a single {@link FieldInfo} carrying all options.
 */
export declare function getFillTargets(formElement: HTMLFormElement): FieldInfo[];

export declare function initializeAFFQuick(formId?: string): void;

/**
 * Returns true if the string is valid JSON.
 */
export declare function isValidJson(str: string): boolean;

/**
 * Provider for a locally running Ollama instance.
 *
 * @example
 * ```typescript
 * const provider = new LocalOllamaProvider({
 *   apiEndpoint: 'http://localhost:11434',
 *   model: 'gemma3:4b',
 * });
 * ```
 * @see {@link https://docs.ollama.com/api | Ollama API Documentation}
 */
export declare class LocalOllamaProvider extends AIProvider {
    protected readonly providerName: string;
    protected readonly providerType: ProviderType;
    protected supportsStructured: boolean;
    private readonly chatEndpoint;
    private readonly tagsEndpoint;
    constructor(config?: ProviderConfig);
    chat(request: ChatRequest): Promise<ChatResponse>;
    listModels(): Promise<string[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * Built-in presets for OpenAI-compatible services. The preset is used as the
 * route segment on your backend proxy (`/<preset>/chat`) and to look up the
 * default model in {@link affConfig}.
 */
export declare type OpenAICompatiblePreset = 'openai' | 'perplexity' | 'openrouter';

/**
 * One provider for every OpenAI-compatible service.
 *
 * OpenAI, Perplexity and OpenRouter share the same request and response format,
 * so they only differ by a name and a default model. Requests are sent to your
 * own backend proxy at `${apiEndpoint}/${name}/chat` so the API key never
 * reaches the browser.
 *
 * @example
 * ```typescript
 * const openai = new OpenAICompatibleProvider('openai');
 * const router = new OpenAICompatibleProvider('openrouter', { model: 'anthropic/claude-3.5-sonnet' });
 * // Any other OpenAI-compatible service:
 * const custom = new OpenAICompatibleProvider('myservice', { apiEndpoint: '/api', model: 'x' });
 * ```
 */
export declare class OpenAICompatibleProvider extends AIProvider {
    protected readonly providerName: string;
    protected readonly providerType: ProviderType;
    protected supportsStructured: boolean;
    private readonly chatEndpoint;
    private readonly listModelsEndpoint;
    private readonly availabilityEndpoint;
    /**
     * @param name - A preset (`openai` | `perplexity` | `openrouter`) or any
     *   custom route name handled by your proxy.
     * @param config - Optional endpoint / model / timeout overrides.
     */
    constructor(name?: OpenAICompatiblePreset | string, config?: ProviderConfig);
    chat(request: ChatRequest): Promise<ChatResponse>;
    listModels(): Promise<string[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * Utility functions for parsing JSON responses from AI providers
 */
/**
 * Parses JSON from AI responses, handling markdown code blocks and formatting issues.
 * Returns empty object if parsing fails.
 */
export declare function parseJsonResponse(aiResponse: string): Record<string, string>;

/**
 * User-facing configuration options accepted by every provider.
 */
export declare interface ProviderConfig {
    /** Base URL the provider talks to (a local runtime, or your backend proxy). */
    apiEndpoint?: string;
    /** Model identifier to use for requests. */
    model?: string;
    /** Request timeout in milliseconds. */
    timeout?: number;
}

/**
 * Whether a provider runs on the user's machine (`local`) or behind a remote
 * service (`remote`). Used purely as metadata, e.g. for UI grouping.
 */
export declare type ProviderType = 'local' | 'remote';

/**
 * Set a field's value and trigger change events for framework reactivity.
 * Handles text, checkbox, radio, date/time and select inputs.
 */
export declare function setFieldValue(element: HTMLElement, value: string): void;

/**
 * System prompts that set the AI's behaviour for each task.
 */
export declare const SYSTEM_PROMPTS: {
    /** Single-field generation: return only the value. */
    readonly FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.";
    /** Data extraction: return only valid JSON. */
    readonly PARSE_EXTRACT: "You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return \"true\" if it should be checked, otherwise return \"false\" or omit the field.";
};

export { }
