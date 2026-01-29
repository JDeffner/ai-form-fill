import { defineMock } from 'vite-plugin-mock-dev-server'
import OpenAI from 'openai';

export default defineMock([
  {
    url: '/api/openai/chat',
    method: ['POST'],
    async body(request) {
      const requestBody = request.body;

      const endpointObject = new OpenAI({
      apiKey: import.meta.env.VITE_OPEN_AI_KEY, // Keep your API key secure!
      });
      return await endpointObject.chat.completions.create({
        model: requestBody.model,
        messages: requestBody.messages,
        max_tokens: requestBody.maxTokens,
        response_format: { type: "json_schema", json_schema: {
          name: "form_schema",
          schema: requestBody.format
        }},
      })
      
    },
    headers: {
      'Content-Type': 'application/json',
    },
  },
  // Comment out to simulate unavailable provider
  {
    url: '/api/openai/available',
    method: ['GET', 'POST'],
  },
  {
    url: '/api/openai/models',
    method: ['POST'],
    body: {
      models: ['gpt-5-nano']
    }
  }
])