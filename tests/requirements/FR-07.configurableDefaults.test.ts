/**
 * FR-07: Configurable Defaults
 *
 * Requirement: The library shall provide sensible default configuration values for
 * the AI providers while allowing users to override them.
 */

import { describe, it, expect } from 'vitest';
import { affConfig } from '../../lib/core/defaults';
import { OllamaProvider } from '../../lib/providers/ollama';

describe('FR-07: Configurable Defaults', () => {
  // AC-1: Default values exist for provider endpoints, model identifiers and timeouts.
  it('AC-1: Default values exist for endpoints, models and timeouts', () => {
    expect(affConfig.ollama.apiEndpoint).toBeDefined();
    expect(affConfig.ollama.model).toBeDefined();
    expect(affConfig.apiBase).toBeDefined();
    expect(affConfig.openai.model).toBeDefined();
    expect(affConfig.timeout).toBeDefined();
  });

  // AC-2: Users can override default values through initialization parameters.
  it('AC-2: Users can override defaults through config objects', () => {
    const customProvider = new OllamaProvider({
      apiEndpoint: 'http://custom:8080',
      model: 'custom-model',
      timeout: 60000,
    });

    expect(customProvider.getSelectedModel()).toBe('custom-model');
  });

  // AC-3: The library functions with minimal configuration.
  it('AC-3: Library functions with minimal configuration', () => {
    const defaultProvider = new OllamaProvider();

    expect(defaultProvider.getSelectedModel()).toBe(affConfig.ollama.model);
  });
});
