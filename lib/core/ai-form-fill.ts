/**
 * Core entry point for the library.
 */

import type { ChatRequest, AIFormFillConfig, BuiltInProviderName, FillResult } from './types';
import { AIProvider } from '../providers/provider';
import { analyzeField, getFormFields } from '../form/analyze';
import { applyFieldValue } from '../form/apply';
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

    const result = applyFieldValue(element, content);
    if (!result.applied) {
      this.log(`Value for "${fieldInfo.key}" not applied: ${result.reason}`, content);
      return null;
    }
    this.log(`Field "${fieldInfo.key}" filled with:`, content);
    return { value: content };
  }

  /**
   * Parse unstructured text and fill every matching field in the form.
   *
   * @param formElement - The form to fill.
   * @param text - Source text (resume, email, description, ...).
   * @param options - Optional abort signal.
   * @returns Which fields were filled, which were skipped and why, plus the
   *   raw model output.
   * @throws ProviderError when the provider request fails.
   * @throws ResponseParseError when the model output is empty or not a JSON object.
   */
  async fillForm(
    formElement: HTMLFormElement,
    text: string,
    options?: FillOptions,
  ): Promise<FillResult> {
    const allFields = getFormFields(formElement);
    const fields = this.targetFields
      ? allFields.filter((field) => this.targetFields!.includes(field.key))
      : allFields;

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

    const result: FillResult = { filled: [], skipped: [], unmatchedKeys: [], raw };
    const fieldKeys = new Set(fields.map((field) => field.key));
    result.unmatchedKeys = Object.keys(data).filter((key) => !fieldKeys.has(key));

    for (const field of fields) {
      if (!(field.key in data)) continue;
      const outcome = applyFieldValue(field.element, data[field.key]);
      if (outcome.applied) {
        result.filled.push({ key: field.key, element: field.element, value: outcome.value });
      } else {
        result.skipped.push({ key: field.key, reason: outcome.reason });
      }
    }

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
