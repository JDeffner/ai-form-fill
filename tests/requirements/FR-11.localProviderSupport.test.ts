/**
 * FR-11: Local Provider Support
 *
 * Requirement: The library shall support local AI providers that run on the user's
 * machine without requiring external network requests.
 */

import { describe, it, expect } from 'vitest';
import { OllamaProvider } from '../../lib/providers/ollama';
import { AIProvider } from '../../lib/providers/provider';

describe('FR-11: Local Provider Support', () => {
  // AC-1: At least one local provider implementation exists (e.g., Ollama-based).
  it('AC-1: Local provider implementation exists', () => {
    const localProvider = new OllamaProvider();

    expect(localProvider).toBeInstanceOf(AIProvider);
    expect(localProvider.getName()).toBe('ollama');
    expect(localProvider.getType()).toBe('local');
  });
});
