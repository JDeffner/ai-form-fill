/**
 * Dev proxy for OpenAI: plain passthrough of the standard OpenAI wire format,
 * injecting the API key server-side. Point the provider at
 * `baseUrl: '/api/openai'`.
 */

import process from 'node:process';
import { defineMock } from 'vite-plugin-mock-dev-server';
import { createOpenAIProxyMocks } from './openai-proxy';

export default defineMock(
  createOpenAIProxyMocks({
    route: 'openai',
    upstream: 'https://api.openai.com/v1',
    // Server-side only; see .env.example. Not a VITE_ var, so it is never
    // inlined into a transpiled artifact or the client bundle.
    apiKey: process.env.OPENAI_API_KEY,
  }),
);
