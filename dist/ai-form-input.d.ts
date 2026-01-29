/**
 * Default configuration for AI Form Input library
 *
 * Users can modify these defaults by importing and changing values:
 *
 * @example
 * ```typescript
 * import { config } from 'ai-form-input';
 *
 * // Change Ollama default endpoint
 * config.ollama.apiEndpoint = 'http://my-server:11434';
 *
 * // Change OpenAI to use real API
 * config.openai.apiEndpoint = 'https://api.openai.com/v1';
 * config.openai.model = 'gpt-4';
 * ```
 */
export declare let affConfig: {
    ollama: {
        apiEndpoint: string;
        model: string;
    };
    openai: {
        apiEndpoint: string;
        model: string;
    };
    perplexity: {
        apiEndpoint: string;
        model: string;
    };
    providerDebug: boolean;
    formFillDebug: boolean;
    timeout: number;
};

/**
 * Main class for AI-powered form input
 *
 * Provides high-level methods for filling forms using AI. Supports:
 * - Extracting structured data from unstructured text
 * - Filling entire forms automatically
 * - Generating content for individual fields
 * - Multiple AI providers (Ollama, OpenAI, custom)
 *
 */
export declare class AIFormFill {
    private provider;
    private allowedProviders?;
    private selectedFields?;
    constructor(desiredProvider: AvailableProviders | AIProvider, options?: AIFormFillConfig & Partial<ProviderConfig>);
    /**
     * Fill a single form field with AI-generated content
     *
     * Generates appropriate content for one field based on its label, name,
     * placeholder, and type. Useful for creative content or when you don't
     * have source text to extract from.
     *
     * @param element - The form field element to fill (input, textarea, or select)
     *
     * @example
     * ```typescript
     * const bioField = document.querySelector('#bio');
     * await aiForm.fillSingleField(bioField);
     * ```
     */
    fillSingleField(element: HTMLElement): Promise<void>;
    /**
     * Parse unstructured text and automatically fill matching form fields
     *
     * @param formElement - The HTML form to fill
     * @param unstructuredText - The source text to extract data from
     *   - Examples: Resume text, email body, paragraph descriptions, JSON strings
     */
    parseAndFillForm(formElement: HTMLFormElement, unstructuredText: string): Promise<void>;
    /**
     * Get list of available models from the form's provider
     */
    getAvailableModels(): Promise<string[]>;
    /**
     * Set the model to use for chat requests
     */
    setSelectedModel(modelName: string): Promise<boolean>;
    /**
     * Get the currently selected model
     */
    getSelectedModel(): string;
    /**
     * Set which fields should be filled
     */
    setFields(fields: string[] | undefined): void;
    /**
     * Get the currently configured field targets
     *
     * @returns Array of field names being targeted, or undefined if all fields are targeted
     */
    getFields(): string[] | undefined;
    /**
     * Check if the AI provider is available and responding
     *
     * @returns Promise resolving to true if provider is available, false otherwise
     */
    providerAvailable(): Promise<boolean>;
    /**
     * Change the AI provider
     */
    setProvider(provider: AIProvider): void;
    /**
     * Get the current AI provider
     */
    getProvider(): AIProvider;
    /**
     * Get the list of allowed providers, if any
     */
    getListOfAllowedProviders(): AIProvider[] | undefined;
    /**
     * Setup the AI provider based on the desired provider name
     */
    private static constructProviderWithName;
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
export declare type AIFormFillConfig = {
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
};

/**
 * Base class that all AI providers must extend
 *
 * Providers are responsible for:
 * - Making API calls to their respective AI services (using fetch, axios, SDKs, etc.)
 * - Translating provider-specific request/response formats to the standard ChatParams/ChatResponse
 * - Handling authentication, rate limiting, and error handling
 * - Implementing optional features like model listing and availability checks
 *
 * @see Documentation: {@link AIProvider}
 */
export declare abstract class AIProvider {
    protected abstract providerName: string;
    protected abstract providerType: ProviderType;
    /**
     * **Optional**: Concrete link to endpoint that sends chat messages
     */
    protected chatEndpoint?: string;
    /**
     * **Optional**: Concrete link to endpoint that lists available models
     */
    protected listModelsEndpoint?: string;
    /**
     * **Optional**: Concrete link to endpoint that checks API availability
     */
    protected availabilityEndpoint?: string;
    protected selectedModel: string;
    protected apiEndpoint: string;
    protected timeout: number;
    protected supportsStructuredResponses: boolean;
    constructor(config?: ProviderConfig);
    /**
     * Sends a message to a model of the AI provider and returns the response
     * @param params - The {@link ChatRequest | chat request} including messages, model, etc.
     * @returns A promise that resolves to a {@link ChatResponse}
     */
    abstract chat(params: ChatRequest): Promise<ChatResponse>;
    /** Returns the currently selected model. */
    getSelectedModel(): string;
    /**
     * Sets the model to use for chat requests. Validates against available models if possible.
     */
    setSelectedModel(modelName: string): Promise<boolean>;
    /**
     * Lists available provider models
     *
     * @returns The currently configured model(s) as a Promise resolving to an array of model names
     */
    abstract listModels(): Promise<string[]>;
    /**
     * **Optional**: Checks if the provider's API is accessible
     *
     * @returns Promise resolving to true if the API is accessible
     */
    abstract isAvailable(): Promise<boolean>;
    getName(): string;
    /**
     * Indicates if the provider supports structured output formats (e.g., JSON Schema)
     *
     * @returns true if structured output is supported, false otherwise
     */
    supportsStructuredOutput(): boolean;
}

/**
 * Extracts metadata from a form field element (type, name, label, placeholder, etc.).
 */
export declare function analyzeField(element: HTMLElement): FieldInfo;

/**
 * All currently implemented provider names
 */
export declare type AvailableProviders = 'openai' | 'ollama' | 'perplexity';

/**
 * Build a prompt for filling a single form field
 *
 * Constructs a detailed prompt that describes the field's purpose, type,
 * validation rules, and any additional context. Used by fillSingleField().
 *
 * @param field - The FieldInfo object describing the field
 * @param context - Optional additional context or instructions for the AI
 * @returns A formatted prompt string ready for the AI
 *
 * @example
 * ```typescript
 * const field = {
 *   label: 'Professional Bio',
 *   type: 'textarea',
 *   placeholder: 'Tell us about yourself...',
 *   required: true
 * };
 *
 * const prompt = buildFieldPrompt(field, 'Make it friendly and professional');
 * // Returns detailed prompt including label, type, requirements, and context
 * ```
 */
export declare function buildFieldPrompt(field: FieldInfo, context?: string): string;

/**
 * Builds a prompt for AI to extract data from unstructured text into form fields.
 */
export declare function buildParsePrompt(clientFieldInfos: FieldInfo[], unstructuredText: string): string;

/**
 * A single message in a chat conversation
 *
 * @param role - The role of the message sender (system, user, or assistant)
 * @param content - The content of the message
 */
export declare type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

/**
 * Parameters for a chat completion request
 */
export declare type ChatRequest = {
    messages: ChatMessage[];
    model: string;
    maxTokens?: number;
    format?: Record<string, any>;
};

/**
 * Response from a chat completion request
 */
export declare type ChatResponse = {
    content: string | null;
    model?: string;
    finishReason?: string;
};

/**
 * Information about a form field
 */
export declare type FieldInfo = {
    element: HTMLElement;
    type: string;
    name?: string;
    label?: string;
    placeholder?: string;
    pattern?: string;
    hint?: string;
    /** For radio buttons: array of available options with value and label */
    options?: Array<{
        value: string;
        label: string;
    }>;
};

/**
 * Returns the best identifier for a field (name > label > placeholder > 'unknown').
 */
export declare function getFieldIdentifier(field: FieldInfo): string;

/**
 * Returns all fillable fields from a form (inputs, textareas, selects).
 * Radio buttons are grouped by name into a single FieldInfo with options.
 */
export declare function getFillTargets(formElement: HTMLFormElement): FieldInfo[];

export declare function initializeAFFQuick(formId?: string): void;

/**
 * Returns true if the string is valid JSON.
 */
export declare function isValidJson(str: string): boolean;

/**
 * @extension Extend this class for providers that run locally (e.g., Ollama, LocalAI)
 */
declare abstract class LocalAIProvider extends AIProvider {
    readonly providerType: ProviderType;
}

/**
 * Provider implementation for locally running Ollama instance
 *
 * Ollama is a popular local AI runtime that supports many open-source models.
 * This implementation uses the Ollama REST API with no external dependencies.
 *
 * @example
 * ```typescript
 * const provider = new LocalOllamaProvider({
 *   apiEndpoint: 'http://localhost:11434',
 *   model: 'gemma3:4b',
 *   timeout: 30000,
 * });
 * ```
 * @see {@link https://docs.ollama.com/api/introduction | Ollama API Documentation}
 */
export declare class LocalOllamaProvider extends LocalAIProvider {
    protected providerName: string;
    protected supportsStructuredResponses: boolean;
    protected chatEndpoint: string;
    protected listModelsEndpoint: string;
    protected availabilityEndpoint: string;
    constructor(config?: ProviderConfig);
    chat(params: ChatRequest): Promise<ChatResponse>;
    listModels(): Promise<string[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * Provider implementation for OpenAI's API
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   model: 'gpt-5-nano',
 *   timeout: 60000,
 * });
 * ```
 * @see {@link https://platform.openai.com/docs/guides/text?prompt-templates-examples=filevar | OpenAI API Documentation}
 */
export declare class OpenAIProvider extends RemoteAIProvider {
    protected providerName: string;
    protected supportsStructuredResponses: boolean;
    protected chatEndpoint: string;
    protected listModelsEndpoint: string;
    protected availabilityEndpoint: string;
    constructor(config?: ProviderConfig);
    chat(params: ChatRequest): Promise<ChatResponse>;
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
 * Provider implementation for Perplexity AI's API
 *
 * @see {@link https://docs.perplexity.ai/getting-started/overview | Perplexity API Documentation}
 */
export declare class PerplexityProvider extends OpenAIProvider {
    protected providerName: string;
    constructor(config?: ProviderConfig);
}

/**
 * Configuration options for AI providers.
 */
export declare interface ProviderConfig {
    apiEndpoint?: string;
    model?: string;
    timeout?: number;
    chatEndpoint?: string;
    listModelsEndpoint?: string;
    availabilityEndpoint?: string;
}

export declare type ProviderType = 'local' | 'remote';

/**
 * @extension Extend this class for providers that run remotely (e.g., OpenAI, Perplexity)
 */
declare abstract class RemoteAIProvider extends AIProvider {
    readonly providerType: ProviderType;
}

/**
 * Sets the value of a form field and triggers change events for framework reactivity.
 */
export declare function setFieldValue(element: HTMLElement, value: string): void;

/**
 * System prompts for different AI tasks
 *
 * Predefined system messages that set the AI's behavior for specific tasks.
 * These are sent as the first message in every conversation to establish
 * the AI's role and response format.
 *
 * @property FIELD_FILL - For single field generation tasks
 *   - Instructs AI to return only the value, no explanations
 *   - Used by fillSingleField()
 *
 * @property PARSE_EXTRACT - For data extraction from unstructured text
 *   - Instructs AI to return only valid JSON
 *   - Prevents markdown code blocks and explanations
 *   - Used by parseAndFillForm()
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'system', content: SYSTEM_PROMPTS.PARSE_EXTRACT },
 *   { role: 'user', content: userPrompt }
 * ];
 * ```
 */
export declare const SYSTEM_PROMPTS: {
    readonly FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.";
    readonly PARSE_EXTRACT: "You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return \"true\" if it should be checked, otherwise return \"false\" or omit the field.";
};

export { }
