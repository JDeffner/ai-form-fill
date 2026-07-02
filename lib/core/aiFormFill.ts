/**
 * Core entry point for the library.
 */

import type {
  FieldInfo,
  ChatMessage,
  ChatRequest,
  AIFormFillConfig,
  AvailableProviders,
} from './types';
import { AIProvider, type ProviderConfig } from '../providers/aiProvider';
import {
  analyzeField,
  getFillTargets,
  setFieldValue,
  getFieldIdentifier,
} from '../utils/fieldUtils';
import {
  buildFieldPrompt,
  buildParsePrompt,
  SYSTEM_PROMPTS,
  generateFormSchema,
} from '../utils/prompts';
import { parseJsonResponse } from '../utils/jsonParser';
import { LocalOllamaProvider } from '../providers/localOllama';
import { OpenAICompatibleProvider } from '../providers/openAICompatible';
import { affConfig } from './config';

/**
 * AI-powered form filling.
 *
 * - Extract structured data from unstructured text and fill a whole form.
 * - Generate content for a single field.
 * - Works with any {@link AIProvider} (built-in or custom).
 */
export class AIFormFill {
  private provider: AIProvider;
  private selectedFields?: string[];

  /**
   * @param provider - A built-in provider name or a custom {@link AIProvider}.
   * @param options - Field targeting, debug, and provider overrides.
   */
  constructor(
    provider: AvailableProviders | AIProvider,
    options?: AIFormFillConfig & Partial<ProviderConfig>,
  ) {
    if (options?.debug !== undefined) {
      affConfig.debug = options.debug;
    }

    this.provider =
      provider instanceof AIProvider ? provider : AIFormFill.createProvider(provider, options);

    this.selectedFields = options?.targetFields;
  }

  /**
   * Generate and set content for a single field, inferred from its label,
   * name, placeholder and type. Useful when there is no source text.
   *
   * @param element - The input, textarea or select to fill.
   */
  async fillSingleField(element: HTMLElement): Promise<void> {
    const fieldInfo = analyzeField(element);
    if (affConfig.debug) console.log(`Filling ${fieldInfo.type} field: ${fieldInfo.name}`);

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS.FIELD_FILL },
      { role: 'user', content: buildFieldPrompt(fieldInfo) },
    ];

    try {
      const response = await this.provider.chat({
        messages,
        model: this.provider.getSelectedModel(),
      });
      if (response.content) {
        setFieldValue(element, response.content.trim());
      }
      if (affConfig.debug) console.log('Field filled with:', response.content);
    } catch (error) {
      if (affConfig.debug) console.error('Error during fillSingleField:', error);
    }
  }

  /**
   * Parse unstructured text and fill every matching field in the form.
   *
   * @param formElement - The form to fill.
   * @param unstructuredText - Source text (resume, email, description, ...).
   */
  async parseAndFillForm(formElement: HTMLFormElement, unstructuredText: string): Promise<void> {
    const allTargets = getFillTargets(formElement);
    const targets = this.selectedFields
      ? allTargets.filter((f: FieldInfo) => f.name && this.selectedFields!.includes(f.name))
      : allTargets;

    const chatRequest: ChatRequest = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.PARSE_EXTRACT },
        { role: 'user', content: buildParsePrompt(targets, unstructuredText) },
      ],
      model: this.provider.getSelectedModel(),
    };

    if (this.provider.supportsStructuredOutput()) {
      chatRequest.format = generateFormSchema(targets);
    }

    let extractedData: Record<string, string>;
    try {
      const response = await this.provider.chat(chatRequest);
      if (!response.content) {
        if (affConfig.debug) console.warn('No content received from AI provider.');
        return;
      }
      extractedData = parseJsonResponse(response.content);
    } catch (error) {
      if (affConfig.debug) console.error('Error calling AI provider:', error);
      return;
    }

    if (affConfig.debug) console.log('Extracted data:', extractedData);

    for (const field of targets) {
      const key = getFieldIdentifier(field);
      if (key && extractedData[key]) {
        try {
          setFieldValue(field.element, extractedData[key]);
        } catch (error) {
          if (affConfig.debug) console.error(`Failed to fill field "${key}":`, error);
        }
      }
    }
  }

  /** List the models offered by the current provider. */
  getAvailableModels(): Promise<string[]> {
    return this.provider.listModels();
  }

  /** Select the model to use, validated against the provider when possible. */
  setSelectedModel(modelName: string): Promise<boolean> {
    return this.provider.setSelectedModel(modelName);
  }

  /** The currently selected model. */
  getSelectedModel(): string {
    return this.provider.getSelectedModel();
  }

  /** Restrict filling to these field names, or pass `undefined` to fill all. */
  setFields(fields: string[] | undefined): void {
    this.selectedFields = fields;
  }

  /** The field names currently targeted, or `undefined` if all are targeted. */
  getFields(): string[] | undefined {
    return this.selectedFields;
  }

  /** Whether the current provider is reachable. */
  providerAvailable(): Promise<boolean> {
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
    name: AvailableProviders,
    options?: Partial<ProviderConfig>,
  ): AIProvider {
    const config: ProviderConfig = {
      apiEndpoint: options?.apiEndpoint,
      model: options?.model,
      timeout: options?.timeout,
    };
    return name === 'ollama'
      ? new LocalOllamaProvider(config)
      : new OpenAICompatibleProvider(name, config);
  }
}
