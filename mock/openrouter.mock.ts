/**
 * Dev proxy for OpenRouter: plain passthrough of the standard OpenAI wire
 * format, injecting the API key server-side. Point the provider at
 * `baseUrl: '/api/openrouter'`.
 */

import process from 'node:process';
import { defineMock } from 'vite-plugin-mock-dev-server';
import { createOpenAIProxyMocks } from './openai-proxy';

export default defineMock(
  createOpenAIProxyMocks({
    route: 'openrouter',
    upstream: 'https://openrouter.ai/api/v1',
    // Server-side only; see .env.example. Not a VITE_ var, so it is never
    // inlined into a transpiled artifact or the client bundle.
    apiKey: process.env.OPENROUTER_API_KEY,
  }),
);
