/**
 * Dev proxy for OpenRouter: plain passthrough of the standard OpenAI wire
 * format, injecting the API key server-side. Point the provider at
 * `baseUrl: '/api/openrouter'`.
 */

import { defineMock } from 'vite-plugin-mock-dev-server';
import { createOpenAIProxyMocks } from './openai-proxy';

export default defineMock(
  createOpenAIProxyMocks({
    route: 'openrouter',
    upstream: 'https://openrouter.ai/api/v1',
    apiKey: import.meta.env.VITE_OPENROUTER_KEY,
  }),
);
