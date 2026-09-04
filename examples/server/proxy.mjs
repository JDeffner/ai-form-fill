/**
 * Minimal OpenAI-compatible passthrough proxy (zero dependencies).
 *
 * Forwards `POST /chat/completions` and `GET /models` to an upstream
 * OpenAI-compatible API and injects the API key server-side, so the key never
 * reaches the browser. Point the library at it:
 *
 *   new OpenAICompatibleProvider('openai', { baseUrl: 'http://localhost:8787' })
 *
 * Run:
 *   UPSTREAM=https://api.openai.com/v1 API_KEY=sk-... node examples/server/proxy.mjs
 *
 * Works the same for OpenRouter (https://openrouter.ai/api/v1), Perplexity
 * (https://api.perplexity.ai) or any other OpenAI-compatible service.
 * For production, add rate limiting, auth for your own users, and CORS rules
 * for your domain.
 */

import { createServer } from 'node:http';

const UPSTREAM = process.env.UPSTREAM ?? 'https://api.openai.com/v1';
const API_KEY = process.env.API_KEY ?? '';
const PORT = Number(process.env.PORT ?? 8787);

const server = createServer(async (req, res) => {
  // Allow browser requests during local development.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const route = `${req.method} ${req.url}`;
  if (route !== 'POST /chat/completions' && route !== 'GET /models') {
    return res.writeHead(404).end(JSON.stringify({ error: { message: 'Not found' } }));
  }

  const body = req.method === 'POST' ? await readBody(req) : undefined;
  try {
    const upstream = await fetch(`${UPSTREAM}${req.url}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body,
    });
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(await upstream.text());
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `Upstream unreachable: ${error}` } }));
  }
});

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });
}

server.listen(PORT, () => {
  console.log(`ai-form-fill proxy listening on http://localhost:${PORT} -> ${UPSTREAM}`);
});
