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
declare class AIFormFill {
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
     * @param options - Optional abort signal and `skipFilled`.
     * @returns The extracted record, the fields it was built from, and the raw
     *   model output.
     * @throws ProviderError when the provider request fails.
     * @throws ResponseParseError when the model output is empty or not a JSON object.
     */
    extract(formElement: HTMLFormElement, text: string, options?: FillOptions): Promise<ExtractResult>;
    /**
     * Parse unstructured text and fill every matching field in the form.
     *
     * Dispatches `aff:start` on the form before the request, `aff:field-filled`
     * for every written field, `aff:done` at the end, and `aff:error` when the
     * extraction fails (the error is rethrown afterwards).
     *
     * @param formElement - The form to fill.
     * @param text - Source text (resume, email, description, ...).
     * @param options - Optional abort signal and `skipFilled`.
     * @returns Which fields were filled, which were skipped and why, which
     *   required fields are still empty, plus the raw model output.
     * @throws ProviderError when the provider request fails.
     * @throws ResponseParseError when the model output is empty or not a JSON object.
     */
    fillForm(formElement: HTMLFormElement, text: string, options?: FillOptions): Promise<FillResult>;
    /**
     * Write an extraction to the form: the second half of {@link fillForm},
     * callable on its own.
     *
     * This is the apply step of the review path. Hand it the (possibly edited)
     * `data` and the `fields` from {@link extract} and it writes every matching
     * value, dispatches `aff:field-filled` per field and `aff:done` at the end,
     * and reports the outcome the same way `fillForm` does.
     *
     * @param data - Values keyed by {@link FieldInfo.key}.
     * @param fields - The fields the values belong to, from {@link extract}.
     * @param options - `raw` model output to carry into the result, and the
     *   `form` to dispatch the events on (derived from the fields otherwise).
     * @returns Which fields were filled, which were skipped and why, which keys
     *   matched nothing, and which required fields are still empty.
     */
    applyExtraction(data: Record<string, unknown>, fields: FieldInfo[], options?: {
        raw?: string;
        form?: HTMLFormElement;
    }): FillResult;
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
declare type AIFormFillConfig = {
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
 * The `<ai-form-fill>` custom element.
 *
 * @example
 * ```html
 * <form id="contact">...</form>
 * <ai-form-fill for="#contact" voice></ai-form-fill>
 * ```
 */
export declare class AIFormFillElement extends HTMLElement {
    #private;
    /** The attributes that re-create the controller when they change. */
    static readonly observedAttributes: string[];
    constructor();
    /** The controller behind the panel, or `null` while no form is resolved. */
    get controller(): FormFillController | null;
    /** Provider name or instance. Wins over the `provider` attribute. */
    get provider(): BuiltInProviderName | AIProvider | undefined;
    set provider(value: BuiltInProviderName | AIProvider | undefined);
    /** The wording in use. Assign a partial object to override single entries. */
    get strings(): AIFormFillStrings;
    set strings(value: Partial<AIFormFillStrings>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
}

/**
 * Options accepted by the {@link AIFormFill} constructor: field targeting and
 * debug plus provider configuration (baseUrl, model, timeout, apiKey, ...)
 * used when a built-in provider name is passed.
 */
declare type AIFormFillOptions = AIFormFillConfig & OpenAICompatibleConfig;

/**
 * Every piece of text the element renders. Override any of them through the
 * `strings` property; the `label` and `placeholder` attributes are shortcuts
 * for the two most common ones.
 */
export declare type AIFormFillStrings = {
    /** The label above the text box. */
    label: string;
    /** The text box's placeholder. */
    placeholder: string;
    /** The fill button. */
    fill: string;
    /** The microphone button while idle. */
    dictate: string;
    /** The microphone button's tooltip while listening. */
    listening: string;
    /** The microphone button while listening. */
    stop: string;
    /** The button that aborts a running request. */
    cancel: string;
    /** The button that restores the values the last fill overwrote. */
    undo: string;
    /** The button that writes the reviewed values. */
    apply: string;
    /** The button that drops the reviewed values. */
    discard: string;
    /** Status while dictation is running. */
    statusListening: string;
    /** Status while the provider request is in flight. */
    statusWorking: string;
    /** Status when fill was pressed with an empty text box. */
    statusEmpty: string;
    /** Status after a fill, given the number of fields that were written. */
    statusDone: (filled: number) => string;
    /** Appended to `statusDone` when required fields are still empty. */
    statusMissing: (labels: string[]) => string;
    /** One summary line per field whose value could not be applied. */
    statusSkipped: (label: string, reason: SkipReason) => string;
    /** Status while the review list is shown. */
    statusReview: string;
    /** Status after undo. */
    statusUndone: string;
    /** Status when neither `for` nor an enclosing form resolves. */
    statusNoForm: string;
    /** Error text for a provider failure. */
    errorProvider: (provider: string, status?: number) => string;
    /** Error text for an unreadable model answer. */
    errorParse: string;
    /** Error text for anything else. */
    errorUnknown: string;
};

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
declare abstract class AIProvider {
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
 * Built-in provider names accepted by the {@link AIFormFill} constructor.
 */
declare type BuiltInProviderName = 'ollama' | 'openai' | 'perplexity' | 'openrouter';

/**
 * Core types shared across the library.
 */
/**
 * A single message in a chat conversation.
 */
declare type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

/**
 * Parameters for a chat completion request.
 */
declare type ChatRequest = {
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
declare type ChatResponse = {
    content: string | null;
    model?: string;
    finishReason?: string;
};

/** The element's English wording. Every entry can be replaced. */
export declare const DEFAULT_STRINGS: AIFormFillStrings;

/**
 * Register the element, once. Calling it again, or with a tag that is already
 * taken, does nothing.
 *
 * @param tag - The tag name to register. Defaults to `ai-form-fill`.
 *
 * @example
 * ```typescript
 * import { defineFormFillElement } from 'ai-form-fill/ui';
 * defineFormFillElement();
 * ```
 */
export declare function defineFormFillElement(tag?: string): void;

/**
 * Outcome of a {@link AIFormFill.extract} call: what the model produced,
 * before anything is written to the form.
 */
declare type ExtractResult = {
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
declare type FieldInfo = {
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
declare type FieldOption = {
    /** The value submitted with the form. */
    value: string;
    /** The human-visible label. */
    label: string;
};

/** Per-call options for {@link AIFormFill.fillForm} / {@link AIFormFill.fillField}. */
declare type FillOptions = {
    /** Cancels the provider request when aborted. */
    signal?: AbortSignal;
    /**
     * Leave fields that already hold a value alone: they are excluded from the
     * prompt and the schema, so the model never answers for them and they are
     * never written. Defaults to `false`.
     */
    skipFilled?: boolean;
};

/**
 * Outcome of a {@link AIFormFill.fillForm} call.
 */
declare type FillResult = {
    /**
     * Fields that were written, with the value that was applied and the value
     * the field held before. `previous` is what `revertFill` restores.
     */
    filled: Array<{
        key: string;
        element: HTMLElement;
        value: string | string[];
        previous: string | string[];
    }>;
    /** Fields the model answered for but whose value could not be applied. */
    skipped: Array<{
        key: string;
        reason: SkipReason;
    }>;
    /** Keys in the model's response that match no form field. */
    unmatchedKeys: string[];
    /**
     * Keys of required fields that are still empty after the fill, computed
     * over all fields of the form, not only the targeted ones. Use it to tell
     * the user what is left to do.
     */
    missingRequired: string[];
    /** The raw model output, for debugging. */
    raw: string;
};

/** The object returned by {@link createFormFill}. */
declare type FormFillController = {
    /**
     * Fill the form from `text`, or from the configured source when omitted.
     * Never rejects: failures land in the snapshot and resolve to `null`, and a
     * cancelled fill resolves to `null` as well.
     */
    fill(text?: string): Promise<FillResult | null>;
    /**
     * Extract without writing to the form, for a review step. Rejects the same
     * way `AIFormFill.extract` does and leaves the state untouched.
     */
    extract(text?: string): Promise<ExtractResult>;
    /**
     * Write a (possibly edited) extraction to the form, the second half of
     * `fill()`. Dispatches the same events and reports the same
     * {@link FillResult}, which becomes the snapshot's result so `undo()` works.
     */
    applyExtracted(data: Record<string, unknown>, fields: FieldInfo[]): FillResult;
    /** Abort the in-flight request and go back to `idle`. */
    cancel(): void;
    /** Restore the values the last fill overwrote and clear the result. */
    undo(): void;
    /** Listen for state changes. Returns the unsubscribe function. */
    subscribe(listener: (snapshot: FormFillSnapshot) => void): () => void;
    /** The current snapshot. The reference is stable until the state changes. */
    getSnapshot(): FormFillSnapshot;
    /** Remove the trigger listener and abort in-flight work. */
    destroy(): void;
    /** The underlying {@link AIFormFill} instance. */
    readonly instance: AIFormFill;
};

/** An immutable view of the controller's state. */
declare type FormFillSnapshot = {
    state: FormFillState;
    /** The result of the last successful fill, or `null`. */
    result: FillResult | null;
    /** The failure that put the controller in the `error` state, or `null`. */
    error: unknown;
};

/**
 * What the controller is doing: nothing yet (`idle`), waiting for the model
 * (`working`), finished with a result (`done`), or failed (`error`).
 */
declare type FormFillState = 'idle' | 'working' | 'done' | 'error';

/**
 * Configuration for {@link OpenAICompatibleProvider}.
 */
declare interface OpenAICompatibleConfig extends ProviderConfig {
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
 * User-facing configuration options accepted by every provider.
 */
declare interface ProviderConfig {
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
 * Whether a provider runs on the user's machine (`local`) or behind a remote
 * service (`remote`). Used purely as metadata, e.g. for UI grouping.
 */
declare type ProviderType = 'local' | 'remote';

/**
 * Why a field was skipped during {@link AIFormFill.fillForm}.
 */
declare type SkipReason = 
/** The model returned null/empty or an explicit "no value" marker. */
'empty-value'
/** A date/time value did not match the required ISO format. */
| 'invalid-date-format'
/** No option of a select/radio/checkbox group matched the value. */
| 'no-matching-option'
/** The value's type cannot be applied to this field (e.g. an object). */
| 'unsupported-value';

export { }
