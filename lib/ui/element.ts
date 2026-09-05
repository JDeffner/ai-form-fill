/**
 * `<ai-form-fill>`: the ready-made interface. Drop the element next to a form
 * and the user gets a text box, an optional microphone, a fill button, live
 * status, a result summary, undo and an optional review step.
 *
 * It is plain DOM in a shadow root with no dependencies. The work is done by
 * `createFormFill` (core) and `createDictation` (voice); this file is the
 * markup, the state machine and the wording around them.
 */

import { createFormFill, type FormFillController } from '../core/controller';
import { ProviderError, ResponseParseError } from '../core/errors';
import type { AFFEventMap } from '../core/events';
import type { BuiltInProviderName, ExtractResult, FillResult, SkipReason } from '../core/types';
import { getFormFields } from '../form/analyze';
import type { AIProvider } from '../providers/provider';
import { createDictation, isDictationSupported, type Dictation } from '../voice/dictation';
import { ELEMENT_CSS } from './styles';

/** What the panel is showing. Mirrored on the panel as `data-state`. */
type PanelState = 'idle' | 'listening' | 'working' | 'review' | 'done' | 'error';

/**
 * Every piece of text the element renders. Override any of them through the
 * `strings` property; the `label` and `placeholder` attributes are shortcuts
 * for the two most common ones.
 */
export type AIFormFillStrings = {
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

/** Why a value could not be applied, in words a form user understands. */
const SKIP_TEXT: Record<SkipReason, string> = {
  'empty-value': 'no value was found.',
  'invalid-date-format': 'the date format was not usable.',
  'no-matching-option': 'no option matched.',
  'unsupported-value': 'the value could not be used.',
};

/** The element's English wording. Every entry can be replaced. */
export const DEFAULT_STRINGS: AIFormFillStrings = {
  label: 'Fill this form with AI',
  placeholder: 'Describe what should go into the form, or dictate it.',
  fill: 'Fill form',
  dictate: 'Dictate',
  listening: 'Listening',
  stop: 'Stop',
  cancel: 'Cancel',
  undo: 'Undo',
  apply: 'Apply',
  discard: 'Discard',
  statusListening: 'Listening. Pause for a moment to fill the form.',
  statusWorking: 'Filling the form.',
  statusEmpty: 'Type or dictate something first.',
  statusDone: (filled) =>
    filled === 0
      ? 'Nothing matched the form.'
      : `Filled ${filled} field${filled === 1 ? '' : 's'}.`,
  statusMissing: (labels) => `Still needed: ${labels.join(', ')}.`,
  statusSkipped: (label, reason) => `${label}: ${SKIP_TEXT[reason]}`,
  statusReview: 'Check the values, then apply.',
  statusUndone: 'Fill undone.',
  statusNoForm: 'No form found for <ai-form-fill>.',
  errorProvider: (provider, status) =>
    status === undefined
      ? `Could not reach ${provider}.`
      : `${provider} answered with HTTP ${status}.`,
  errorParse: 'The AI answer could not be read. Try again.',
  errorUnknown: 'Something went wrong. Try again.',
};

/** How long a filled field carries `data-aff-filled`, in milliseconds. */
const HIGHLIGHT_MS = 1500;

const MIC_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>' +
  '<path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/></svg>';

const TEMPLATE_HTML = `<style>${ELEMENT_CSS}</style>
<div part="panel" data-state="idle">
  <label part="label" for="text"></label>
  <textarea part="textarea" id="text" rows="3"></textarea>
  <div part="actions">
    <button part="mic" type="button" aria-pressed="false" hidden>${MIC_ICON}<span part="mic-label"></span></button>
    <button part="submit" type="button"></button>
    <button part="cancel" type="button" hidden></button>
    <button part="undo" type="button" hidden></button>
    <button part="apply" type="button" hidden></button>
    <button part="discard" type="button" hidden></button>
  </div>
  <p part="status" role="status" aria-live="polite"></p>
  <div part="summary" hidden></div>
</div>`;

let template: HTMLTemplateElement | undefined;

/** The parsed template, built on first use so the module is import-safe. */
function getTemplate(): HTMLTemplateElement {
  if (!template) {
    template = document.createElement('template');
    template.innerHTML = TEMPLATE_HTML;
  }
  return template;
}

/** Render a model value the way the review list shows it. Empty means "no value". */
function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return (value as unknown[]).map(formatValue).filter(Boolean).join(', ');
  }
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * The `<ai-form-fill>` custom element.
 *
 * @example
 * ```html
 * <form id="contact">...</form>
 * <ai-form-fill for="#contact" voice></ai-form-fill>
 * ```
 */
export class AIFormFillElement extends HTMLElement {
  /** The attributes that re-create the controller when they change. */
  static readonly observedAttributes = [
    'for',
    'provider',
    'model',
    'base-url',
    'target-fields',
    'skip-filled',
    'voice',
    'lang',
    'review',
    'label',
    'placeholder',
    'debug',
  ];

  #ui: {
    panel: HTMLElement;
    label: HTMLElement;
    textarea: HTMLTextAreaElement;
    status: HTMLElement;
    summary: HTMLElement;
    mic: HTMLButtonElement;
    micLabel: HTMLElement;
    submit: HTMLButtonElement;
    cancel: HTMLButtonElement;
    undo: HTMLButtonElement;
    apply: HTMLButtonElement;
    discard: HTMLButtonElement;
  };

  #ready = false;
  #state: PanelState = 'idle';
  #message = '';
  #form: HTMLFormElement | null = null;
  #controller: FormFillController | null = null;
  #result: FillResult | null = null;
  #extraction: ExtractResult | null = null;
  #dictation: Dictation | null = null;
  #abandonDictation = false;
  #overrides: Partial<AIFormFillStrings> = {};
  #provider: BuiltInProviderName | AIProvider | undefined;
  #timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.append(getTemplate().content.cloneNode(true));
    const part = <T extends HTMLElement>(name: string): T =>
      root.querySelector<T>(`[part~="${name}"]`)!;
    this.#ui = {
      panel: part('panel'),
      label: part('label'),
      textarea: part('textarea'),
      status: part('status'),
      summary: part('summary'),
      mic: part('mic'),
      micLabel: part('mic-label'),
      submit: part('submit'),
      cancel: part('cancel'),
      undo: part('undo'),
      apply: part('apply'),
      discard: part('discard'),
    };
    this.#ui.submit.addEventListener('click', this.#onSubmit);
    this.#ui.cancel.addEventListener('click', this.#onCancel);
    this.#ui.undo.addEventListener('click', this.#onUndo);
    this.#ui.apply.addEventListener('click', this.#onApply);
    this.#ui.discard.addEventListener('click', this.#onDiscard);
    this.#ui.mic.addEventListener('click', this.#onMic);
    this.#ui.panel.addEventListener('keydown', this.#onKeydown);
  }

  /** The controller behind the panel, or `null` while no form is resolved. */
  get controller(): FormFillController | null {
    return this.#controller;
  }

  /** Provider name or instance. Wins over the `provider` attribute. */
  get provider(): BuiltInProviderName | AIProvider | undefined {
    return this.#provider;
  }

  set provider(value: BuiltInProviderName | AIProvider | undefined) {
    this.#provider = value;
    if (this.#ready) this.#setup();
  }

  /** The wording in use. Assign a partial object to override single entries. */
  get strings(): AIFormFillStrings {
    return this.#text;
  }

  set strings(value: Partial<AIFormFillStrings>) {
    this.#overrides = value;
    if (this.#ready) this.#render();
  }

  connectedCallback(): void {
    this.#ready = true;
    this.#setup();
  }

  disconnectedCallback(): void {
    this.#ready = false;
    this.#teardown();
  }

  attributeChangedCallback(): void {
    if (this.#ready) this.#setup();
  }

  /** The defaults, the two attribute shortcuts and the `strings` overrides. */
  get #text(): AIFormFillStrings {
    const shortcuts: Partial<AIFormFillStrings> = {};
    const label = this.getAttribute('label');
    const placeholder = this.getAttribute('placeholder');
    if (label !== null) shortcuts.label = label;
    if (placeholder !== null) shortcuts.placeholder = placeholder;
    return { ...DEFAULT_STRINGS, ...shortcuts, ...this.#overrides };
  }

  /** Resolve the form and build a controller for it. Safe to call again. */
  #setup(): void {
    this.#teardown();
    const selector = this.getAttribute('for');
    const form = selector ? document.querySelector(selector) : this.closest('form');
    if (!(form instanceof HTMLFormElement)) {
      this.#set('idle', this.#text.statusNoForm);
      return;
    }
    const targets = this.getAttribute('target-fields');
    this.#form = form;
    form.addEventListener('aff:field-filled', this.#onFieldFilled);
    this.#controller = createFormFill({
      form,
      provider:
        this.#provider ?? (this.getAttribute('provider') as BuiltInProviderName) ?? undefined,
      model: this.getAttribute('model') ?? undefined,
      baseUrl: this.getAttribute('base-url') ?? undefined,
      targetFields: targets
        ? targets
            .split(',')
            .map((key) => key.trim())
            .filter(Boolean)
        : undefined,
      skipFilled: this.hasAttribute('skip-filled'),
      debug: this.hasAttribute('debug'),
    });
    this.#set('idle', '');
  }

  /** Drop the controller, the dictation session and the pending highlights. */
  #teardown(): void {
    this.#form?.removeEventListener('aff:field-filled', this.#onFieldFilled);
    this.#controller?.destroy();
    this.#dictation?.stop();
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();
    this.#form = null;
    this.#controller = null;
    this.#result = null;
    this.#extraction = null;
    this.#dictation = null;
  }

  #set(state: PanelState, message: string): void {
    this.#state = state;
    this.#message = message;
    this.#render();
  }

  #render(): void {
    const text = this.#text;
    const ui = this.#ui;
    const working = this.#state === 'working';
    const listening = this.#state === 'listening';
    const review = this.#state === 'review';

    ui.panel.dataset.state = this.#state;
    if (working) ui.panel.setAttribute('aria-busy', 'true');
    else ui.panel.removeAttribute('aria-busy');

    ui.label.textContent = text.label;
    ui.textarea.placeholder = text.placeholder;
    ui.status.textContent = this.#message;
    ui.status.setAttribute('role', this.#state === 'error' ? 'alert' : 'status');

    ui.submit.textContent = text.fill;
    ui.submit.hidden = review;
    ui.submit.disabled = working;
    ui.cancel.textContent = text.cancel;
    ui.cancel.hidden = !working;
    ui.undo.textContent = text.undo;
    ui.undo.hidden = this.#state !== 'done' || this.#result === null;
    ui.apply.textContent = text.apply;
    ui.apply.hidden = !review;
    ui.discard.textContent = text.discard;
    ui.discard.hidden = !review;

    ui.mic.hidden = !this.hasAttribute('voice') || !isDictationSupported();
    ui.mic.disabled = working;
    ui.mic.setAttribute('aria-pressed', String(listening));
    ui.mic.title = listening ? text.listening : text.dictate;
    ui.micLabel.textContent = listening ? text.stop : text.dictate;

    this.#renderSummary();
  }

  /** The review list while reviewing, the skipped fields after a fill. */
  #renderSummary(): void {
    const summary = this.#ui.summary;
    const labels = this.#labels();
    summary.textContent = '';

    if (this.#state === 'review' && this.#extraction) {
      const keys = new Set(this.#extraction.fields.map((field) => field.key));
      for (const [key, value] of Object.entries(this.#extraction.data)) {
        const shown = formatValue(value);
        if (!keys.has(key) || !shown) continue;
        summary.append(this.#reviewRow(key, labels.get(key) ?? key, shown));
      }
      summary.hidden = summary.childElementCount === 0;
      return;
    }

    if (this.#state === 'done' && this.#result && this.#result.skipped.length > 0) {
      for (const { key, reason } of this.#result.skipped) {
        const line = document.createElement('div');
        line.setAttribute('part', 'summary-row');
        line.textContent = this.#text.statusSkipped(labels.get(key) ?? key, reason);
        summary.append(line);
      }
      summary.hidden = false;
      return;
    }

    summary.hidden = true;
  }

  /** One review row: a checkbox, the field label and the extracted value. */
  #reviewRow(key: string, label: string, value: string): HTMLLabelElement {
    const row = document.createElement('label');
    row.setAttribute('part', 'review-row');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.setAttribute('part', 'review-check');
    check.dataset.key = key;
    const name = document.createElement('span');
    name.setAttribute('part', 'review-label');
    name.textContent = label;
    const shown = document.createElement('span');
    shown.setAttribute('part', 'review-value');
    shown.textContent = value;
    row.append(check, name, shown);
    return row;
  }

  /** Field key to human label, for the status line and the summary. */
  #labels(): Map<string, string> {
    const labels = new Map<string, string>();
    if (!this.#form) return labels;
    for (const field of getFormFields(this.#form)) labels.set(field.key, field.label ?? field.key);
    return labels;
  }

  #doneMessage(result: FillResult): string {
    const text = this.#text;
    let message = text.statusDone(result.filled.length);
    if (result.missingRequired.length > 0) {
      const labels = this.#labels();
      const missing = result.missingRequired.map((key) => labels.get(key) ?? key);
      message += ` ${text.statusMissing(missing)}`;
    }
    return message;
  }

  #fail(error: unknown): void {
    const text = this.#text;
    if (error instanceof ProviderError) {
      this.#set('error', text.errorProvider(error.provider, error.status));
    } else if (error instanceof ResponseParseError) {
      this.#set('error', text.errorParse);
    } else {
      this.#set('error', text.errorUnknown);
    }
  }

  /** Fill, or extract for review. Bails out when the state moved on meanwhile. */
  async #run(): Promise<void> {
    const controller = this.#controller;
    if (!controller) return;
    const text = this.#ui.textarea.value.trim();
    if (!text) {
      this.#set('idle', this.#text.statusEmpty);
      return;
    }

    this.#result = null;
    this.#extraction = null;
    this.#set('working', this.#text.statusWorking);

    if (this.hasAttribute('review')) {
      try {
        const extraction = await controller.extract(text);
        if (this.#state !== 'working') return;
        this.#extraction = extraction;
        this.#set('review', this.#text.statusReview);
      } catch (error) {
        if (this.#state === 'working') this.#fail(error);
      }
      return;
    }

    const result = await controller.fill(text);
    if (this.#state !== 'working') return;
    if (!result) {
      // `fill` resolves to null when it was cancelled and when it failed;
      // cancelling has already moved the panel back to idle.
      const snapshot = controller.getSnapshot();
      if (snapshot.state === 'error') this.#fail(snapshot.error);
      return;
    }
    this.#result = result;
    this.#set('done', this.#doneMessage(result));
  }

  #onSubmit = (): void => {
    void this.#run();
  };

  #onCancel = (): void => {
    this.#controller?.cancel();
    this.#set('idle', '');
  };

  #onUndo = (): void => {
    this.#controller?.undo();
    this.#result = null;
    this.#set('idle', this.#text.statusUndone);
  };

  #onApply = (): void => {
    const controller = this.#controller;
    const extraction = this.#extraction;
    if (!controller || !extraction) return;
    const data: Record<string, unknown> = {};
    const checks = this.#ui.summary.querySelectorAll<HTMLInputElement>('[part="review-check"]');
    for (const check of checks) {
      const key = check.dataset.key;
      if (check.checked && key !== undefined) data[key] = extraction.data[key];
    }
    const result = controller.applyExtracted(data, extraction.fields);
    this.#extraction = null;
    this.#result = result;
    this.#set('done', this.#doneMessage(result));
  };

  #onDiscard = (): void => {
    this.#extraction = null;
    this.#set('idle', '');
  };

  #onMic = (): void => {
    if (this.#dictation?.listening) {
      this.#dictation.stop();
      return;
    }
    if (!isDictationSupported()) return;
    const base = this.#ui.textarea.value.trim();
    this.#abandonDictation = false;
    this.#dictation = createDictation({
      lang: this.getAttribute('lang') ?? undefined,
      onText: (spoken) => {
        this.#ui.textarea.value = base ? `${base} ${spoken}` : spoken;
      },
      onEnd: () => {
        this.#dictation = null;
        if (this.#state !== 'listening') return;
        // One gesture: press, speak, stop talking. The auto-stop fills.
        if (this.#abandonDictation || !this.#ui.textarea.value.trim()) this.#set('idle', '');
        else void this.#run();
      },
      onError: () => {
        this.#abandonDictation = true;
      },
    });
    this.#dictation.start();
    this.#set('listening', this.#text.statusListening);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.#dictation?.listening) {
      event.preventDefault();
      this.#abandonDictation = true;
      this.#dictation.stop();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.#run();
    }
  };

  #onFieldFilled = (event: CustomEvent<AFFEventMap['aff:field-filled']>): void => {
    const field = event.detail.element;
    field.setAttribute('data-aff-filled', '');
    const timer = setTimeout(() => {
      this.#timers.delete(timer);
      field.removeAttribute('data-aff-filled');
    }, HIGHLIGHT_MS);
    this.#timers.add(timer);
  };
}

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
export function defineFormFillElement(tag = 'ai-form-fill'): void {
  if (!customElements.get(tag)) customElements.define(tag, AIFormFillElement);
}
