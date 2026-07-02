/**
 * FR-07: Configurable Defaults
 *
 * Requirement: The library shall provide sensible default configuration values for
 * the AI providers while allowing users to override them.
 */

import { describe, it, expect } from 'vitest';
import { AFF_DEFAULTS } from '../../lib/core/defaults';
import { OllamaProvider } from '../../lib/providers/ollama';

describe('FR-07: Configurable Defaults', () => {
  // AC-1: Default values exist for provider endpoints, model identifiers and timeouts.
  it('AC-1: Default values exist for endpoints, models and timeouts', () => {
    expect(AFF_DEFAULTS.ollama.baseUrl).toBeDefined();
    expect(AFF_DEFAULTS.ollama.model).toBeDefined();
    expect(AFF_DEFAULTS.openai.baseUrl).toBeDefined();
    expect(AFF_DEFAULTS.openai.model).toBeDefined();
    expect(AFF_DEFAULTS.perplexity.baseUrl).toBeDefined();
    expect(AFF_DEFAULTS.openrouter.baseUrl).toBeDefined();
    expect(AFF_DEFAULTS.timeout).toBeGreaterThan(0);
  });

  // AC-2: Users can override default values through initialization parameters.
  it('AC-2: Users can override defaults through config objects', () => {
    const customProvider = new OllamaProvider({
      baseUrl: 'http://custom:8080',
      model: 'custom-model',
      timeout: 60000,
    });

    expect(customProvider.getSelectedModel()).toBe('custom-model');
  });

  // AC-3: The library functions with minimal configuration.
  it('AC-3: Library functions with minimal configuration', () => {
    const defaultProvider = new OllamaProvider();

    expect(defaultProvider.getSelectedModel()).toBe(AFF_DEFAULTS.ollama.model);
  });

  // The defaults are frozen: configuration is per-instance, never global.
  it('AC-4: Defaults are immutable (no global mutable config)', () => {
    expect(Object.isFrozen(AFF_DEFAULTS)).toBe(true);
    expect(Object.isFrozen(AFF_DEFAULTS.ollama)).toBe(true);
    expect(() => {
      (AFF_DEFAULTS as { timeout: number }).timeout = 1;
    }).toThrow(TypeError);
    expect(AFF_DEFAULTS.timeout).toBe(30000);
  });
});
