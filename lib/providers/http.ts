/**
 * Shared HTTP helper for providers: JSON requests with a timeout, optional
 * caller-supplied AbortSignal and uniform ProviderError translation.
 */

import { ProviderError } from '../core/errors';

export interface RequestJsonOptions {
  method?: 'GET' | 'POST';
  /** JSON-serialisable request body; sets Content-Type automatically. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Timeout in milliseconds. */
  timeout: number;
  /** External abort signal, merged with the internal timeout controller. */
  signal?: AbortSignal;
  /** Provider name used in error messages. */
  provider: string;
  /** Custom fetch implementation (testing, polyfills). */
  fetchImpl?: typeof fetch;
}

/**
 * Perform an HTTP request and parse the JSON response.
 *
 * Failures are translated into {@link ProviderError}: HTTP error status
 * (carries `status`), timeout, network failure and invalid JSON. An abort
 * triggered by the caller's own `signal` is re-thrown untranslated so callers
 * can distinguish cancellation from provider failure.
 */
export async function requestJson<T>(url: string, options: RequestJsonOptions): Promise<T> {
  const { method = 'GET', body, headers, timeout, signal, provider, fetchImpl } = options;
  const doFetch = fetchImpl ?? fetch;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const onExternalAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw (signal.reason ?? new DOMException('Aborted', 'AbortError')) as Error;
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await doFetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ProviderError(
        `${provider}: HTTP ${response.status} ${response.statusText} from ${url}`,
        { provider, status: response.status },
      );
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new ProviderError(`${provider}: invalid JSON in response from ${url}`, {
        provider,
        cause: error,
      });
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    // Abort rejections are DOMExceptions, which are not `instanceof Error`
    // in every runtime — detect them by name.
    const errorName =
      typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
    if (errorName === 'AbortError') {
      // Caller-initiated aborts propagate untouched; only the internal
      // timeout is translated.
      if (signal?.aborted) throw error;
      throw new ProviderError(`${provider}: request timed out after ${timeout}ms`, {
        provider,
        cause: error,
      });
    }
    throw new ProviderError(`${provider}: failed to connect to ${url}`, {
      provider,
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
