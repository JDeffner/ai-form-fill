/**
 * Dev-server passthrough proxy for OpenAI-compatible services.
 *
 * This is a reference implementation of the recommended production setup: an
 * OpenAI-compatible passthrough that injects the API key server-side so it
 * never reaches the browser. See `examples/server` for a standalone Node
 * version of the same ~20 lines.
 */

import type { MockOptions } from 'vite-plugin-mock-dev-server';
import type { IncomingMessage, ServerResponse } from 'node:http';

async function forward(res: ServerResponse, upstreamUrl: string, init: RequestInit): Promise<void> {
  try {
    const upstream = await fetch(upstreamUrl, init);
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.end(await upstream.text());
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: `Proxy could not reach upstream: ${error}` } }));
  }
}

/**
 * Build the two standard routes (`POST /chat/completions`, `GET /models`) for
 * one provider, mounted under `/api/<route>`.
 *
 * @param options.models - Static model list for services without a `/models`
 *   endpoint (e.g. Perplexity).
 */
export function createOpenAIProxyMocks(options: {
  route: string;
  upstream: string;
  apiKey?: string;
  models?: string[];
}): MockOptions {
  const { route, upstream, apiKey, models } = options;
  const authHeaders: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

  const modelsRoute = models
    ? {
        url: `/api/${route}/models`,
        method: ['GET' as const],
        body: { object: 'list', data: models.map((id) => ({ id, object: 'model' })) },
      }
    : {
        url: `/api/${route}/models`,
        method: ['GET' as const],
        response: async (_req: IncomingMessage, res: ServerResponse) => {
          await forward(res, `${upstream}/models`, { headers: authHeaders });
        },
      };

  return [
    {
      url: `/api/${route}/chat/completions`,
      method: ['POST'],
      response: async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
        await forward(res, `${upstream}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(req.body),
        });
      },
    },
    modelsRoute,
  ];
}
