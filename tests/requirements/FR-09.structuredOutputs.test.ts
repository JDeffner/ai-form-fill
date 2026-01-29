/**
 * FR-09: Structured Outputs
 * 
 * Requirement: The library shall support structured outputs from AI providers 
 * to enhance reliability and parsing accuracy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { SYSTEM_PROMPTS, generateFormSchema } from '../../lib/utils/prompts';
import { getFillTargets } from '../../lib/utils/fieldUtils';
import { parseJsonResponse, isValidJson } from '../../lib/utils/jsonParser';

let document: Document;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  const window = dom.window as unknown as Window & typeof globalThis;
  global.document = document;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLSelectElement = window.HTMLSelectElement;
  global.HTMLFormElement = window.HTMLFormElement;
});

describe('FR-09: Structured Outputs', () => {
  
  // AC-1: The library includes prompt templates that request JSON-formatted responses.
  it('AC-1: Prompt templates request JSON-formatted responses', () => {
    expect(SYSTEM_PROMPTS.PARSE_EXTRACT).toBeDefined();
    expect(SYSTEM_PROMPTS.PARSE_EXTRACT.toLowerCase()).toContain('json');
  });

  // AC-2: AI responses are validated against the expected JSON structure before being applied.
  it('AC-2: AI responses are validated before being applied', () => {
    const validJson = '{"name": "John"}';
    const invalidJson = 'not json';
    
    expect(isValidJson(validJson)).toBe(true);
    expect(isValidJson(invalidJson)).toBe(false);
    
    // Invalid JSON returns empty object, not applied to form
    expect(parseJsonResponse(invalidJson)).toEqual({});
  });
});
