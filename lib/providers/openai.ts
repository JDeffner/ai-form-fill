import type { ChatRequest, ChatResponse } from '../core/types';
import { RemoteAIProvider, type ProviderConfig } from '../providers/aiProvider';
import { affConfig } from '../core/config';


/** 
 * OpenAI API response format
 */
export type  OpenAIResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Provider implementation for OpenAI's API
 * 
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   model: 'gpt-5-nano',
 *   timeout: 60000,
 * });
 * ```
 * @see {@link https://platform.openai.com/docs/guides/text?prompt-templates-examples=filevar | OpenAI API Documentation} 
 */
export class OpenAIProvider extends RemoteAIProvider {
  protected providerName: string = 'openai';
  protected supportsStructuredResponses: boolean = true;
  protected chatEndpoint: string;
  protected listModelsEndpoint: string;
  protected availabilityEndpoint: string;

  constructor(config?: ProviderConfig) {
    super({
          apiEndpoint: config?.apiEndpoint || affConfig.openai.apiEndpoint,
          model: config?.model || affConfig.openai.model,
      timeout: config?.timeout || affConfig.timeout,
    });
    this.chatEndpoint = `${this.apiEndpoint}/${this.providerName}/chat`;
    this.listModelsEndpoint = `${this.apiEndpoint}/${this.providerName}/models`;
    this.availabilityEndpoint = `${this.apiEndpoint}/${this.providerName}/available`;
  }

  override async chat(params: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const requestEndpoint = this.chatEndpoint;

    try {
      const response = await fetch(requestEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const responseBody = await response.json() as OpenAIResponse;

      if (affConfig.providerDebug)
        console.log(`${this.providerName} response body:`, responseBody);
      
      return {
        content: responseBody.choices[0].message.content,
        model: responseBody.model,
        finishReason: responseBody.choices[0].finish_reason
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`${this.providerName} request timed out after ${this.timeout}ms`);
        }
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error(`Failed to connect to ${this.providerName}. Check your network connection.`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  override async listModels(): Promise<string[]> {
    const responseEndpoint = this.listModelsEndpoint;
    try {
      const response = await fetch(responseEndpoint, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`${this.providerName} API error: ${response.status} ${response.statusText}`);
      }
      const responseBody = await response.json();
      return responseBody.models as string[];
    } catch (error) {
      if (affConfig.providerDebug)
        throw new Error(`Error fetching models from ${this.providerName}: ${error}`);
      return [];
    }
  }

  override async isAvailable(): Promise<boolean> {
    const responseEndpoint = this.availabilityEndpoint;

    try {
      const response = await fetch(responseEndpoint, { method: 'POST' });
      return response.ok;
    } catch (error) {
      if (affConfig.providerDebug)
        throw error;
      return false;
    } 
  }
}
