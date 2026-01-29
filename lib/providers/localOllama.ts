/**
 * Ollama provider implementation
 * 
 * Reference implementation showing how to integrate with Ollama's REST API using native fetch.
 * This provider demonstrates:
 * - Direct API calls without abstraction layers
 * - Timeout handling with AbortController
 * - Error handling for network issues and HTTP errors
 * - Request/response format translation
 * 
 * Use this as a template for other REST API providers (LM Studio, LocalAI, etc.)
 * 
 * 
 */

import { affConfig } from '../core/config';
import type { ChatRequest, ChatResponse } from '../core/types';
import { LocalAIProvider, type ProviderConfig } from '../providers/aiProvider';

/**
 * Ollama API response format
 */
export type OllamaResponse = {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  created_at?: string;
}

/**
 * Ollama model information
 * 
 * ```ts
 * {
 * name: string;
 * modified_at: string;
 * size: number;
 * }
 * ```
 */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

/**
 * Provider implementation for locally running Ollama instance
 * 
 * Ollama is a popular local AI runtime that supports many open-source models.
 * This implementation uses the Ollama REST API with no external dependencies.
 * 
 * @example
 * ```typescript
 * const provider = new LocalOllamaProvider({
 *   apiEndpoint: 'http://localhost:11434',
 *   model: 'gemma3:4b',
 *   timeout: 30000,
 * });
 * ```
 * @see {@link https://docs.ollama.com/api/introduction | Ollama API Documentation}
 */
export class LocalOllamaProvider extends LocalAIProvider {
  protected providerName: string = 'ollama';
  protected supportsStructuredResponses: boolean = true;
  protected chatEndpoint: string;
  protected listModelsEndpoint: string;
  protected availabilityEndpoint: string;

  constructor(config?: ProviderConfig) {
    super({
      apiEndpoint: config?.apiEndpoint || affConfig.ollama.apiEndpoint,
      model: config?.model || affConfig.ollama.model,
      timeout: config?.timeout || affConfig.timeout,
    });
    this.chatEndpoint = this.apiEndpoint + '/api/chat';
    this.listModelsEndpoint = this.apiEndpoint + '/api/tags';
    this.availabilityEndpoint = this.apiEndpoint + '/api/tags';
  }

  override async chat(params: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const requestEndpoint = this.chatEndpoint;

    try {
      const requestBody = {
        model: params.model,
        messages: params.messages,
        stream: false, 
        options: {
          num_predict: params.maxTokens,
        },
      };

      const response = await fetch(requestEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();

      // Translate Ollama response to standard format
      return {
        content: data.message.content,
        model: data.model,
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Ollama request timed out after ${this.timeout}ms`);
        }
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error(`Failed to connect to Ollama at ${this.apiEndpoint}. Is Ollama running?`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  override async listModels(): Promise<string[]> {
    try {
      const response = await fetch(this.listModelsEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json() as { models: OllamaModel[] };
      return (data.models || []).map((model) => model.name);
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  override async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.availabilityEndpoint, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
