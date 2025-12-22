import type { ChatRequest, ChatResponse } from '../core/types';
import { affConfig } from '../config';

/**
 * Configuration for AI providers
 * @param apiEndpoint - The URL of the AI provider's API (if applicable)
 * @param model - The default model to use
 * @param timeout - Optional timeout for requests in milliseconds
 */
export interface ProviderConfig {
  apiEndpoint: string;
  model?: string;
  timeout?: number;
}

/**
 * Response format for provider-specific API calls
 * 
 * @remark While not strictly necessary, a type like this should be created for each provider
 * to define the expected response structure from their APIs. This helps with type safety and clarity when handling responses.
 */
export type ProviderResponse = {
}

export type ProviderType = 'local' | 'remote';

/**
 * Base class that all AI providers must extend
 * 
 * Providers are responsible for:
 * - Making API calls to their respective AI services (using fetch, axios, SDKs, etc.)
 * - Translating provider-specific request/response formats to the standard ChatParams/ChatResponse
 * - Handling authentication, rate limiting, and error handling
 * - Implementing optional features like model listing and availability checks
 * 
 * @see Documentation: {@link AIProvider}
 */
export abstract class AIProvider {
  protected abstract providerName: string;
  protected abstract providerType: ProviderType;
  /**
   * **Optional**: Concrete link to endpoint that sends chat messages
   */
  protected chatEndpoint?: string;
  /**
   * **Optional**: Concrete link to endpoint that lists available models
   */
  protected listModelsEndpoint?: string;
  /**
   * **Optional**: Concrete link to endpoint that checks API availability
   */
  protected availabilityEndpoint?: string;
  protected selectedModel?: string;
  protected apiEndpoint: string;
  protected timeout: number;
  protected debug: boolean = affConfig.defaults.debug;

  constructor(config: ProviderConfig) {
    this.apiEndpoint = config.apiEndpoint;
    this.selectedModel = config.model;
    this.timeout = config.timeout || 30000;
  }
  /**
   * Sends a message to a model of the AI provider and returns the response
   * @param params - The {@link ChatRequest | chat request} including messages, model, etc.
   * @returns A promise that resolves to a {@link ChatResponse}
   */
  abstract chat(params: ChatRequest): Promise<ChatResponse>;

  /**
   * 
   * @returns The currently selected model or undefined
   */
  getSelectedModel(): string | undefined {
    return this.selectedModel;
  }

  /**
   * Set the selected model
   * @param model - The model to select
   */
  setSelectedModel(model: string): void {
    if (!model) return;
    if (typeof this.listModels === 'function') {
      this.listModels()
        .then((models) => {
          if (models && models.includes(model)) {
            this.selectedModel = model;
          } else if (this.debug) {
            console.log(`Model "${model}" not found in provider models.`);
          }
        })
        .catch((err) => {
          if (this.debug) console.log('listModels failed:', err);
        });
      return;
    }

    // If no listModels is available, do not change selection by default.
  }

  /**
   * Lists available provider models
   * 
   * @returns The currently configured model(s) as a Promise resolving to an array of model names
   */
  abstract listModels(): Promise<string[]>;

  /**
   * **Optional**: Checks if the provider's API is accessible
   * 
   * @returns Promise resolving to true if the API is accessible
   */
  isAvailable?(): Promise<boolean>;

  getName(): string {
    return this.providerName;
  }
}

/**
 * @extension Extend this class for providers that run locally (e.g., Ollama, LocalAI)
 */
export abstract class LocalAIProvider extends AIProvider {
  protected providerType: ProviderType = 'local';
}

/**
 * @extension Extend this class for providers that run remotely (e.g., OpenAI, Perplexity)
 */
export abstract class RemoteAIProvider extends AIProvider {
  protected providerType: ProviderType = 'remote';
}