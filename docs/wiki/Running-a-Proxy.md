# Running a Proxy

This page shows how to use a cloud provider without shipping the API key, with a Node proxy, a
Cloudflare Worker, and a hardening checklist.

## Why

An API key in frontend code is a public key. Anyone can open the network tab, copy it, and spend
your quota. The library refuses an `apiKey` in a browser for exactly this reason.

The fix is a passthrough: the browser calls your server, your server adds the key and forwards the
call. The library needs nothing special for this, because it speaks the standard OpenAI wire format.
Your proxy only has to forward two routes:

- `POST {baseUrl}/chat/completions`
- `GET {baseUrl}/models`

The second one is only used by `getAvailableModels()` and by `setSelectedModel` with validation. A
proxy that forwards only the first route works, as long as you set the model explicitly or pass
`{ validate: false }`.

## Node

`examples/server/proxy.mjs` in the repository is a zero-dependency passthrough of about 40 lines.

```bash
# OpenAI
UPSTREAM=https://api.openai.com/v1 API_KEY=sk-... node examples/server/proxy.mjs

# OpenRouter
UPSTREAM=https://openrouter.ai/api/v1 API_KEY=sk-or-... node examples/server/proxy.mjs

# Perplexity (no /models endpoint upstream, so set the model explicitly)
UPSTREAM=https://api.perplexity.ai API_KEY=pplx-... node examples/server/proxy.mjs
```

On Windows, in PowerShell:

```powershell
$env:UPSTREAM = 'https://api.openai.com/v1'; $env:API_KEY = 'sk-...'; node examples/server/proxy.mjs
```

It listens on port 8787 by default (`PORT` changes it), forwards the two routes, answers everything
else with 404, and sends permissive CORS headers, which is fine for local development and not for
production.

## Cloudflare Worker

The same passthrough, deployed at the edge. Create it with `npm create cloudflare@latest`, replace
`src/index.js`, then set the key as a secret with `npx wrangler secret put API_KEY`.

```javascript
const UPSTREAM = 'https://api.openai.com/v1';
const ALLOWED_ORIGIN = 'https://app.example.com';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  Vary: 'Origin',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    const allowed =
      (request.method === 'POST' && pathname === '/chat/completions') ||
      (request.method === 'GET' && pathname === '/models');
    if (!allowed) return new Response('Not found', { status: 404, headers: cors });

    const upstream = await fetch(`${UPSTREAM}${pathname}`, {
      method: request.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.API_KEY}` },
      body: request.method === 'POST' ? await request.text() : undefined,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
```

`env.API_KEY` comes from the secret, so the key is never in the code, in the repository or in the
browser.

## Point the library at it

```typescript
import { AIFormFill, OpenAICompatibleProvider } from 'ai-form-fill';

const provider = new OpenAICompatibleProvider('openai', {
  baseUrl: 'https://ai-proxy.example.workers.dev',
});
const aiForm = new AIFormFill(provider);
```

With the controller, or with the element, the base URL is one option:

```typescript
createFormFill({ form: '#contact', provider: 'openai', baseUrl: '/ai' });
```

```html
<ai-form-fill for="#contact" provider="openai" base-url="/ai"></ai-form-fill>
```

A same-origin route (`/ai`) needs no CORS headers at all, which is the simplest setup: add the two
routes to the application you already run.

## Hardening checklist

The examples above are passthroughs. Before one faces the internet:

- **Restrict the origin.** Set `Access-Control-Allow-Origin` to your exact origin, not `*`, and send
  `Vary: Origin`. A same-origin route avoids the question.
- **Authenticate your own users.** The proxy holds your key, so anyone who can call it can spend it.
  Require the session cookie or bearer token your app already uses, and reject anonymous calls.
- **Rate limit.** Per user and per IP. One filled form is one request; a hundred per minute is an
  attack.
- **Cap the request size.** Reject bodies over a few hundred kilobytes, so nobody sends a book.
- **Pin the model, or allow-list it.** The body carries a `model` field from the browser. Overwrite
  it server-side, or check it against a list, so nobody switches to your most expensive model.
- **Do not forward client headers.** Build the upstream headers yourself, so a client cannot inject
  its own `Authorization`.
- **Forward only the two routes.** Everything else gets a 404, so the proxy is not a general tunnel
  to the provider's API.
- **Log without the payload.** The request body contains the user's text, which is usually personal
  data. Log status codes and timing, not content.
- **Set a timeout** on the upstream call, so a slow provider does not tie up your workers.

## Alternatives

The wire format is standard, so anything that speaks it can take the proxy's place:

- **LiteLLM** in front of any provider, including Anthropic and Gemini.
- An **API gateway** (Kong, APISIX, cloud gateways) with a key-injection plugin.
- A **route in your existing backend**, which is usually the least work: you already have sessions,
  rate limits and logging there.
