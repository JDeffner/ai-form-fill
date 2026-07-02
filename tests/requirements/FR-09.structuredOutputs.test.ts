/**
 * FR-09: Structured Outputs
 *
 * Requirement: The library shall support structured outputs from AI providers
 * to enhance reliability and parsing accuracy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SYSTEM_PROMPTS, buildFormSchema } from '../../lib/prompt/build';
import { parseModelResponse, isValidJson } from '../../lib/prompt/parse-response';
import { ResponseParseError } from '../../lib/core/errors';
import { getFormFields } from '../../lib/form/analyze';

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

    // Invalid JSON raises a typed error and is never applied to the form.
    expect(() => parseModelResponse(invalidJson)).toThrow(ResponseParseError);
  });

  // AC-3: A JSON schema is generated from the form, with exact option values as enums.
  it('AC-3: Generated schema constrains option fields via enums', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <select name="gender">
        <option value="">Select</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
      <input type="checkbox" name="interests" value="tech">
      <input type="checkbox" name="interests" value="music">
    `;
    document.body.appendChild(form);

    const schema = buildFormSchema(getFormFields(form));
    const properties = schema.properties as Record<string, Record<string, unknown>>;

    expect(properties.gender).toEqual({ type: 'string', enum: ['male', 'female'] });
    expect(properties.interests).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['tech', 'music'] },
    });
    expect(schema.additionalProperties).toBe(false);
  });
});
