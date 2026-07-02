/**
 * Dev proxy for Perplexity: plain passthrough of the standard OpenAI wire
 * format, injecting the API key server-side. Point the provider at
 * `baseUrl: '/api/perplexity'`.
 *
 * Perplexity has no `GET /models` endpoint, so the proxy answers the models
 * route with a static list.
 */

import { defineMock } from 'vite-plugin-mock-dev-server';
import { createOpenAIProxyMocks } from './openai-proxy';

export default defineMock(
  createOpenAIProxyMocks({
    route: 'perplexity',
    upstream: 'https://api.perplexity.ai',
    apiKey: import.meta.env.VITE_PERPLEXITY_KEY,
    models: ['sonar', 'sonar-pro', 'sonar-reasoning'],
  }),
);
