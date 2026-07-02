import { defineMock } from 'vite-plugin-mock-dev-server';
import OpenAI from 'openai';

/**
 * Dev proxy for OpenRouter. OpenRouter is OpenAI-compatible, so the `openai`
 * SDK works by pointing baseURL at OpenRouter. In production this logic belongs
 * in your real backend so the key stays server-side.
 */
export default defineMock([
  {
    url: '/api/openrouter/chat',
    method: ['POST'],
    async body(request) {
      const requestBody = request.body;
      const client = new OpenAI({
        apiKey: import.meta.env.VITE_OPENROUTER_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return await client.chat.completions.create({
        model: requestBody.model, // e.g. "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"
        messages: requestBody.messages,
        max_tokens: requestBody.maxTokens,
        ...(requestBody.format
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: { name: 'form_schema', schema: requestBody.format },
              },
            }
          : {}),
      });
    },
    headers: { 'Content-Type': 'application/json' },
  },
  // Comment out to simulate unavailable provider
  {
    url: '/api/openrouter/available',
    method: ['GET', 'POST'],
    body: {},
  },
  {
    url: '/api/openrouter/models',
    method: ['POST'],
    body: {
      models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5'],
    },
  },
]);
