/**
 * Typed errors thrown by the library. Catch {@link AFFError} to handle all of
 * them, or the subclasses to react to specific failure modes.
 */

/** Base class for all errors thrown by ai-form-fill. */
export class AFFError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AFFError';
  }
}

/**
 * A provider request failed: network error, HTTP error status or timeout.
 * Carries the provider name and, for HTTP errors, the status code.
 */
export class ProviderError extends AFFError {
  /** Name of the provider that failed (e.g. `ollama`, `openai`). */
  readonly provider: string;
  /** HTTP status code, when the failure was an HTTP error response. */
  readonly status?: number;

  constructor(message: string, options: { provider: string; status?: number; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = 'ProviderError';
    this.provider = options.provider;
    this.status = options.status;
  }
}

/**
 * The model's response could not be interpreted (not valid JSON, or not a JSON
 * object). Carries the raw model output for debugging.
 */
export class ResponseParseError extends AFFError {
  /** The unmodified model output that failed to parse. */
  readonly raw: string;

  constructor(message: string, options: { raw: string; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = 'ResponseParseError';
    this.raw = options.raw;
  }
}
