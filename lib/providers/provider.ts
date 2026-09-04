import type { ChatRequest, ChatResponse } from '../core/types';
import { AFF_DEFAULTS } from '../core/defaults';

/**
 * User-facing configuration options accepted by every provider.
 */
export interface ProviderConfig {
  /** Base URL the provider talks to (a local runtime, an API, or your proxy). */
  baseUrl?: string;
  /** Model identifier to use for requests. */
  model?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Custom fetch implementation (testing, polyfills). */
  fetch?: typeof fetch;
}

/**
 * Whether a provider runs on the user's machine (`local`) or behind a remote
 * service (`remote`). Used purely as metadata, e.g. for UI grouping.
 */
export type ProviderType = 'local' | 'remote';

/**
 * Base class that every AI provider extends.
 *
 * A provider is responsible for:
 * - making the network call to its service,
 * - translating the common {@link ChatRequest} / {@link ChatResponse} shapes
 *   to and from the service's own wire format,
 * - reporting which models it offers and whether it is reachable.
 *
 * Network failures surface as {@link ProviderError}.
 */
export abstract class AIProvider {
  /** Stable, lowercase identifier for the provider (e.g. `ollama`). */
  protected abstract readonly providerName: string;
  /** Whether the provider runs locally or remotely. */
  protected abstract readonly providerType: ProviderType;
  /** Whether the provider can enforce a JSON schema on its output. */
  protected supportsStructured: boolean = false;

  protected selectedModel: string;
  protected baseUrl: string;
  protected timeout: number;
  protected fetchImpl?: typeof fetch;

  constructor(config?: ProviderConfig) {
    // Trailing slashes would break endpoint concatenation.
    this.baseUrl = (config?.baseUrl ?? '').replace(/\/+$/, '');
    this.selectedModel = config?.model ?? '';
    this.timeout = config?.timeout ?? AFF_DEFAULTS.timeout;
    this.fetchImpl = config?.fetch;
  }

  /**
   * Send a chat request and return the normalised response.
   * @param request - Messages, model, optional schema and abort signal.
   * @throws ProviderError on network/HTTP/timeout failures.
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * List the model identifiers this provider currently offers.
   * @throws ProviderError when the list cannot be fetched.
   */
  abstract listModels(): Promise<string[]>;

  /** Resolve to `true` if the provider is reachable. Never throws. */
  abstract isAvailable(): Promise<boolean>;

  /** The provider's identifier (e.g. `ollama`, `openrouter`). */
  getName(): string {
    return this.providerName;
  }

  /** Whether the provider is `local` or `remote`. */
  getType(): ProviderType {
    return this.providerType;
  }

  /** The model currently selected for requests. */
  getSelectedModel(): string {
    return this.selectedModel;
  }

  /**
   * Select a model.
   *
   * By default the name is validated against {@link listModels}: the model is
   * only set — and `true` returned — when it is actually offered. When the
   * model list cannot be fetched, nothing is set and `false` is returned.
   *
   * Pass `{ validate: false }` to set the model unvalidated (always `true`),
   * e.g. for providers whose model list endpoint is unavailable.
   */
  async setSelectedModel(modelName: string, options?: { validate?: boolean }): Promise<boolean> {
    if (!modelName) return false;
    if (options?.validate === false) {
      this.selectedModel = modelName;
      return true;
    }
    let models: string[];
    try {
      models = await this.listModels();
    } catch {
      return false;
    }
    if (!models.includes(modelName)) return false;
    this.selectedModel = modelName;
    return true;
  }

  /** Whether the provider supports structured (JSON schema) output. */
  supportsStructuredOutput(): boolean {
    return this.supportsStructured;
  }
}
