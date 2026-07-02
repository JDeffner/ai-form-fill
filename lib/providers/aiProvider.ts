import type { ChatRequest, ChatResponse } from '../core/types';
import { affConfig } from '../core/config';

/**
 * User-facing configuration options accepted by every provider.
 */
export interface ProviderConfig {
  /** Base URL the provider talks to (a local runtime, or your backend proxy). */
  apiEndpoint?: string;
  /** Model identifier to use for requests. */
  model?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
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
 *   to and from the service's own format,
 * - reporting which models it offers and whether it is reachable.
 */
export abstract class AIProvider {
  /** Stable, lowercase identifier for the provider (e.g. `ollama`). */
  protected abstract readonly providerName: string;
  /** Whether the provider runs locally or remotely. */
  protected abstract readonly providerType: ProviderType;
  /** Whether the provider can enforce a JSON schema on its output. */
  protected supportsStructured: boolean = false;

  protected selectedModel: string;
  protected apiEndpoint: string;
  protected timeout: number;

  constructor(config?: ProviderConfig) {
    this.apiEndpoint = config?.apiEndpoint || '';
    this.selectedModel = config?.model || '';
    this.timeout = config?.timeout || affConfig.timeout;
  }

  /**
   * Send a chat request and return the normalised response.
   * @param request - Messages, model and optional structured-output schema.
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /** List the model identifiers this provider currently offers. */
  abstract listModels(): Promise<string[]>;

  /** Resolve to `true` if the provider is reachable. */
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
   * Select a model, validating against {@link listModels} when possible.
   * Falls back to setting it unvalidated if the list cannot be fetched.
   * @returns `true` if the model was set.
   */
  async setSelectedModel(modelName: string): Promise<boolean> {
    if (!modelName) return false;
    try {
      const models = await this.listModels();
      if (models.includes(modelName)) {
        this.selectedModel = modelName;
        return true;
      }
      if (affConfig.debug) {
        console.warn(`Model "${modelName}" not found. Available: ${models.join(', ')}`);
      }
      return false;
    } catch (err) {
      if (affConfig.debug) console.warn('Could not validate model:', err);
      this.selectedModel = modelName;
      return true;
    }
  }

  /** Whether the provider supports structured (JSON schema) output. */
  supportsStructuredOutput(): boolean {
    return this.supportsStructured;
  }
}
