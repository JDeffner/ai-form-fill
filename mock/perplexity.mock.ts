/**
 * Dev proxy for Perplexity: plain passthrough of the standard OpenAI wire
 * format, injecting the API key server-side. Point the provider at
 * `baseUrl: '/api/perplexity'`.
 *
 * Perplexity has no `GET /models` endpoint, so the proxy answers the models
 * route with a static list.
 */

import process from 'node:process';
import { defineMock } from 'vite-plugin-mock-dev-server';
import { createOpenAIProxyMocks } from './openai-proxy';

export default defineMock(
  createOpenAIProxyMocks({
    route: 'perplexity',
    upstream: 'https://api.perplexity.ai',
    // Server-side only; see .env.example. Not a VITE_ var, so it is never
    // inlined into a transpiled artifact or the client bundle.
    apiKey: process.env.PERPLEXITY_API_KEY,
    models: ['sonar', 'sonar-pro', 'sonar-reasoning'],
  }),
);
