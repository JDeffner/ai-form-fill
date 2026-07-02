/**
 * FR-06: JSON Response Parsing
 *
 * Requirement: The library shall parse AI responses as JSON and map the extracted
 * key-value pairs to form fields.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseModelResponse } from '../../lib/prompt/parse-response';
import { ResponseParseError } from '../../lib/core/errors';
import { AIFormFill } from '../../lib/core/ai-form-fill';
import { MockAIProvider } from '../mock-provider';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('FR-06: JSON Response Parsing', () => {
  // AC-1: Valid JSON responses are parsed correctly without loss of information.
  it('AC-1: Valid JSON is parsed correctly', () => {
    const json = '{"firstName": "John", "lastName": "Doe"}';
    const result = parseModelResponse(json);

    expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
  });

  // AC-2: Parse errors do not crash the application; an empty or error result is returned.
  it('AC-2: Parse errors yield a typed error result instead of crashing', async () => {
    // Parsing surfaces a typed, catchable error carrying the raw output...
    expect(() => parseModelResponse('{ invalid }')).toThrow(ResponseParseError);
    expect(() => parseModelResponse('')).toThrow(ResponseParseError);

    // ...and fillForm rejects with it instead of failing silently.
    const mockProvider = new MockAIProvider('{ invalid }');
    const form = document.createElement('form');
    form.innerHTML = `<input type="text" name="name" value="untouched">`;
    document.body.appendChild(form);

    const aiFormFill = new AIFormFill(mockProvider);
    await expect(aiFormFill.fillForm(form, 'x')).rejects.toThrow(ResponseParseError);
    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('untouched');
  });

  // AC-3: Each key in the JSON maps to the correct form field by name.
  it('AC-3: JSON keys map to form fields by name', async () => {
    const mockProvider = new MockAIProvider(
      JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
      }),
    );

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName">
      <input type="text" name="lastName">
    `;
    document.body.appendChild(form);

    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.fillForm(form, 'John Doe');

    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('Doe');
  });

  // AC-4: Only fields present in the JSON are modified; all other fields remain unchanged.
  it('AC-4: Only fields in JSON are modified', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({ firstName: 'John' }));

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName" value="Original">
      <input type="text" name="lastName" value="Unchanged">
    `;
    document.body.appendChild(form);

    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.fillForm(form, 'John');

    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('Unchanged');
  });

  // AC-5: Extra keys in the JSON that do not correspond to any form field are ignored.
  it('AC-5: Extra JSON keys are ignored', async () => {
    const mockProvider = new MockAIProvider(
      JSON.stringify({
        name: 'John',
        extraField: 'Ignored',
      }),
    );

    const form = document.createElement('form');
    form.innerHTML = `<input type="text" name="name">`;
    document.body.appendChild(form);

    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.fillForm(form, 'John');

    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('John');
    expect(form.querySelector('[name="extraField"]')).toBeNull();
  });
});
