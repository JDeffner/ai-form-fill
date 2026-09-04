import { describe, it, expect, vi } from 'vitest';
import { OpenAICompatibleProvider } from '../../lib/providers/openai-compatible';
import { OllamaProvider } from '../../lib/providers/ollama';
import { AFFError, ProviderError } from '../../lib/core/errors';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const chatCompletion = {
  id: 'chatcmpl-1',
  object: 'chat.completion',
  created: 0,
  model: 'gpt-test',
  choices: [
    { index: 0, message: { role: 'assistant', content: '{"a":1}' }, finish_reason: 'stop' },
  ],
};

describe('OpenAICompatibleProvider wire format', () => {
  it('POSTs the standard chat-completions request with schema wrapping', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(chatCompletion));
    const provider = new OpenAICompatibleProvider('openai', {
      baseUrl: 'https://proxy.example/v1',
      fetch: fetchSpy as unknown as typeof fetch,
    });

    const response = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-test',
      maxTokens: 128,
      format: { type: 'object', properties: {} },
    });

    expect(response.content).toBe('{"a":1}');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://proxy.example/v1/chat/completions');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 128,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'form_fields', schema: { type: 'object', properties: {} } },
      },
    });
  });

  it('sends the API key as a Bearer token when allowed', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(chatCompletion));
    const provider = new OpenAICompatibleProvider('openai', {
      apiKey: 'sk-test',
      allowApiKeyInBrowser: true,
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await provider.chat({ messages: [{ role: 'user', content: 'x' }], model: 'gpt-test' });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
  });

  it('refuses an API key in the browser without explicit opt-in', () => {
    // vitest runs in jsdom, so `window`/`document` exist like in a browser.
    expect(() => new OpenAICompatibleProvider('openai', { apiKey: 'sk-test' })).toThrow(AFFError);
  });

  it('uses preset baseUrls and requires baseUrl for unknown names', () => {
    const openai = new OpenAICompatibleProvider('openai');
    expect(openai.getName()).toBe('openai');

    expect(() => new OpenAICompatibleProvider('my-gateway')).toThrow(AFFError);
    const custom = new OpenAICompatibleProvider('my-gateway', {
      baseUrl: 'http://localhost:8080/v1',
      model: 'x',
    });
    expect(custom.getName()).toBe('my-gateway');
  });

  it('lists models via GET /models parsing data[].id', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ object: 'list', data: [{ id: 'model-a' }, { id: 'model-b' }] }),
      );
    const provider = new OpenAICompatibleProvider('openai', {
      baseUrl: 'https://proxy.example/v1',
      fetch: fetchSpy as unknown as typeof fetch,
    });

    const models = await provider.listModels();

    expect(models).toEqual(['model-a', 'model-b']);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://proxy.example/v1/models');
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('isAvailable reflects the models call outcome', async () => {
    const up = new OpenAICompatibleProvider('openai', {
      fetch: vi
        .fn()
        .mockResolvedValue(jsonResponse({ object: 'list', data: [] })) as unknown as typeof fetch,
    });
    const down = new OpenAICompatibleProvider('openai', {
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch,
    });

    expect(await up.isAvailable()).toBe(true);
    expect(await down.isAvailable()).toBe(false);
  });

  it('translates HTTP errors into ProviderError with status', async () => {
    const provider = new OpenAICompatibleProvider('openai', {
      fetch: vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'nope' }, 401)) as unknown as typeof fetch,
    });

    const error = await provider
      .chat({ messages: [{ role: 'user', content: 'x' }], model: 'm' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).status).toBe(401);
    expect((error as ProviderError).provider).toBe('openai');
  });

  it('translates network failures into ProviderError', async () => {
    const provider = new OpenAICompatibleProvider('openai', {
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch,
    });

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'x' }], model: 'm' }),
    ).rejects.toThrow(ProviderError);
  });

  it('setSelectedModel returns false when the model list cannot be fetched (B8)', async () => {
    const provider = new OpenAICompatibleProvider('openai', {
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch,
    });

    const before = provider.getSelectedModel();
    const result = await provider.setSelectedModel('some-model');

    expect(result).toBe(false);
    expect(provider.getSelectedModel()).toBe(before);
  });

  it('setSelectedModel with validate:false sets the model unvalidated', async () => {
    const provider = new OpenAICompatibleProvider('openai', {
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch,
    });

    const result = await provider.setSelectedModel('offline-model', { validate: false });

    expect(result).toBe(true);
    expect(provider.getSelectedModel()).toBe('offline-model');
  });

  it('propagates caller-initiated aborts untranslated', async () => {
    const fetchSpy = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const provider = new OpenAICompatibleProvider('openai', {
      fetch: fetchSpy as unknown as typeof fetch,
    });
    const controller = new AbortController();

    const pending = provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      model: 'm',
      signal: controller.signal,
    });
    controller.abort();

    const error = await pending.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
  });
});

describe('OllamaProvider wire format', () => {
  it('POSTs to /api/chat with the schema in the top-level format field', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        model: 'gemma3:4b',
        message: { role: 'assistant', content: '{}' },
        done: true,
      }),
    );
    const provider = new OllamaProvider({ fetch: fetchSpy as unknown as typeof fetch });

    const response = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gemma3:4b',
      format: { type: 'object' },
    });

    expect(response.finishReason).toBe('stop');
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: 'gemma3:4b',
      stream: false,
      format: { type: 'object' },
    });
  });

  it('lists models from /api/tags', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ models: [{ name: 'gemma3:4b' }, { name: 'mistral' }] }));
    const provider = new OllamaProvider({ fetch: fetchSpy as unknown as typeof fetch });

    expect(await provider.listModels()).toEqual(['gemma3:4b', 'mistral']);
    expect((fetchSpy.mock.calls[0] as [string, RequestInit])[0]).toBe(
      'http://localhost:11434/api/tags',
    );
  });

  it('throws ProviderError when Ollama is unreachable', async () => {
    const provider = new OllamaProvider({
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch,
    });

    await expect(provider.listModels()).rejects.toThrow(ProviderError);
    expect(await provider.isAvailable()).toBe(false);
  });
});
