# Server proxy example

A ~40-line, zero-dependency Node passthrough proxy for any OpenAI-compatible
API. It forwards the two routes the library uses — `POST /chat/completions`
and `GET /models` — and injects the API key **server-side**, so the key never
appears in frontend code or browser network requests.

## Run

```bash
# OpenAI
UPSTREAM=https://api.openai.com/v1 API_KEY=sk-... node examples/server/proxy.mjs

# OpenRouter
UPSTREAM=https://openrouter.ai/api/v1 API_KEY=sk-or-... node examples/server/proxy.mjs

# Perplexity (no /models endpoint upstream — set the model explicitly)
UPSTREAM=https://api.perplexity.ai API_KEY=pplx-... node examples/server/proxy.mjs
```

On Windows (PowerShell):

```powershell
$env:UPSTREAM = 'https://api.openai.com/v1'; $env:API_KEY = 'sk-...'; node examples/server/proxy.mjs
```

## Use from the library

```typescript
import { AIFormFill, OpenAICompatibleProvider } from 'ai-form-fill';

const provider = new OpenAICompatibleProvider('openai', {
  baseUrl: 'http://localhost:8787',
});
const aiFormFill = new AIFormFill(provider);
```

Because the wire format is the standard OpenAI one, you can substitute this
proxy with LiteLLM, an API gateway, or a route in your existing backend — the
library does not care, it just needs an OpenAI-compatible `baseUrl`.
