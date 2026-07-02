/**
 * One provider for every OpenAI-compatible service, speaking the standard
 * chat-completions wire format directly.
 */

import type { ChatRequest, ChatResponse } from '../core/types';
import { AIProvider, type ProviderConfig, type ProviderType } from './provider';
import { AFF_DEFAULTS } from '../core/defaults';
import { AFFError, ProviderError } from '../core/errors';
import { requestJson } from './http';

/**
 * Standard OpenAI chat-completions response shape. OpenAI, Perplexity and
 * OpenRouter all return this format, which is why a single provider can serve
 * all of them.
 */
export type OpenAIResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/** Standard `GET /models` response shape. */
export type OpenAIModelsResponse = {
  object: string;
  data: Array<{ id: string; object?: string }>;
};

/**
 * Built-in presets for OpenAI-compatible services. A preset supplies a default
 * `baseUrl` and model (see {@link AFF_DEFAULTS}).
 */
export type OpenAICompatiblePreset = 'openai' | 'perplexity' | 'openrouter';

/**
 * Configuration for {@link OpenAICompatibleProvider}.
 */
export interface OpenAICompatibleConfig extends ProviderConfig {
  /**
   * API key sent as `Authorization: Bearer <key>`.
   *
   * **Do not ship API keys in frontend code.** In the browser this option
   * throws unless {@link allowApiKeyInBrowser} is set; the production setup is
   * pointing {@link ProviderConfig.baseUrl | baseUrl} at your own
   * OpenAI-compatible passthrough proxy that injects the key server-side.
   */
  apiKey?: string;
  /**
   * Explicit opt-in to use {@link apiKey} in a browser context. Only for local
   * prototyping — anyone can read the key from the page.
   */
  allowApiKeyInBrowser?: boolean;
  /** Extra headers to send with every request. */
  headers?: Record<string, string>;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Provider for OpenAI and any OpenAI-compatible service.
 *
 * Requests use the standard wire format: `POST {baseUrl}/chat/completions`
 * and `GET {baseUrl}/models`. Structured output is requested via
 * `response_format: { type: 'json_schema', ... }`.
 *
 * @example
 * ```typescript
 * // A preset, via your own passthrough proxy (recommended for production):
 * const openai = new OpenAICompatibleProvider('openai', { baseUrl: '/api/openai' });
 * // Direct with a key (prototyping only!):
 * const router = new OpenAICompatibleProvider('openrouter', {
 *   apiKey: '...',
 *   allowApiKeyInBrowser: true,
 * });
 * // Any other OpenAI-compatible service:
 * const local = new OpenAICompatibleProvider('lmstudio', {
 *   baseUrl: 'http://localhost:1234/v1',
 *   model: 'qwen2.5-7b-instruct',
 * });
 * ```
 */
export class OpenAICompatibleProvider extends AIProvider {
  protected readonly providerName: string;
  protected readonly providerType: ProviderType = 'remote';
  protected override supportsStructured: boolean = true;

  private readonly apiKey?: string;
  private readonly extraHeaders?: Record<string, string>;

  /**
   * @param name - A preset (`openai` | `perplexity` | `openrouter`) or any
   *   name for a custom OpenAI-compatible service (requires `baseUrl`).
   * @param config - baseUrl / apiKey / model / timeout / headers overrides.
   */
  constructor(
    name: OpenAICompatiblePreset | (string & {}) = 'openai',
    config?: OpenAICompatibleConfig,
  ) {
    const presets: Record<OpenAICompatiblePreset, { baseUrl: string; model: string }> = {
      openai: AFF_DEFAULTS.openai,
      perplexity: AFF_DEFAULTS.perplexity,
      openrouter: AFF_DEFAULTS.openrouter,
    };
    const preset = (presets as Record<string, { baseUrl: string; model: string } | undefined>)[
      name
    ];

    const baseUrl = config?.baseUrl ?? preset?.baseUrl;
    if (!baseUrl) {
      throw new AFFError(
        `No baseUrl for provider "${name}". Non-preset providers require { baseUrl }.`,
      );
    }

    super({
      baseUrl,
      model: config?.model ?? preset?.model ?? '',
      timeout: config?.timeout,
      fetch: config?.fetch,
    });
    this.providerName = name;

    if (config?.apiKey && isBrowser() && !config.allowApiKeyInBrowser) {
      throw new AFFError(
        'Refusing to use an API key in the browser: it would be visible to anyone. ' +
          'Point baseUrl at a server-side proxy instead, or pass allowApiKeyInBrowser: true ' +
          'for local prototyping only.',
      );
    }
    this.apiKey = config?.apiKey;
    this.extraHeaders = config?.headers;
  }

  private buildHeaders(): Record<string, string> {
    return {
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      ...this.extraHeaders,
    };
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
    };
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.format) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'form_fields', schema: request.format },
      };
    }

    const data = await requestJson<OpenAIResponse>(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      body,
      headers: this.buildHeaders(),
      timeout: this.timeout,
      signal: request.signal,
      provider: this.providerName,
      fetchImpl: this.fetchImpl,
    });

    const choice = data.choices?.[0];
    if (!choice) {
      throw new ProviderError(`${this.providerName}: response contained no choices`, {
        provider: this.providerName,
      });
    }

    return {
      content: choice.message?.content ?? null,
      model: data.model,
      finishReason: choice.finish_reason,
    };
  }

  override async listModels(): Promise<string[]> {
    const data = await requestJson<OpenAIModelsResponse>(`${this.baseUrl}/models`, {
      headers: this.buildHeaders(),
      timeout: this.timeout,
      provider: this.providerName,
      fetchImpl: this.fetchImpl,
    });
    return (data.data ?? []).map((model) => model.id);
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
