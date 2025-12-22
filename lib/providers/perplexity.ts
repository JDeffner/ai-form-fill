import { OpenAIProvider, type OpenAIResponse } from './openai.ts';

/**
 * Perplexitys Response structure is similar to OpenAI's
 */
export type PerplexityResponse = OpenAIResponse;

/**
 * Provider implementation for Perplexity AI's API
 *
 * @see {@link https://docs.perplexity.ai/getting-started/overview | Perplexity API Documentation}
 */
export class PerplexityProvider extends OpenAIProvider{
  protected providerName: string = 'Perplexity';
}