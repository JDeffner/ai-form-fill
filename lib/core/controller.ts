/**
 * Headless controller: the wiring every UI needs around {@link AIFormFill}
 * (a trigger, a source of text, a state machine, cancel and undo), with no
 * markup and no framework.
 *
 * The state is exposed as an immutable snapshot plus a subscribe function, so
 * it plugs into React's `useSyncExternalStore` as well as into plain DOM code.
 */

import { AIFormFill } from './ai-form-fill';
import type { BuiltInProviderName, ExtractResult, FieldInfo, FillResult } from './types';
import type { AIProvider } from '../providers/provider';
import { revertFill } from '../form/revert';

/**
 * What the controller is doing: nothing yet (`idle`), waiting for the model
 * (`working`), finished with a result (`done`), or failed (`error`).
 */
export type FormFillState = 'idle' | 'working' | 'done' | 'error';

/** An immutable view of the controller's state. */
export type FormFillSnapshot = {
  state: FormFillState;
  /** The result of the last successful fill, or `null`. */
  result: FillResult | null;
  /** The failure that put the controller in the `error` state, or `null`. */
  error: unknown;
};

/** Options for {@link createFormFill}. */
export type CreateFormFillOptions = {
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

/** The object returned by {@link createFormFill}. */
export type FormFillController = {
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

/** Resolve an element or CSS selector, or throw with a readable message. */
function resolve<T extends HTMLElement>(
  input: HTMLElement | string,
  isMatch: (element: unknown) => element is T,
  what: string,
  expected: string,
): T {
  const element = typeof input === 'string' ? document.querySelector(input) : input;
  if (!isMatch(element)) {
    const where = typeof input === 'string' ? `selector "${input}"` : 'element';
    throw new Error(`createFormFill: the ${what} ${where} is not ${expected}.`);
  }
  return element;
}

const isForm = (element: unknown): element is HTMLFormElement => element instanceof HTMLFormElement;
const isSource = (element: unknown): element is HTMLTextAreaElement | HTMLInputElement =>
  element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement;
const isElement = (element: unknown): element is HTMLElement => element instanceof HTMLElement;

/**
 * Wire a form, a text source and a trigger into one controller.
 *
 * @param options - Elements or selectors, provider configuration, and an
 *   optional state callback.
 * @returns The controller.
 * @throws Error when the form, source or trigger cannot be resolved.
 *
 * @example
 * ```typescript
 * const controller = createFormFill({
 *   form: '#contact',
 *   source: '#notes',
 *   trigger: '#fill',
 *   onState: ({ state }) => (button.disabled = state === 'working'),
 * });
 * // later: controller.destroy();
 * ```
 */
export function createFormFill(options: CreateFormFillOptions): FormFillController {
  const form = resolve(options.form, isForm, 'form', 'a <form> element');
  const source = options.source
    ? resolve(options.source, isSource, 'source', 'an <input> or <textarea>')
    : undefined;
  const trigger = options.trigger
    ? resolve(options.trigger, isElement, 'trigger', 'an element')
    : undefined;

  const instance = new AIFormFill(options.provider ?? 'ollama', {
    model: options.model,
    baseUrl: options.baseUrl,
    targetFields: options.targetFields,
    debug: options.debug,
  });

  const listeners = new Set<(snapshot: FormFillSnapshot) => void>();
  let snapshot: FormFillSnapshot = { state: 'idle', result: null, error: null };
  let inFlight: AbortController | null = null;

  function setSnapshot(next: FormFillSnapshot): void {
    snapshot = next;
    options.onState?.(snapshot);
    for (const listener of listeners) listener(snapshot);
  }

  /** The text to work with, or an Error explaining why there is none. */
  function resolveText(text?: string): string | Error {
    const value = text ?? source?.value;
    if (value === undefined) {
      return new Error('fill() was called without text and no source element is configured.');
    }
    if (!value.trim()) return new Error('The source text is empty.');
    return value;
  }

  function start(): AbortController {
    inFlight?.abort();
    const abort = new AbortController();
    inFlight = abort;
    return abort;
  }

  async function fill(text?: string): Promise<FillResult | null> {
    const resolved = resolveText(text);
    if (resolved instanceof Error) {
      setSnapshot({ state: 'error', result: null, error: resolved });
      return null;
    }

    const abort = start();
    setSnapshot({ state: 'working', result: null, error: null });
    try {
      const result = await instance.fillForm(form, resolved, {
        signal: abort.signal,
        skipFilled: options.skipFilled,
      });
      if (abort.signal.aborted) return null;
      setSnapshot({ state: 'done', result, error: null });
      return result;
    } catch (error) {
      if (abort.signal.aborted) return null;
      setSnapshot({ state: 'error', result: null, error });
      return null;
    } finally {
      if (inFlight === abort) inFlight = null;
    }
  }

  async function extract(text?: string): Promise<ExtractResult> {
    const resolved = resolveText(text);
    if (resolved instanceof Error) throw resolved;
    const abort = start();
    try {
      return await instance.extract(form, resolved, {
        signal: abort.signal,
        skipFilled: options.skipFilled,
      });
    } finally {
      if (inFlight === abort) inFlight = null;
    }
  }

  function applyExtracted(data: Record<string, unknown>, fields: FieldInfo[]): FillResult {
    const result = instance.applyExtraction(data, fields, { form });
    setSnapshot({ state: 'done', result, error: null });
    return result;
  }

  function cancel(): void {
    if (!inFlight) return;
    inFlight.abort();
    inFlight = null;
    setSnapshot({ state: 'idle', result: null, error: null });
  }

  function undo(): void {
    if (!snapshot.result) return;
    revertFill(snapshot.result);
    setSnapshot({ state: 'idle', result: null, error: null });
  }

  const onTrigger = (event: Event): void => {
    // A submit button used as the trigger must not submit the form.
    event.preventDefault();
    void fill();
  };
  trigger?.addEventListener('click', onTrigger);

  return {
    fill,
    extract,
    applyExtracted,
    cancel,
    undo,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    destroy() {
      trigger?.removeEventListener('click', onTrigger);
      inFlight?.abort();
      inFlight = null;
      listeners.clear();
    },
    instance,
  };
}
