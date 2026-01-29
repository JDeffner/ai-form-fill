import type { ChatRequest, ChatResponse } from '../core/types';
import { affConfig } from '../core/config';

/**
 * Configuration options for AI providers.
 */
export interface ProviderConfig {
  apiEndpoint?: string;
  model?: string;
  timeout?: number;
  chatEndpoint?: string;
  listModelsEndpoint?: string;
  availabilityEndpoint?: string;
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
  
  protected selectedModel: string;
  protected apiEndpoint: string;
  protected timeout: number;
  protected supportsStructuredResponses: boolean = false;

  constructor(config?: ProviderConfig) {
    this.apiEndpoint = config?.apiEndpoint || '';
    this.selectedModel = config?.model || '';
    this.timeout = config?.timeout || 30000;
  }
  /**
   * Sends a message to a model of the AI provider and returns the response
   * @param params - The {@link ChatRequest | chat request} including messages, model, etc.
   * @returns A promise that resolves to a {@link ChatResponse}
   */
  abstract chat(params: ChatRequest): Promise<ChatResponse>;

  /** Returns the currently selected model. */
  getSelectedModel(): string {
    return this.selectedModel;
  }

  /**
   * Sets the model to use for chat requests. Validates against available models if possible.
   */
  async setSelectedModel(modelName: string): Promise<boolean> {
    if (!modelName) return false;
    
    try {
      const models = await this.listModels();
      if (models && models.includes(modelName)) {
        this.selectedModel = modelName;
        return true;
      } else if (affConfig.providerDebug) {
        console.warn(`Model "${modelName}" not found. Available: ${models.join(', ')}`);
      }
      return false;
    } catch (err) {
      if (affConfig.providerDebug) console.warn('Could not validate model:', err);
      // Set anyway if validation fails
      this.selectedModel = modelName;
      return true;
    }
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
  abstract isAvailable(): Promise<boolean>;

  getName(): string {
    return this.providerName;
  }

  /**
   * Indicates if the provider supports structured output formats (e.g., JSON Schema)
   * 
   * @returns true if structured output is supported, false otherwise
   */
  supportsStructuredOutput(): boolean {
    return this.supportsStructuredResponses;
  }
}

/**
 * @extension Extend this class for providers that run locally (e.g., Ollama, LocalAI)
 */
export abstract class LocalAIProvider extends AIProvider {
  readonly providerType: ProviderType = 'local';
}

/**
 * @extension Extend this class for providers that run remotely (e.g., OpenAI, Perplexity)
 */
export abstract class RemoteAIProvider extends AIProvider {
  readonly providerType: ProviderType = 'remote';
}