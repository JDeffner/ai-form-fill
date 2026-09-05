/**
 * Create a dictation session controller.
 *
 * One controller can run many sessions: each `start()` begins with an empty
 * transcript and ends with exactly one `onEnd` call.
 *
 * @param options - Language, callbacks and the silence auto-stop delay.
 * @returns The {@link Dictation} controller.
 * @throws Error when the browser has no Web Speech API. Guard with
 *   {@link isDictationSupported}.
 *
 * @example
 * ```typescript
 * const dictation = createDictation({
 *   onText: (text) => (textarea.value = text),
 *   onEnd: (text) => controller.fill(text),
 * });
 * button.addEventListener('click', () => dictation.start());
 * ```
 */
export declare function createDictation(options?: DictationOptions): Dictation;

/** The object returned by {@link createDictation}. */
export declare type Dictation = {
    /** Start a session. Clears the transcript. No-op while listening. */
    start(): void;
    /** End the session, which makes `onEnd` fire. No-op while idle. */
    stop(): void;
    /** Whether a session is running. */
    readonly listening: boolean;
};

/**
 * Dictation: a small wrapper around the browser's Web Speech API that turns
 * speech into text. It is a separate entry point (`ai-form-fill/voice`), so
 * the core bundle stays free of speech code.
 *
 * The library core is text-in only. Dictation produces the text; what happens
 * with it (a textarea, a `fillForm` call, a controller's `fill()`) is up to
 * the caller.
 */
/** Options for {@link createDictation}. */
export declare type DictationOptions = {
    /**
     * BCP 47 language tag for the recogniser. Defaults to the document's `lang`
     * attribute, or to `navigator.language`.
     */
    lang?: string;
    /**
     * Report text while the engine is still revising it. Defaults to `true`.
     */
    interim?: boolean;
    /**
     * Stop automatically after this many milliseconds without a new result.
     * Defaults to `1500`. Set to `0` to keep listening until `stop()`.
     */
    silenceMs?: number;
    /**
     * Called on every result with the full transcript so far (the final parts
     * plus the current interim part), not with the delta. `isFinal` is `true`
     * when no interim part is pending.
     */
    onText?: (text: string, isFinal: boolean) => void;
    /**
     * Called once per session, after `stop()`, an auto-stop or the engine
     * ending on its own, with the trimmed transcript (possibly empty).
     */
    onEnd?: (finalText: string) => void;
    /**
     * Called for every recognition error. `error` is a Web Speech error code
     * (`not-allowed`, `no-speech`, `network`, `audio-capture`, `aborted`, ...).
     * Errors are reported, not thrown: the engine ends the session afterwards
     * and `onEnd` still fires.
     */
    onError?: (error: {
        error: string;
        message: string;
    }) => void;
};

/**
 * Whether this environment offers the Web Speech API.
 *
 * A function rather than a constant, so it is safe to import during
 * server-side rendering and is evaluated when it is called.
 *
 * @returns `true` when {@link createDictation} will work.
 */
export declare function isDictationSupported(): boolean;

export { }
