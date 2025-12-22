/**
 * Core AIFormFill class
 * Main entry point for the library
 */

import type {
  FieldInfo,
  ChatMessage,
  AIFormFillConfig,
  AvailableProviders,
} from './types';
import { AIProvider, type ProviderConfig } from '../providers/aiProvider';
import { analyzeField, getFillTargets, setFieldValue, getFieldIdentifier } from '../utils/fieldUtils';
import { buildFieldPrompt, buildParsePrompt, SYSTEM_PROMPTS } from '../utils/prompts';
import { parseJsonResponse } from '../utils/jsonParser';
import { LocalOllamaProvider } from '../providers/localOllama';
import { OpenAIProvider } from '../providers/openai';
import { PerplexityProvider } from '../providers/perplexity';
import { affConfig } from '../config';

/**
 * Main class for AI-powered form input
 * 
 * Provides high-level methods for filling forms using AI. Supports:
 * - Extracting structured data from unstructured text
 * - Filling entire forms automatically
 * - Generating content for individual fields
 * - Multiple AI providers (Ollama, OpenAI, custom)
 * 
 * @example Basic usage with Ollama
 * ```typescript
 * const aiForm = AIFormFill.withOllama('llama3.2');
 * await aiForm.parseAndFillForm(formElement, userText);
 * ```
 * 
 * @example Advanced configuration
 * ```typescript
 * const aiForm = new AIFormFill({
 *   provider: new LocalOllamaProvider({ model: 'llama3.2' }),
 *   debug: true
 * });
 * ```
 */
export class AIFormFill {
  private provider: AIProvider;
  private debug: boolean = affConfig.defaults.debug;
  private context?: string;
  private selectedFields?: string[];

  constructor(providerName: AvailableProviders, options?: Partial<AIFormFillConfig> & Partial<ProviderConfig>) {
    const providerFactories = {
      ollama: () => new LocalOllamaProvider({
        apiEndpoint: options?.apiEndpoint || affConfig.providers.ollama.apiEndpoint,
        model: options?.model || affConfig.providers.ollama.model,
        timeout: options?.timeout || affConfig.providers.ollama.timeout,
      }),
      openai: () => new OpenAIProvider({
        apiEndpoint: options?.apiEndpoint || affConfig.providers.openai.apiEndpoint,
        model: options?.model || affConfig.providers.openai.model,
        timeout: options?.timeout || affConfig.providers.openai.timeout,
      }),
      perplexity: () => new PerplexityProvider({
        apiEndpoint: options?.apiEndpoint || affConfig.providers.perplexity.apiEndpoint,
        model: options?.model || affConfig.providers.perplexity.model,
        timeout: options?.timeout || affConfig.providers.perplexity.timeout,
      }),
      /** 
       * @extension Add more providers here as needed
       */
    };

    const lowercaseProvider = providerName.toLowerCase() as Lowercase<AvailableProviders>;
    const providerFactory = providerFactories[lowercaseProvider];
    
    if (!providerFactory) {
      throw new Error(
        `Unsupported provider: ${providerName}\n` +
        `Available providers: ${Object.keys(providerFactories).join(', ')}`
      );
    }

    const provider = providerFactory();
    
    this.provider = provider;
    this.debug = options?.debug || affConfig.defaults.debug;
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
    
    if (this.debug) {
      console.log(`Filling ${fieldInfo.type} field: ${fieldInfo.name}`);
    }

    // Build the prompt based on field information
    const prompt = buildFieldPrompt(fieldInfo, this.context);

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
      response.content! ? setFieldValue(element, response.content.trim()) : null;
      if (this.debug) {
        console.log('Field filled with:', response.content);
      }
    } catch (error) {
      if (this.debug) {
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
   * 
   * @example Parse resume text into job application
   * 
   * const form = document.querySelector('form');
   * const resumeText = `
   *   John Doe
   *   Email: john@example.com
   *   Phone: (555) 123-4567
   *   I have 5 years of experience in software development...
   * `;
   * 
   * await aiForm.parseAndFillForm(form, resumeText);
   * // Form fields automatically filled with extracted data
   * 
   * 
   * @example Parse structured data
   * typescript
   * const jsonData = JSON.stringify({
   *   firstName: 'Jane',
   *   lastName: 'Smith',
   *   email: 'jane@example.com'
   * });
   * 
   * await aiForm.parseAndFillForm(form, jsonData);
   * 
   */
  async parseAndFillForm(
    formElement: HTMLFormElement,
    unstructuredText: string,
  ): Promise<void> {
    const fillTargets = getFillTargets(formElement);
    
    if (this.debug) {
      console.log('Parsing unstructured text for', fillTargets.length, 'fields');
      // if (unstructuredText)
      //   console.log('Input text is set');
    }

    const filteredFillTargets = 
      this.selectedFields
      ? fillTargets.filter(
          (field: FieldInfo) =>
            field.name && this.selectedFields!.includes(field.name)
        )
      : fillTargets;

    const prompt = buildParsePrompt(filteredFillTargets, unstructuredText);

    if (this.debug)
      console.log('Constructed parse prompt:\n', prompt);

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

    const response = await this.provider.chat({
      messages,
      model: this.provider.getSelectedModel(),
    });

    let extractedData: Record<string, any> = {};

    // if (this.debug) {
    //   console.log('AI response:', response.content);
    // }

    if(response.content) {
      extractedData = parseJsonResponse(response.content);
    } else {
      throw new Error('No content received from AI provider.');  
    }
    

    if (this.debug) 
      console.log('Extracted data:', extractedData);

    // Fill the client form fields with the extracted data
    for (const field of filteredFillTargets) {
      const fieldName = getFieldIdentifier(field);
      if (fieldName 
        && extractedData[fieldName]
      ) {
        try {
          setFieldValue(field.element, extractedData[fieldName]);
          // if (this.debug)
          //   console.log(`Filled "${fieldName}" with:`, extractedData[fieldName]);
        } catch (error) {
          if (this.debug)
            console.error(`Failed to fill field "${fieldName}":`, error);
        }
      }
    }
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
   * Get list of available models from the provider
   * 
   * Queries the provider for available models. Useful for building
   * dynamic model selection interfaces.
   * 
   * @returns Promise resolving to array of model identifiers
   * 
   * @example Build a model selector
   * ```typescript
   * const models = await aiForm.getAvailableModels();
   * 
   * const select = document.querySelector('#model-select');
   * models.forEach(model => {
   *   const option = document.createElement('option');
   *   option.value = model;
   *   option.textContent = model;
   *   select.appendChild(option);
   * });
   * ```
   */
  async getAvailableModels(): Promise<string[]> {
    if (this.provider.listModels) {
      return await this.provider.listModels();
    }
    return [];
  }

}
