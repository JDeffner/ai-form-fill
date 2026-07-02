/**
 * Ollama provider: talks directly to a local Ollama runtime over its REST API,
 * with no backend proxy and no external network calls.
 *
 * Use this as a template for other local REST runtimes (LM Studio, LocalAI, ...).
 */

import { affConfig } from '../core/config';
import type { ChatRequest, ChatResponse } from '../core/types';
import { AIProvider, type ProviderConfig, type ProviderType } from './aiProvider';

/** Ollama chat response shape. */
export type OllamaResponse = {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  created_at?: string;
};

/** Ollama model entry as returned by `/api/tags`. */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

/**
 * Provider for a locally running Ollama instance.
 *
 * @example
 * ```typescript
 * const provider = new LocalOllamaProvider({
 *   apiEndpoint: 'http://localhost:11434',
 *   model: 'gemma3:4b',
 * });
 * ```
 * @see {@link https://docs.ollama.com/api | Ollama API Documentation}
 */
export class LocalOllamaProvider extends AIProvider {
  protected readonly providerName: string = 'ollama';
  protected readonly providerType: ProviderType = 'local';
  protected override supportsStructured: boolean = true;

  private readonly chatEndpoint: string;
  private readonly tagsEndpoint: string;

  constructor(config?: ProviderConfig) {
    super({
      apiEndpoint: config?.apiEndpoint || affConfig.ollama.apiEndpoint,
      model: config?.model || affConfig.ollama.model,
      timeout: config?.timeout || affConfig.timeout,
    });
    this.chatEndpoint = `${this.apiEndpoint}/api/chat`;
    this.tagsEndpoint = `${this.apiEndpoint}/api/tags`;
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
          // Ollama takes a JSON schema in the top-level `format` field.
          ...(request.format ? { format: request.format } : {}),
          options: { num_predict: request.maxTokens },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaResponse;
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
        if (error.message.includes('fetch')) {
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
      const response = await fetch(this.tagsEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = (await response.json()) as { models: OllamaModel[] };
      return (data.models ?? []).map((model) => model.name);
    } catch (error) {
      if (affConfig.debug) console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  override async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.tagsEndpoint);
      return response.ok;
    } catch {
      return false;
    }
  }
}
