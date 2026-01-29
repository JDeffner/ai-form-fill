/**
 * Mock AI Provider for testing purposes
 * Returns predictable responses without network calls
 */

import { AIProvider, type ProviderConfig, type ProviderType } from '../lib/providers/aiProvider';
import type { ChatRequest, ChatResponse } from '../lib/core/types';

export class MockAIProvider extends AIProvider {
  protected providerName = 'mock';
  protected providerType: ProviderType = 'local';

  private mockResponse: string;

  constructor(mockResponse: string = '{}', config?: Partial<ProviderConfig>) {
    super({
      apiEndpoint: 'http://mock.local',
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

  async chat(_params: ChatRequest): Promise<ChatResponse> {
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

  getName(): string {
    return this.providerName;
  }

  getType(): ProviderType {
    return this.providerType;
  }
}
