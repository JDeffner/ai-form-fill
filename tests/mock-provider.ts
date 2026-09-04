/**
 * Mock AI Provider for testing purposes
 * Returns predictable responses without network calls
 */

import { AIProvider, type ProviderConfig, type ProviderType } from '../lib/providers/provider';
import type { ChatRequest, ChatResponse } from '../lib/core/types';

export class MockAIProvider extends AIProvider {
  protected providerName = 'mock';
  protected providerType: ProviderType = 'local';
  protected override supportsStructured = true;

  private mockResponse: string;
  /** The last request passed to chat(), for prompt/schema assertions. */
  lastRequest?: ChatRequest;

  constructor(mockResponse: string = '{}', config?: Partial<ProviderConfig>) {
    super({
      baseUrl: 'http://mock.local',
      model: 'mock-model',
      ...config,
    });
    this.mockResponse = mockResponse;
  }

  /**
   * Set the mock response to return from chat()
   */
  setMockResponse(response: string): void {
    this.mockResponse = response;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.lastRequest = request;
    return {
      content: this.mockResponse,
      model: 'mock-model',
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return ['mock-model'];
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
