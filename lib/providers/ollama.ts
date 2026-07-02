/**
 * Ollama provider: talks directly to a local Ollama runtime over its REST API,
 * with no backend proxy and no external network calls.
 *
 * Use this as a template for other local REST runtimes (LM Studio, LocalAI, ...).
 */

import { AFF_DEFAULTS } from '../core/defaults';
import type { ChatRequest, ChatResponse } from '../core/types';
import { AIProvider, type ProviderConfig, type ProviderType } from './provider';
import { requestJson } from './http';

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
 * const provider = new OllamaProvider({
 *   baseUrl: 'http://localhost:11434',
 *   model: 'gemma3:4b',
 * });
 * ```
 * @see {@link https://docs.ollama.com/api | Ollama API Documentation}
 */
export class OllamaProvider extends AIProvider {
  protected readonly providerName: string = 'ollama';
  protected readonly providerType: ProviderType = 'local';
  protected override supportsStructured: boolean = true;

  constructor(config?: ProviderConfig) {
    super({
      baseUrl: config?.baseUrl ?? AFF_DEFAULTS.ollama.baseUrl,
      model: config?.model ?? AFF_DEFAULTS.ollama.model,
      timeout: config?.timeout,
      fetch: config?.fetch,
    });
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const data = await requestJson<OllamaResponse>(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      body: {
        model: request.model,
        messages: request.messages,
        stream: false,
        // Ollama takes a JSON schema in the top-level `format` field.
        ...(request.format ? { format: request.format } : {}),
        ...(request.maxTokens ? { options: { num_predict: request.maxTokens } } : {}),
      },
      timeout: this.timeout,
      signal: request.signal,
      provider: this.providerName,
      fetchImpl: this.fetchImpl,
    });

    return {
      content: data.message?.content ?? null,
      model: data.model,
      finishReason: data.done ? 'stop' : 'length',
    };
  }

  override async listModels(): Promise<string[]> {
    const data = await requestJson<{ models: OllamaModel[] }>(`${this.baseUrl}/api/tags`, {
      timeout: this.timeout,
      provider: this.providerName,
      fetchImpl: this.fetchImpl,
    });
    return (data.models ?? []).map((model) => model.name);
  }

  override async isAvailable(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }
}
