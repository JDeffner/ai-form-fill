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
 * config.providers.ollama.apiEndpoint = 'http://my-server:11434';
 *
 * // Change OpenAI to use real API
 * config.providers.openai.apiEndpoint = 'https://api.openai.com/v1';
 * config.providers.openai.model = 'gpt-4';
 * ```
 */
export declare let affConfig: {
    /**
     * Provider-specific default configurations
     * These can be overridden globally or per-instance
     */
    providers: {
        ollama: {
            apiEndpoint: string;
            model: string;
            timeout: number;
            chatEndpoint: string;
            listModelsEndpoint: string;
            availabilityEndpoint: string;
        };
        openai: {
            apiEndpoint: string;
            model: string;
            timeout: number;
            chatEndpoint: undefined;
            listModelsEndpoint: undefined;
            availabilityEndpoint: undefined;
        };
        perplexity: {
            apiEndpoint: string;
            model: string;
            timeout: number;
            chatEndpoint: undefined;
            listModelsEndpoint: undefined;
            availabilityEndpoint: undefined;
        };
    };
    /**
     * Global library defaults
     */
    defaults: {
        debug: boolean;
        timeout: number;
    };
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
 * @example Basic usage with Ollama
 * ```typescript
 * const aiForm = AIFormFill.withOllama('llama3.2');
 * await aiForm.parseAndFillForm(formElement, userText);
 * ```
 *
 * @example Advanced configuration
 * ```typescript
 * const aiForm = new AIFormFill({
 *   provider: new LocalOllamaProvider({ model: 'llama3.2' }),
 *   debug: true
 * });
 * ```
 */
export declare class AIFormFill {
    private provider;
    private debug;
    private context?;
    private selectedFields?;
    constructor(providerName: AvailableProviders, options?: Partial<AIFormFillConfig> & Partial<ProviderConfig>);
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
     *
     * @example Parse resume text into job application
     *
     * const form = document.querySelector('form');
     * const resumeText = `
     *   John Doe
     *   Email: john@example.com
     *   Phone: (555) 123-4567
     *   I have 5 years of experience in software development...
     * `;
     *
     * await aiForm.parseAndFillForm(form, resumeText);
     * // Form fields automatically filled with extracted data
     *
     *
     * @example Parse structured data
     * typescript
     * const jsonData = JSON.stringify({
     *   firstName: 'Jane',
     *   lastName: 'Smith',
     *   email: 'jane@example.com'
     * });
     *
     * await aiForm.parseAndFillForm(form, jsonData);
     *
     */
    parseAndFillForm(formElement: HTMLFormElement, unstructuredText: string): Promise<void>;
    /**
     * Check if the AI provider is available and responding
     *
     * @returns Promise resolving to true if provider is available, false otherwise
     */
    providerAvailable(): Promise<boolean>;
    /**
     * Get list of available models from the provider
     *
     * Queries the provider for available models. Useful for building
     * dynamic model selection interfaces.
     *
     * @returns Promise resolving to array of model identifiers
     *
     * @example Build a model selector
     * ```typescript
     * const models = await aiForm.getAvailableModels();
     *
     * const select = document.querySelector('#model-select');
     * models.forEach(model => {
     *   const option = document.createElement('option');
     *   option.value = model;
     *   option.textContent = model;
     *   select.appendChild(option);
     * });
     * ```
     */
    getAvailableModels(): Promise<string[]>;
}

/**
 * Configuration for the AIFormFill class
 *
 * @param provider - The AI provider instance to use
 * @param fields - Optional array of field names to target (if omitted, all fields are filled)
 * @param debug - Enable console logging for debugging (default: false)
 */
export declare type AIFormFillConfig = {
    fields?: string[];
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
    protected selectedModel?: string;
    protected apiEndpoint: string;
    protected timeout: number;
    protected debug: boolean;
    constructor(config: ProviderConfig);
    /**
     * Sends a message to a model of the AI provider and returns the response
     * @param params - The {@link ChatRequest | chat request} including messages, model, etc.
     * @returns A promise that resolves to a {@link ChatResponse}
     */
    abstract chat(params: ChatRequest): Promise<ChatResponse>;
    /**
     *
     * @returns The currently selected model or undefined
     */
    getSelectedModel(): string | undefined;
    /**
     * Set the selected model
     * @param model - The model to select
     */
    setSelectedModel(model: string): void;
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
    isAvailable?(): Promise<boolean>;
    getName(): string;
}

/**
 * Analyze a form field to extract relevant information
 *
 * Inspects a form element to gather all available metadata including
 * type, name, label, placeholder, validation rules, etc. This information
 * helps the AI understand what content is appropriate for the field.
 *
 * @param element - The form field element to analyze (input, textarea, or select)
 * @returns FieldInfo object containing all extracted metadata
 *
 * @example
 * ```ts
 * const input = document.querySelector('#email');
 * const info = analyzeField(input);
 * console.log(info);
 * // {
 * //   element: input,
 * //   type: 'email',
 * //   name: 'userEmail',
 * //   label: 'Email Address',
 * //   placeholder: 'you@example.com',
 * //   required: true,
 * //   pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$'
 * // }
 * ```
 */
export declare function analyzeField(element: HTMLElement): FieldInfo;

/**
 * All currently implemented provider names
 */
export declare type AvailableProviders = 'OpenAI' | 'Ollama' | 'Perplexity';

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
 * Build a prompt for parsing unstructured text and extracting field data
 *
 * Creates a comprehensive prompt that lists all form fields with their metadata,
 * provides the unstructured text, and instructs the AI to extract matching data
 * as JSON. Used by parseAndFillForm().
 *
 * @param clientFieldInfos - Array of FieldInfo objects for all target fields
 * @param unstructuredText - The source text to extract data from
 * @returns A formatted prompt string that requests JSON extraction
 *
 * @remarks
 * The AI is instructed to:
 * - Match field names exactly
 * - Return valid JSON only (no markdown)
 * - Include only fields where data was found
 * - Use field labels and placeholders as context clues
 *
 * @example
 * ```typescript
 * const fields = getFillTargets(form);
 * const text = 'John Doe, john@example.com, (555) 123-4567';
 * const prompt = buildParsePrompt(fields, text);
 * // Returns prompt with field list + extraction instructions
 * ```
 */
export declare function buildParsePrompt(clientFieldInfos: FieldInfo[], unstructuredText: string): string;

/**
 * Core types and interfaces for the AI Form Input library
 */
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
    model?: string;
    maxTokens?: number;
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
    required?: boolean;
    pattern?: string;
};

/**
 * Get field identifier for AI context and logging
 *
 * Returns the most descriptive identifier available for a field,
 * prioritizing: name > label > placeholder > 'unknown'.
 *
 * @param field - The FieldInfo object to extract identifier from
 * @returns The best available identifier string
 *
 * @example
 * ```typescript
 * const field = { name: 'email', label: 'Email Address', ... };
 * console.log(getFieldIdentifier(field)); // 'email'
 *
 * const field2 = { label: 'Phone Number', ... };
 * console.log(getFieldIdentifier(field2)); // 'Phone Number'
 *
 * const field3 = { placeholder: 'Enter text...', ... };
 * console.log(getFieldIdentifier(field3)); // 'Enter text...'
 * ```
 */
export declare function getFieldIdentifier(field: FieldInfo): string;

/**
 * Get all fillable fields from a form
 *
 * Queries the form for all input, textarea, and select elements, excluding
 * buttons and submit inputs. Returns analyzed metadata for each field.
 *
 * @param formElement - The HTML form element to scan
 * @returns Array of FieldInfo objects, one for each fillable field
 *
 * @remarks
 * Excludes: submit buttons, reset buttons, regular buttons
 * Includes: text inputs, textareas, selects, email inputs, etc.
 *
 * @example
 * ```ts
 * const form = document.querySelector('form');
 * const fields = getFillTargets(form);
 * console.log(`Found ${fields.length} fillable fields`);
 *
 * fields.forEach(field => {
 *   console.log(`${field.label}: ${field.type}`);
 * });
 * ```
 */
export declare function getFillTargets(formElement: HTMLFormElement): FieldInfo[];

export declare function initializeAFFQuick(): void;

/**
 * Validate that a string contains valid JSON
 *
 * Attempts to parse the string as JSON and returns whether it succeeded.
 * Does not throw errors - returns false instead.
 *
 * @param str - The string to validate
 * @returns `true` if the string is valid JSON, `false` otherwise
 *
 * @example
 * ```typescript
 * console.log(isValidJson('{"key": "value"}')); // true
 * console.log(isValidJson('{invalid}')); // false
 * console.log(isValidJson('just text')); // false
 * console.log(isValidJson('123')); // true (valid JSON)
 * console.log(isValidJson('null')); // true (valid JSON)
 * ```
 */
export declare function isValidJson(str: string): boolean;

/**
 * @extension Extend this class for providers that run locally (e.g., Ollama, LocalAI)
 */
declare abstract class LocalAIProvider extends AIProvider {
    protected providerType: ProviderType;
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
    chat(params: ChatRequest): Promise<ChatResponse>;
    listModels(): Promise<string[]>;
    isAvailable(): Promise<boolean>;
}

/**
 * Utility functions for parsing JSON responses from AI providers
 */
/**
 * Parses JSON from AI responses, handling common formatting issues
 *
 * @param aiResponse - The raw response text from the AI
 * @returns Object mapping field names to their extracted values (all strings)
 *   - Returns empty object {} if parsing fails (error logged to console)
 *
 * @example Success case
 * ```typescript
 * const response = '```json\n{"name": "John", "age": 25}\n```';
 * const data = parseJsonResponse(response);
 * console.log(data);
 * // { name: 'John', age: '25' }
 * ```
 *
 * @example Malformed JSON
 * ```typescript
 * const response = 'Here is the data: {invalid json}';
 * const data = parseJsonResponse(response);
 * console.log(data);
 * // {} (empty object, error logged)
 * ```
 */
export declare function parseJsonResponse(aiResponse: string): Record<string, string>;

/**
 * Provider implementation for Perplexity AI's API
 *
 * @see {@link https://docs.perplexity.ai/getting-started/overview | Perplexity API Documentation}
 */
export declare class PerplexityProvider extends OpenAIProvider {
    protected providerName: string;
}

/**
 * Configuration for AI providers
 * @param apiEndpoint - The URL of the AI provider's API (if applicable)
 * @param model - The default model to use
 * @param timeout - Optional timeout for requests in milliseconds
 */
export declare interface ProviderConfig {
    apiEndpoint: string;
    model?: string;
    timeout?: number;
}

export declare type ProviderType = 'local' | 'remote';

/**
 * @extension Extend this class for providers that run remotely (e.g., OpenAI, Perplexity)
 */
declare abstract class RemoteAIProvider extends AIProvider {
    protected providerType: ProviderType;
}

/**
 * Set the value of a form field and trigger appropriate events
 *
 * Updates the field value and dispatches 'input' and 'change' events to
 * ensure framework reactivity (React, Vue, Angular) works correctly.
 * For select elements, attempts to match by value or display text.
 *
 * @param element - The form field element to update
 * @param value - The value to set (string)
 *
 * @remarks
 * Triggers events with `bubbles: true` to ensure parent listeners are notified.
 * This is crucial for framework integration and form validation libraries.
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
