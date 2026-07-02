/**
 * FR-09: Structured Outputs
 *
 * Requirement: The library shall support structured outputs from AI providers
 * to enhance reliability and parsing accuracy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SYSTEM_PROMPTS } from '../../lib/prompt/build';
import { parseModelResponse, isValidJson } from '../../lib/prompt/parse-response';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('FR-09: Structured Outputs', () => {
  // AC-1: The library includes prompt templates that request JSON-formatted responses.
  it('AC-1: Prompt templates request JSON-formatted responses', () => {
    expect(SYSTEM_PROMPTS.EXTRACT).toBeDefined();
    expect(SYSTEM_PROMPTS.EXTRACT.toLowerCase()).toContain('json');
  });

  // AC-2: AI responses are validated against the expected JSON structure before being applied.
  it('AC-2: AI responses are validated before being applied', () => {
    const validJson = '{"name": "John"}';
    const invalidJson = 'not json';

    expect(isValidJson(validJson)).toBe(true);
    expect(isValidJson(invalidJson)).toBe(false);

    // Invalid JSON returns empty object, not applied to form
    expect(parseModelResponse(invalidJson)).toEqual({});
  });
});
