/**
 * Dictation: a small wrapper around the browser's Web Speech API that turns
 * speech into text. It is a separate entry point (`ai-form-fill/voice`), so
 * the core bundle stays free of speech code.
 *
 * The library core is text-in only. Dictation produces the text; what happens
 * with it (a textarea, a `fillForm` call, a controller's `fill()`) is up to
 * the caller.
 */

/** One transcription candidate for a recognised phrase. */
type SpeechRecognitionAlternativeLike = { transcript: string };

/** One recognised phrase, final or still being revised. */
type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike> & {
  isFinal: boolean;
};

/** The `result` event: every phrase of the session, final ones included. */
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };

/** The `error` event. `error` is the code, `message` a human-readable detail. */
type SpeechRecognitionErrorEventLike = { error: string; message?: string };

/** The part of the `SpeechRecognition` interface this module uses. */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** Options for {@link createDictation}. */
export type DictationOptions = {
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
  onError?: (error: { error: string; message: string }) => void;
};

/** The object returned by {@link createDictation}. */
export type Dictation = {
  /** Start a session. Clears the transcript. No-op while listening. */
  start(): void;
  /** End the session, which makes `onEnd` fire. No-op while idle. */
  stop(): void;
  /** Whether a session is running. */
  readonly listening: boolean;
};

/** Resolve the Web Speech constructor, prefixed or not, if this is a browser. */
function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const candidates = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidates.SpeechRecognition ?? candidates.webkitSpeechRecognition;
}

/**
 * Whether this environment offers the Web Speech API.
 *
 * A function rather than a constant, so it is safe to import during
 * server-side rendering and is evaluated when it is called.
 *
 * @returns `true` when {@link createDictation} will work.
 */
export function isDictationSupported(): boolean {
  return getSpeechRecognition() !== undefined;
}

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
export function createDictation(options: DictationOptions = {}): Dictation {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    throw new Error(
      'createDictation: this browser has no Web Speech API. Check isDictationSupported() first.',
    );
  }

  const { interim = true, silenceMs = 1500, onText, onEnd, onError } = options;
  const lang = options.lang || document.documentElement.lang || navigator.language;

  let recognition: SpeechRecognitionLike | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let transcript = '';

  const clearSilenceTimer = () => {
    if (silenceTimer !== undefined) clearTimeout(silenceTimer);
    silenceTimer = undefined;
  };

  const handleResult = (event: SpeechRecognitionEventLike) => {
    const finals: string[] = [];
    const interims: string[] = [];
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? '';
      (result.isFinal ? finals : interims).push(text);
    }
    transcript = [...finals, ...interims]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
    onText?.(transcript, interims.length === 0);

    // The silence window restarts with every result. An empty transcript is
    // not worth stopping for, so keep listening and wait for the next one.
    clearSilenceTimer();
    if (silenceMs > 0) {
      silenceTimer = setTimeout(() => {
        silenceTimer = undefined;
        if (transcript) dictation.stop();
      }, silenceMs);
    }
  };

  const handleEnd = () => {
    if (!recognition) return;
    recognition = null;
    clearSilenceTimer();
    onEnd?.(transcript);
  };

  const dictation: Dictation = {
    start() {
      if (recognition) return;
      transcript = '';
      const engine = new SpeechRecognition();
      engine.lang = lang;
      engine.continuous = true;
      engine.interimResults = interim;
      engine.onresult = handleResult;
      engine.onerror = (event) => onError?.({ error: event.error, message: event.message ?? '' });
      engine.onend = handleEnd;
      recognition = engine;
      engine.start();
    },
    stop() {
      if (!recognition) return;
      clearSilenceTimer();
      // The engine fires `end` (after any pending final result), which is
      // where the session is torn down and `onEnd` fires.
      recognition.stop();
    },
    get listening() {
      return recognition !== null;
    },
  };

  return dictation;
}
