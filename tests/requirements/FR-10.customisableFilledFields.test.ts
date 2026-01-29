/**
 * FR-10: Customisable Filled Fields
 * 
 * Requirement: The library shall allow users to specify which form fields 
 * should be populated by the AI.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
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

describe('FR-10: Customisable Filled Fields', () => {
  
  // AC-1: Developers can provide a list of field names that should be filled by the AI.
  it('AC-1: Developers can specify which fields to fill', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    }));
    
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName">
      <input type="text" name="lastName">
      <input type="email" name="email">
    `;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider, {
      targetFields: ['firstName', 'email'],
    });
    await aiFormFill.parseAndFillForm(form, 'John Doe john@example.com');
    
    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('john@example.com');
  });

  // AC-2: Only the specified fields are modified; all other fields remain unchanged.
  it('AC-2: Only specified fields are modified', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({
      firstName: 'John',
    }));
    
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName" value="Original">
      <input type="text" name="lastName" value="Unchanged">
    `;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider, {
      targetFields: ['firstName'],
    });
    await aiFormFill.parseAndFillForm(form, 'John');
    
    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('Unchanged');
  });
});
