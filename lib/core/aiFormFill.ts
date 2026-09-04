/**
 * Core AIFormFill class
 * Main entry point for the library
 */

import type {
  FieldInfo,
  ChatMessage,
  ChatRequest,
  AIFormFillConfig,
  AvailableProviders,
} from './types';
import { AIProvider, type ProviderConfig } from '../providers/aiProvider';
import { analyzeField, getFillTargets, setFieldValue, getFieldIdentifier } from '../utils/fieldUtils';
import { buildFieldPrompt, buildParsePrompt, SYSTEM_PROMPTS, generateFormSchema } from '../utils/prompts';
import { parseJsonResponse } from '../utils/jsonParser';
import { LocalOllamaProvider } from '../providers/localOllama';
import { OpenAIProvider } from '../providers/openai';
import { PerplexityProvider } from '../providers/perplexity';
import { affConfig } from './config';

/**
 * Main class for AI-powered form input
 * 
 * Provides high-level methods for filling forms using AI. Supports:
 * - Extracting structured data from unstructured text
 * - Filling entire forms automatically
 * - Generating content for individual fields
 * - Multiple AI providers (Ollama, OpenAI, custom)
 * 
 */
export class AIFormFill {
  private provider: AIProvider;
  private allowedProviders?: AIProvider[];
  private selectedFields?: string[];
 
  constructor(desiredProvider: AvailableProviders | AIProvider, options?: AIFormFillConfig & Partial<ProviderConfig>) {
    if (desiredProvider instanceof AIProvider) {
      this.provider = desiredProvider;
    } else {
      this.provider = AIFormFill.constructProviderWithName(desiredProvider, options);
    }

    this.selectedFields = options?.targetFields;
    this.allowedProviders = options?.allowedProviders;
  }

  /**
   * Fill a single form field with AI-generated content
   * 
   * Generates appropriate content for one field based on its label, name,
   * placeholder, and type. Useful for creative content or when you don't
   * have source text to extract from.
   * 
   * @param element - The form field element to fill (input, textarea, or select)
   * 
   * @example
   * ```typescript
   * const bioField = document.querySelector('#bio');
   * await aiForm.fillSingleField(bioField);
   * ```
   */
  async fillSingleField(
    element: HTMLElement,
  ): Promise<void> {
    const fieldInfo = analyzeField(element);
    
    if (affConfig.formFillDebug) {
      console.log(`Filling ${fieldInfo.type} field: ${fieldInfo.name}`);
    }

    // Build the prompt based on field information
    const prompt = buildFieldPrompt(fieldInfo);

    // Get AI response
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS.FIELD_FILL,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.provider.chat({
        messages,
        model: this.provider.getSelectedModel(),
      });
      if(response.content) {
        setFieldValue(element, response.content.trim());
      }
      if (affConfig.formFillDebug) {
        console.log('Field filled with:', response.content);
      }
    } catch (error) {
      if (affConfig.formFillDebug) {
        console.error('Error during fillSingleField:', error);
      }
    }
  }

  /**
   * Parse unstructured text and automatically fill matching form fields
   * 
   * @param formElement - The HTML form to fill
   * @param unstructuredText - The source text to extract data from
   *   - Examples: Resume text, email body, paragraph descriptions, JSON strings
   */
  async parseAndFillForm(
    formElement: HTMLFormElement,
    unstructuredText: string,
  ): Promise<void> {
    const fillTargets = getFillTargets(formElement);
    
    if (affConfig.formFillDebug) {
      console.log('Parsing unstructured text for', fillTargets.length, 'fields');
      console.log('Unstructured text:', fillTargets);
    }

    const filteredFillTargets = 
      this.selectedFields
      ? fillTargets.filter(
          (field: FieldInfo) =>
            field.name && this.selectedFields!.includes(field.name)
        )
      : fillTargets;

    const prompt = buildParsePrompt(filteredFillTargets, unstructuredText);

    if (affConfig.formFillDebug) {
      console.groupCollapsed('Constructed parse prompt:');
      console.log(prompt);
      console.groupEnd();
      console.log(`Sending prompt to ${this.provider.getName()}'s ${this.provider.getSelectedModel()} model...`);
    }
     

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPTS.PARSE_EXTRACT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Build chat request with optional structured output format
    const chatRequest: ChatRequest = {
      messages,
      model: this.provider.getSelectedModel(),
    };

    if (this.provider.supportsStructuredOutput()) {
      chatRequest.format = generateFormSchema(filteredFillTargets);
      if (affConfig.formFillDebug) console.log('Using structured output format:', chatRequest.format);
    }

    let extractedData: Record<string, string> = {};

    try {
      const response = await this.provider.chat(chatRequest);

      if (!response.content) {
        if (affConfig.formFillDebug) console.warn('No content received from AI provider.');
        return;
      }

      extractedData = parseJsonResponse(response.content);
    } catch (error) {
      if (affConfig.formFillDebug) console.error('Error calling AI provider:', error);
      return;
    }
    

    if (affConfig.formFillDebug) 
      console.log('Extracted data:', extractedData);

    // Fill the client form fields with the extracted data
    for (const field of filteredFillTargets) {
      const fieldName = getFieldIdentifier(field);
      if (fieldName 
        && extractedData[fieldName]
      ) {
        try {
          setFieldValue(field.element, extractedData[fieldName]);
        } catch (error) {
          if (affConfig.formFillDebug) {
            console.error(`Failed to fill field "${fieldName}":`, error);
          }
        }
      }
    }
  }


  /**
   * Get list of available models from the form's provider
   */
  async getAvailableModels(): Promise<string[]> {
    if (this.provider.listModels) {
      return await this.provider.listModels();
    }
    return [];
  }

  /**
   * Set the model to use for chat requests
   */
  async setSelectedModel(modelName: string): Promise<boolean> {
    return this.provider.setSelectedModel(modelName);
  }

  /**
   * Get the currently selected model
   */
  getSelectedModel(): string {
    return this.provider.getSelectedModel();
  }

  /**
   * Set which fields should be filled
   */
  setFields(fields: string[] | undefined): void {
    this.selectedFields = fields || undefined;
    return;
  }

  /**
   * Get the currently configured field targets
   * 
   * @returns Array of field names being targeted, or undefined if all fields are targeted
   */
  getFields(): string[] | undefined {
    return this.selectedFields;
  }

  /**
   * Check if the AI provider is available and responding
   * 
   * @returns Promise resolving to true if provider is available, false otherwise
   */
  async providerAvailable(): Promise<boolean> {
    if (this.provider.isAvailable) {
      return await this.provider.isAvailable();
    }
    return true;
  }

  /**
   * Change the AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Get the current AI provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Get the list of allowed providers, if any
   */
  getListOfAllowedProviders(): AIProvider[] | undefined {
    return this.allowedProviders;
  }
  
  /**
   * Setup the AI provider based on the desired provider name
   */
  private static constructProviderWithName(
    providerName: AvailableProviders, 
    options?: AIFormFillConfig & Partial<ProviderConfig>
  ): AIProvider {
    const providerConfig: ProviderConfig = {
      apiEndpoint: options?.apiEndpoint || '',
      model: options?.model || '',
      timeout: options?.timeout,
    };
    
    const providerFactories = {
        ollama: () => new LocalOllamaProvider(providerConfig),
        openai: () => new OpenAIProvider(providerConfig),
        perplexity: () => new PerplexityProvider(providerConfig),
        /** 
         * @extension Add more providers here as needed
         */
      };
    return providerFactories[providerName]();
  }
}
