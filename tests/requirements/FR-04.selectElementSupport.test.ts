/**
 * FR-04: Select Element Support
 * 
 * Requirement: The library shall support AI-assisted filling of dropdown (select) elements 
 * by matching AI suggestions to available options.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { setFieldValue, getFillTargets } from '../../lib/utils/fieldUtils';

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

describe('FR-04: Select Element Support', () => {
  
  // AC-1: The AI receives information about available options for select fields.
  it('AC-1: Select fields are included in form analysis', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <select name="country">
        <option value="de">Germany</option>
        <option value="us">USA</option>
      </select>
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    expect(targets.length).toBe(1);
    expect(targets[0].type).toBe('select');
    expect(targets[0].name).toBe('country');
  });

  // AC-2: The library selects the option whose value or visible text matches the AI suggestion.
  it('AC-2: Selects option by value or text match', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `;
    
    setFieldValue(select, 'us');
    expect(select.value).toBe('us');
    
    setFieldValue(select, 'Germany');
    expect(select.value).toBe('de');
  });

  // AC-3: If no exact match exists, the library attempts a case-insensitive match.
  it('AC-3: Case-insensitive matching when no exact match', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `;
    
    setFieldValue(select, 'germany');
    expect(select.value).toBe('de');
    
    setFieldValue(select, 'UNITED STATES');
    expect(select.value).toBe('us');
  });
});
