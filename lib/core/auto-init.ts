/**
 * One-line setup for the common demo/prototype page layout.
 */

import { AIFormFill } from './ai-form-fill';
import type { BuiltInProviderName } from './types';

/** Options for {@link autoInit}. */
export type AutoInitOptions = {
  /** Id of the form element to fill. Defaults to `aff-form`. */
  formId?: string;
  /** Provider to use; overrides the form's `data-aff-provider` attribute. */
  provider?: BuiltInProviderName;
  /** Model to use; overrides the form's `data-aff-model` attribute. */
  model?: string;
  /** Enable console logging. Defaults to `false`. */
  debug?: boolean;
};

const BUILT_IN_PROVIDERS: readonly BuiltInProviderName[] = [
  'ollama',
  'openai',
  'perplexity',
  'openrouter',
];

function warn(message: string): null {
  console.warn(`[ai-form-fill] autoInit: ${message}`);
  return null;
}

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
export function autoInit(options: AutoInitOptions = {}): AIFormFill | null {
  const formId = options.formId ?? 'aff-form';

  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) {
    return warn(`no <form id="${formId}"> found.`);
  }
  const textArea = document.getElementById('aff-text');
  if (!(textArea instanceof HTMLTextAreaElement)) {
    return warn('no <textarea id="aff-text"> found.');
  }
  const button = document.getElementById('aff-text-button');
  if (!button) {
    return warn('no fill trigger with id "aff-text-button" found.');
  }

  const attrProvider = form.dataset.affProvider?.trim().toLowerCase();
  const providerName = options.provider ?? (attrProvider || 'ollama');
  if (!BUILT_IN_PROVIDERS.includes(providerName as BuiltInProviderName)) {
    return warn(`unknown provider "${providerName}". Available: ${BUILT_IN_PROVIDERS.join(', ')}.`);
  }

  const model = options.model ?? form.dataset.affModel?.trim();

  const aiFormFill = new AIFormFill(providerName as BuiltInProviderName, {
    debug: options.debug ?? false,
    ...(model ? { model } : {}),
  });

  button.addEventListener('click', () => {
    const text = textArea.value.trim();
    aiFormFill.fillForm(form, text).catch((error: unknown) => {
      console.error('[ai-form-fill] fillForm failed:', error);
    });
  });

  return aiFormFill;
}
