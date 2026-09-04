/**
 * Core entry point for the library.
 */

import type {
  ChatRequest,
  AIFormFillConfig,
  BuiltInProviderName,
  ExtractResult,
  FieldInfo,
  FillResult,
} from './types';
import { AIProvider } from '../providers/provider';
import {
  analyzeField,
  getFormFields,
  isFieldEmpty,
  isFieldRequired,
  readFieldValue,
} from '../form/analyze';
import { applyFieldValue } from '../form/apply';
import { dispatchAFFEvent } from './events';
import {
  buildFieldPrompt,
  buildExtractionPrompt,
  SYSTEM_PROMPTS,
  buildFormSchema,
} from '../prompt/build';
import { parseModelResponse } from '../prompt/parse-response';
import { OllamaProvider } from '../providers/ollama';
import {
  OpenAICompatibleProvider,
  type OpenAICompatibleConfig,
} from '../providers/openai-compatible';
import { ResponseParseError } from './errors';

/**
 * Options accepted by the {@link AIFormFill} constructor: field targeting and
 * debug plus provider configuration (baseUrl, model, timeout, apiKey, ...)
 * used when a built-in provider name is passed.
 */
export type AIFormFillOptions = AIFormFillConfig & OpenAICompatibleConfig;

/** Per-call options for {@link AIFormFill.fillForm} / {@link AIFormFill.fillField}. */
export type FillOptions = {
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
export class AIFormFill {
  private provider: AIProvider;
  private targetFields?: string[];
  private readonly debug: boolean;

  /**
   * @param provider - A built-in provider name or a custom {@link AIProvider}.
   * @param options - Field targeting, debug, and provider configuration.
   */
  constructor(provider: BuiltInProviderName | AIProvider, options?: AIFormFillOptions) {
    this.debug = options?.debug ?? false;
    this.provider =
      provider instanceof AIProvider ? provider : AIFormFill.createProvider(provider, options);
    this.targetFields = options?.targetFields;
  }

  private log(...args: unknown[]): void {
    if (this.debug) console.log('[ai-form-fill]', ...args);
  }

  /**
   * Generate and apply content for a single field, inferred from its label,
   * name, placeholder and type. Useful when there is no source text.
   *
   * @param element - The input, textarea or select to fill.
   * @param options - Optional abort signal.
   * @returns The applied value, or `null` when the model produced no usable value.
   * @throws ProviderError when the provider request fails.
   */
  async fillField(element: HTMLElement, options?: FillOptions): Promise<{ value: string } | null> {
    const fieldInfo = analyzeField(element);
    this.log(`Filling ${fieldInfo.type} field "${fieldInfo.key}"`);

    const response = await this.provider.chat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.FIELD_FILL },
        { role: 'user', content: buildFieldPrompt(fieldInfo) },
      ],
      model: this.provider.getSelectedModel(),
      signal: options?.signal,
    });

    const content = response.content?.trim();
    if (!content) return null;

    const previous = readFieldValue(element);
    const result = applyFieldValue(element, content);
    if (!result.applied) {
      this.log(`Value for "${fieldInfo.key}" not applied: ${result.reason}`, content);
      return null;
    }
    dispatchAFFEvent(element, 'aff:field-filled', {
      key: fieldInfo.key,
      element,
      value: result.value,
      previous,
    });
    this.log(`Field "${fieldInfo.key}" filled with:`, content);
    return { value: content };
  }

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
  async extract(
    formElement: HTMLFormElement,
    text: string,
    options?: FillOptions,
  ): Promise<ExtractResult> {
    const fields = getFormFields(formElement).filter((field) => {
      if (this.targetFields && !this.targetFields.includes(field.key)) return false;
      if (options?.skipFilled && !isFieldEmpty(field.element)) return false;
      return true;
    });

    const chatRequest: ChatRequest = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.EXTRACT },
        { role: 'user', content: buildExtractionPrompt(fields, text) },
      ],
      model: this.provider.getSelectedModel(),
      signal: options?.signal,
    };
    if (this.provider.supportsStructuredOutput()) {
      chatRequest.format = buildFormSchema(fields);
    }

    const response = await this.provider.chat(chatRequest);
    const raw = response.content ?? '';
    if (!raw.trim()) {
      throw new ResponseParseError('Provider returned an empty response', { raw });
    }
    const data = parseModelResponse(raw);
    this.log('Extracted data:', data);
    return { data, fields, raw };
  }

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
  async fillForm(
    formElement: HTMLFormElement,
    text: string,
    options?: FillOptions,
  ): Promise<FillResult> {
    dispatchAFFEvent(formElement, 'aff:start', { text });

    let extraction: ExtractResult;
    try {
      extraction = await this.extract(formElement, text, options);
    } catch (error) {
      dispatchAFFEvent(formElement, 'aff:error', { error });
      throw error;
    }

    return this.applyExtraction(extraction.data, extraction.fields, {
      raw: extraction.raw,
      form: formElement,
    });
  }

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
  applyExtraction(
    data: Record<string, unknown>,
    fields: FieldInfo[],
    options?: { raw?: string; form?: HTMLFormElement },
  ): FillResult {
    const raw = options?.raw ?? '';
    const form = options?.form ?? fields[0]?.element.closest('form') ?? undefined;
    const result: FillResult = {
      filled: [],
      skipped: [],
      unmatchedKeys: [],
      missingRequired: [],
      raw,
    };
    const fieldKeys = new Set(fields.map((field) => field.key));
    result.unmatchedKeys = Object.keys(data).filter((key) => !fieldKeys.has(key));

    for (const field of fields) {
      if (!(field.key in data)) continue;
      const previous = readFieldValue(field.element);
      const outcome = applyFieldValue(field.element, data[field.key]);
      if (outcome.applied) {
        const entry = {
          key: field.key,
          element: field.element,
          value: outcome.value,
          previous,
        };
        result.filled.push(entry);
        dispatchAFFEvent(form ?? field.element, 'aff:field-filled', entry);
      } else {
        result.skipped.push({ key: field.key, reason: outcome.reason });
      }
    }

    // Required fields are reported over the whole form, so a targeted fill
    // still tells the caller what the user has to complete by hand.
    const allFields = form ? getFormFields(form) : fields;
    result.missingRequired = allFields
      .filter((field) => isFieldRequired(field.element) && isFieldEmpty(field.element))
      .map((field) => field.key);

    if (form) dispatchAFFEvent(form, 'aff:done', result);
    this.log('Fill result:', result);
    return result;
  }

  /**
   * List the models offered by the current provider.
   * @throws ProviderError when the list cannot be fetched.
   */
  getAvailableModels(): Promise<string[]> {
    return this.provider.listModels();
  }

  /**
   * Select the model to use. Validated against the provider's model list by
   * default; see {@link AIProvider.setSelectedModel}.
   */
  setSelectedModel(modelName: string, options?: { validate?: boolean }): Promise<boolean> {
    return this.provider.setSelectedModel(modelName, options);
  }

  /** The currently selected model. */
  getSelectedModel(): string {
    return this.provider.getSelectedModel();
  }

  /** Restrict filling to these field keys, or pass `undefined` to fill all. */
  setFields(fields: string[] | undefined): void {
    this.targetFields = fields;
  }

  /** The field keys currently targeted, or `undefined` if all are targeted. */
  getFields(): string[] | undefined {
    return this.targetFields;
  }

  /** Whether the current provider is reachable. Never throws. */
  isProviderAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /** Swap the active provider. */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /** The active provider. */
  getProvider(): AIProvider {
    return this.provider;
  }

  /** Build a built-in provider from its name. */
  private static createProvider(
    name: BuiltInProviderName,
    options?: OpenAICompatibleConfig,
  ): AIProvider {
    if (name === 'ollama') {
      return new OllamaProvider({
        baseUrl: options?.baseUrl,
        model: options?.model,
        timeout: options?.timeout,
        fetch: options?.fetch,
      });
    }
    return new OpenAICompatibleProvider(name, options);
  }
}
