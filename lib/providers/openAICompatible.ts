import type { ChatRequest, ChatResponse } from '../core/types';
import { AIProvider, type ProviderConfig, type ProviderType } from './aiProvider';
import { affConfig } from '../core/config';

/**
 * Standard OpenAI chat-completions response shape. OpenAI, Perplexity and
 * OpenRouter all return this format, which is why a single provider can serve
 * all three.
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

/**
 * Built-in presets for OpenAI-compatible services. The preset is used as the
 * route segment on your backend proxy (`/<preset>/chat`) and to look up the
 * default model in {@link affConfig}.
 */
export type OpenAICompatiblePreset = 'openai' | 'perplexity' | 'openrouter';

/**
 * One provider for every OpenAI-compatible service.
 *
 * OpenAI, Perplexity and OpenRouter share the same request and response format,
 * so they only differ by a name and a default model. Requests are sent to your
 * own backend proxy at `${apiEndpoint}/${name}/chat` so the API key never
 * reaches the browser.
 *
 * @example
 * ```typescript
 * const openai = new OpenAICompatibleProvider('openai');
 * const router = new OpenAICompatibleProvider('openrouter', { model: 'anthropic/claude-3.5-sonnet' });
 * // Any other OpenAI-compatible service:
 * const custom = new OpenAICompatibleProvider('myservice', { apiEndpoint: '/api', model: 'x' });
 * ```
 */
export class OpenAICompatibleProvider extends AIProvider {
  protected readonly providerName: string;
  protected readonly providerType: ProviderType = 'remote';
  protected override supportsStructured: boolean = true;

  private readonly chatEndpoint: string;
  private readonly listModelsEndpoint: string;
  private readonly availabilityEndpoint: string;

  /**
   * @param name - A preset (`openai` | `perplexity` | `openrouter`) or any
   *   custom route name handled by your proxy.
   * @param config - Optional endpoint / model / timeout overrides.
   */
  constructor(name: OpenAICompatiblePreset | string = 'openai', config?: ProviderConfig) {
    const presetModels: Record<string, string> = {
      openai: affConfig.openai.model,
      perplexity: affConfig.perplexity.model,
      openrouter: affConfig.openrouter.model,
    };
    super({
      apiEndpoint: config?.apiEndpoint || affConfig.apiBase,
      model: config?.model || presetModels[name] || '',
      timeout: config?.timeout || affConfig.timeout,
    });
    this.providerName = name;
    this.chatEndpoint = `${this.apiEndpoint}/${name}/chat`;
    this.listModelsEndpoint = `${this.apiEndpoint}/${name}/models`;
    this.availabilityEndpoint = `${this.apiEndpoint}/${name}/available`;
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${this.providerName} API error: ${response.status} ${response.statusText}`);
      }

      const body = (await response.json()) as OpenAIResponse;
      if (affConfig.debug) console.log(`${this.providerName} response body:`, body);

      if (!body.choices?.length) {
        throw new Error(`${this.providerName} returned no choices`);
      }

      return {
        content: body.choices[0].message.content,
        model: body.model,
        finishReason: body.choices[0].finish_reason,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`${this.providerName} request timed out after ${this.timeout}ms`);
        }
        if (error.message.includes('fetch')) {
          throw new Error(`Failed to connect to ${this.providerName}. Check your network connection.`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  override async listModels(): Promise<string[]> {
    try {
      const response = await fetch(this.listModelsEndpoint, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`${this.providerName} API error: ${response.status} ${response.statusText}`);
      }
      const body = (await response.json()) as { models: string[] };
      return body.models ?? [];
    } catch (error) {
      if (affConfig.debug) console.error(`Error fetching models from ${this.providerName}:`, error);
      return [];
    }
  }

  override async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.availabilityEndpoint, { method: 'POST' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
