/**
 * FR-06: JSON Response Parsing
 * 
 * Requirement: The library shall parse AI responses as JSON and map the extracted 
 * key-value pairs to form fields.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseJsonResponse } from '../../lib/utils/jsonParser';
import { AIFormFill } from '../../lib/core/aiFormFill';
import { MockAIProvider } from '../mockProvider';

let document: Document;
let window: Window & typeof globalThis;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  window = dom.window as unknown as Window & typeof globalThis;
  global.document = document;
  global.Event = window.Event;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLSelectElement = window.HTMLSelectElement;
  global.HTMLFormElement = window.HTMLFormElement;
});

describe('FR-06: JSON Response Parsing', () => {
  
  // AC-1: Valid JSON responses are parsed correctly without loss of information.
  it('AC-1: Valid JSON is parsed correctly', () => {
    const json = '{"firstName": "John", "lastName": "Doe"}';
    const result = parseJsonResponse(json);
    
    expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
  });

  // AC-2: Parse errors do not crash the application; an empty or error result is returned.
  it('AC-2: Parse errors return empty object without crashing', () => {
    expect(() => parseJsonResponse('{ invalid }')).not.toThrow();
    expect(parseJsonResponse('{ invalid }')).toEqual({});
    expect(parseJsonResponse('')).toEqual({});
  });

  // AC-3: Each key in the JSON maps to the correct form field by name.
  it('AC-3: JSON keys map to form fields by name', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
    }));
    
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName">
      <input type="text" name="lastName">
    `;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.parseAndFillForm(form, 'John Doe');
    
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
    await aiFormFill.parseAndFillForm(form, 'John');
    
    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('Unchanged');
  });

  // AC-5: Extra keys in the JSON that do not correspond to any form field are ignored.
  it('AC-5: Extra JSON keys are ignored', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({
      name: 'John',
      extraField: 'Ignored',
    }));
    
    const form = document.createElement('form');
    form.innerHTML = `<input type="text" name="name">`;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.parseAndFillForm(form, 'John');
    
    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('John');
    expect(form.querySelector('[name="extraField"]')).toBeNull();
  });
});
