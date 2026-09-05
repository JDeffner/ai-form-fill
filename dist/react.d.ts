import { RefCallback } from 'react';

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

/** Options for {@link createFormFill}. */
declare type CreateFormFillOptions = {
    /** The form to fill: an element or a CSS selector. */
    form: HTMLFormElement | string;
    /**
     * Where `fill()` reads the text when called without an argument: an element
     * or a CSS selector.
     */
    source?: HTMLTextAreaElement | HTMLInputElement | string;
    /** Element whose click triggers `fill()`: an element or a CSS selector. */
    trigger?: HTMLElement | string;
    /** Provider name or instance. Defaults to `ollama`. */
    provider?: BuiltInProviderName | AIProvider;
    /** Model to use. */
    model?: string;
    /** Base URL of the provider. */
    baseUrl?: string;
    /** Restrict filling to these field keys. */
    targetFields?: string[];
    /** Leave fields that already hold a value alone. Defaults to `false`. */
    skipFilled?: boolean;
    /** Enable console logging for this controller's instance. */
    debug?: boolean;
    /** Called with the new snapshot on every state change. */
    onState?: (snapshot: FormFillSnapshot) => void;
};

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

/**
 * Wire a React form to the library.
 *
 * The options are read once, when the controller is created for the form
 * element. Later changes to the object are ignored; to switch provider or
 * model, remount the form (a `key` on it is enough).
 *
 * @param options - Provider configuration, field targeting and `debug`.
 * @returns The form ref, the actions and the current state.
 *
 * @example
 * ```tsx
 * const { formRef, fill, state, result } = useFormFill({ model: 'gemma3:4b' });
 *
 * return (
 *   <>
 *     <button disabled={state === 'working'} onClick={() => fill(text)}>Fill</button>
 *     <form ref={formRef}>...</form>
 *     {result && <p>Filled {result.filled.length} field(s).</p>}
 *   </>
 * );
 * ```
 */
export declare function useFormFill(options?: UseFormFillOptions): UseFormFillResult;

/**
 * Options for {@link useFormFill}: everything {@link createFormFill} takes
 * except the parts React provides. `form` comes from the returned ref,
 * `source` and `trigger` are your own state and click handler, and `onState`
 * is replaced by the returned `state`.
 */
export declare type UseFormFillOptions = Omit<CreateFormFillOptions, 'form' | 'trigger' | 'source' | 'onState'>;

/** What {@link useFormFill} returns. */
export declare type UseFormFillResult = {
    /** Put this on the `<form>`. The controller lives as long as the form does. */
    formRef: RefCallback<HTMLFormElement>;
    /**
     * Fill the form from `text`. Never rejects; resolves to `null` on failure,
     * on cancellation, and while no form is mounted.
     */
    fill: (text: string) => Promise<FillResult | null>;
    /**
     * Extract without writing to the form, for a review step. Rejects when the
     * extraction fails or when no form is mounted.
     */
    extract: (text: string) => Promise<ExtractResult>;
    /**
     * Write a (possibly edited) extraction to the form. Returns `null` while no
     * form is mounted.
     */
    applyExtracted: (data: Record<string, unknown>, fields: FieldInfo[]) => FillResult | null;
    /** Abort the in-flight request and go back to `idle`. */
    cancel: () => void;
    /** Restore the values the last fill overwrote and clear the result. */
    undo: () => void;
    /** What the controller is doing. */
    state: FormFillState;
    /** The result of the last successful fill, or `null`. */
    result: FillResult | null;
    /** The failure that put the hook in the `error` state, or `null`. */
    error: unknown;
};

export { }
