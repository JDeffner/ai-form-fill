/**
 * Dev proxy for OpenAI: plain passthrough of the standard OpenAI wire format,
 * injecting the API key server-side. Point the provider at
 * `baseUrl: '/api/openai'`.
 */

import { defineMock } from 'vite-plugin-mock-dev-server';
import { createOpenAIProxyMocks } from './openai-proxy';

export default defineMock(
  createOpenAIProxyMocks({
    route: 'openai',
    upstream: 'https://api.openai.com/v1',
    apiKey: import.meta.env.VITE_OPEN_AI_KEY,
  }),
);
