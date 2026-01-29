/**
 * FR-11: Local Provider Support
 * 
 * Requirement: The library shall support local AI providers that run on the user's 
 * machine without requiring external network requests.
 */

import { describe, it, expect } from 'vitest';
import { LocalOllamaProvider } from '../../lib/providers/localOllama';
import { OpenAIProvider } from '../../lib/providers/openai';
import { AIProvider, LocalAIProvider, RemoteAIProvider } from '../../lib/providers/aiProvider';

describe('FR-11: Local Provider Support', () => {
  
  // AC-1: At least one local provider implementation exists (e.g., Ollama-based backend).
  it('AC-1: Local provider implementation exists', () => {
    const localProvider = new LocalOllamaProvider();
    
    expect(localProvider).toBeInstanceOf(AIProvider);
    expect(localProvider.getName()).toBe('ollama');
  });

});
