import { defineMock } from 'vite-plugin-mock-dev-server'
import OpenAI from 'openai';

export default defineMock([
  {
    url: '/api/perplexity/chat',
    method: ['POST'],
    async body(request) {
      const requestBody = request.body;

      const endpointObject = new OpenAI({
      apiKey: import.meta.env.VITE_PERPLEXITY_KEY, // Keep your API key secure!
      baseURL: 'https://api.perplexity.ai',
      });

      return await endpointObject.chat.completions.create({
        model: requestBody.model,
        messages: requestBody.messages,
        max_tokens: requestBody.maxTokens
      })
      
    },
    headers: {
      'Content-Type': 'application/json',
      
    },
  },
  // Comment out to simulate unavailable provider
  {
    url: '/api/perplexity/available',
    method: ['GET', 'POST'],
    body: {
    }
  },
  {
    url: '/api/perplexity/models',
    method: ['POST'],
    body: {
      models: ['sonar']
    }
  }
])