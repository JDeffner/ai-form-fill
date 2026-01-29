import { OpenAIProvider, type OpenAIResponse } from './openai.ts';
import { type ProviderConfig } from '../providers/aiProvider';
import { affConfig } from '../core/config';

/**
 * Perplexitys Response structure is similar to OpenAI's
 */
export type PerplexityResponse = OpenAIResponse;

/**
 * Provider implementation for Perplexity AI's API
 *
 * @see {@link https://docs.perplexity.ai/getting-started/overview | Perplexity API Documentation}
 */
export class PerplexityProvider extends OpenAIProvider {
  
  protected override providerName: string = 'perplexity';

  constructor(config?: ProviderConfig) {
    super({
      apiEndpoint: config?.apiEndpoint || affConfig.perplexity.apiEndpoint,
      model: config?.model || affConfig.perplexity.model,
      timeout: config?.timeout || affConfig.timeout,
    });
    // Override endpoints for Perplexity
    this.chatEndpoint = `${this.apiEndpoint}/${this.providerName}/chat`;
    this.listModelsEndpoint = `${this.apiEndpoint}/${this.providerName}/models`;
    this.availabilityEndpoint = `${this.apiEndpoint}/${this.providerName}/available`;
  }
}