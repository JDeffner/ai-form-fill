# Providers

This page covers the two built-in providers, how to point them at any OpenAI-compatible service, and
how to write your own.

A provider does three things: it makes the network call, it translates the library's `ChatRequest`
and `ChatResponse` to and from the service's wire format, and it reports which models it offers.
Nothing else in the library knows about HTTP.

## Ollama

Local Ollama is the default and needs no configuration. It is the only provider that runs on the
user's machine, so no text leaves it.

```typescript
import { AIFormFill, OllamaProvider } from 'ai-form-fill';

const aiForm = new AIFormFill('ollama', { model: 'gemma3:4b' });
// the same, explicitly:
const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434', model: 'gemma3:4b' });
```

| Option    | Default                  | Notes                            |
| --------- | ------------------------ | -------------------------------- |
| `baseUrl` | `http://localhost:11434` | Trailing slashes are stripped    |
| `model`   | `gemma3:4b`              | Any tag `ollama list` shows      |
| `timeout` | `30000`                  | Milliseconds                     |
| `fetch`   | the global `fetch`       | Custom implementation, for tests |

It calls `POST {baseUrl}/api/chat` with `stream: false`, and `GET {baseUrl}/api/tags` for the model
list.

**Structured output.** Ollama accepts a JSON schema in the top-level `format` field, so the model is
constrained to the form's own fields and to the real option values. This is why small local models
work well here. The schema avoids constructs that grammar-based enforcers reject; see
[Architecture](Architecture).

**Model choice.** Any instruction-following model works. `gemma3:4b` is the default because it is
small enough for a laptop and follows the schema. Larger models make fewer mistakes on long text. A
model without chat support fails with an HTTP error from Ollama; see
[Errors and Troubleshooting](Errors-and-Troubleshooting).

**CORS.** Ollama only answers browser requests from origins it knows. Set `OLLAMA_ORIGINS` when your
page is not on localhost.

## OpenAI-compatible services

`OpenAICompatibleProvider` speaks the standard wire format: `POST {baseUrl}/chat/completions` and
`GET {baseUrl}/models`, with structured output requested through
`response_format: { type: 'json_schema', ... }`. Anything that speaks it works.

### Presets

A preset supplies a base URL and a default model. The names are also accepted directly by the
`AIFormFill` constructor and by the element's `provider` attribute.

| Name         | Base URL                       | Default model        |
| ------------ | ------------------------------ | -------------------- |
| `openai`     | `https://api.openai.com/v1`    | `gpt-5-nano`         |
| `perplexity` | `https://api.perplexity.ai`    | `sonar`              |
| `openrouter` | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |

```typescript
import { AIFormFill, OpenAICompatibleProvider } from 'ai-form-fill';

const provider = new OpenAICompatibleProvider('openai', {
  baseUrl: 'https://my-app.com/ai', // your proxy, the key stays server-side
});
const aiForm = new AIFormFill(provider);
```

### Any other service

Any name works, as long as you supply a `baseUrl`. The name is only used for error messages and
grouping. A missing `baseUrl` on a non-preset name throws an `AFFError` right in the constructor.

```typescript
// LM Studio
new OpenAICompatibleProvider('lmstudio', {
  baseUrl: 'http://localhost:1234/v1',
  model: 'qwen2.5-7b-instruct',
});

// vLLM
new OpenAICompatibleProvider('vllm', {
  baseUrl: 'http://localhost:8000/v1',
  model: 'meta-llama/Llama-3.1-8B-Instruct',
});

// Groq, Mistral, Anthropic and everything else: through your own gateway route,
// so the key stays on the server.
new OpenAICompatibleProvider('groq', { baseUrl: '/api/groq' });
new OpenAICompatibleProvider('mistral', { baseUrl: '/api/mistral' });
new OpenAICompatibleProvider('anthropic', {
  baseUrl: '/api/anthropic',
  model: 'claude-sonnet-4-5',
});
```

Anthropic's own API is not OpenAI-compatible. Put a gateway (LiteLLM, an API gateway, or a route of
your own) in front of it that speaks the OpenAI format, and point `baseUrl` at that.

### Options

| Option                 | Type                     | Notes                                                    |
| ---------------------- | ------------------------ | -------------------------------------------------------- |
| `baseUrl`              | `string`                 | Required for non-preset names                            |
| `model`                | `string`                 | Falls back to the preset's model                         |
| `apiKey`               | `string`                 | Sent as `Authorization: Bearer <key>`                    |
| `allowApiKeyInBrowser` | `boolean`                | Explicit opt-in; without it `apiKey` throws in a browser |
| `headers`              | `Record<string, string>` | Extra headers on every request                           |
| `timeout`              | `number`                 | Milliseconds, default `30000`                            |
| `fetch`                | `typeof fetch`           | Custom implementation                                    |

### API keys

The constructor refuses an `apiKey` in a browser, because anyone can read it out of a shipped page.
For local prototyping you can opt in:

```typescript
const provider = new OpenAICompatibleProvider('openrouter', {
  apiKey: 'sk-or-...',
  allowApiKeyInBrowser: true, // prototyping only, never production
  model: 'openai/gpt-4o-mini',
});
```

In production, point `baseUrl` at a server-side passthrough instead. See
[Running a Proxy](Running-a-Proxy) and [Security and Privacy](Security-and-Privacy).

## Model selection and validation

```typescript
const models = await aiForm.getAvailableModels(); // GET {baseUrl}/models or /api/tags
const ok = await aiForm.setSelectedModel('gemma3:12b');
```

`setSelectedModel` validates the name against the model list by default: it only sets the model, and
only returns `true`, when the service actually offers it. When the list cannot be fetched, nothing
is set and it returns `false`.

Some services have no usable model list (Perplexity, most proxies that only forward
`/chat/completions`). Skip the check there:

```typescript
await aiForm.setSelectedModel('sonar-pro', { validate: false }); // always true
```

`aiForm.getSelectedModel()` returns the current name, and `aiForm.isProviderAvailable()` resolves to
`false` instead of throwing when the service cannot be reached.

## Timeouts and abort

Every request carries the provider's `timeout` (30 seconds by default). A timeout surfaces as a
`ProviderError`.

A caller's own `AbortSignal` is merged with it, and an abort you triggered is re-thrown untouched, so
cancellation is distinguishable from failure:

```typescript
const abort = new AbortController();
const result = await aiForm.fillForm(form, text, { signal: abort.signal });
```

The controller does this for you: `controller.cancel()` aborts the in-flight request and returns the
state to `idle`, and starting a new fill cancels the previous one.

## Writing a custom provider

Extend `AIProvider` and use `requestJson` so timeouts, aborts and error translation stay uniform.

```typescript
import { AIProvider, requestJson, type ChatRequest, type ChatResponse } from 'ai-form-fill';
import type { ProviderConfig, ProviderType } from 'ai-form-fill';

type MyResponse = { output: string; model: string };

export class MyProvider extends AIProvider {
  protected readonly providerName = 'my-service';
  protected readonly providerType: ProviderType = 'remote';
  protected override supportsStructured = true;

  constructor(config?: ProviderConfig) {
    super({ ...config, baseUrl: config?.baseUrl ?? 'https://api.my-service.com' });
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const data = await requestJson<MyResponse>(`${this.baseUrl}/generate`, {
      method: 'POST',
      body: {
        model: request.model,
        messages: request.messages,
        ...(request.format ? { schema: request.format } : {}),
      },
      timeout: this.timeout,
      signal: request.signal,
      provider: this.providerName,
      fetchImpl: this.fetchImpl,
    });
    return { content: data.output, model: data.model };
  }

  override async listModels(): Promise<string[]> {
    const data = await requestJson<{ models: string[] }>(`${this.baseUrl}/models`, {
      timeout: this.timeout,
      provider: this.providerName,
      fetchImpl: this.fetchImpl,
    });
    return data.models ?? [];
  }

  override async isAvailable(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }
}
```

Then pass the instance anywhere a provider name is accepted:

```typescript
const aiForm = new AIFormFill(new MyProvider());
const controller = createFormFill({ form: '#contact', provider: new MyProvider() });
document.querySelector('ai-form-fill').provider = new MyProvider();
```

Set `supportsStructured = true` only when the service really enforces a JSON schema, and translate
`ChatRequest.format` into its mechanism. When it is `false`, the library still asks for JSON in the
prompt and parses the answer, it just cannot guarantee the shape.
