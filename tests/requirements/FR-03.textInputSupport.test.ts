/**
 * FR-03: Text Input Support
 * 
 * Requirement: The library shall support AI-assisted filling of text-based input fields, 
 * including text, email, number and textarea elements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { AIFormFill } from '../../lib/core/aiFormFill';
import { MockAIProvider } from '../mockProvider';
import { setFieldValue } from '../../lib/utils/fieldUtils';

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

describe('FR-03: Text Input Support', () => {
  
  // AC-1: Text, email, number and textarea fields are correctly populated with AI-generated string values.
  it('AC-1: Populates text, email, number and textarea fields', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({
      name: 'John',
      email: 'john@example.com',
      age: '25',
      bio: 'Developer',
    }));
    
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="name">
      <input type="email" name="email">
      <input type="number" name="age">
      <textarea name="bio"></textarea>
    `;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.parseAndFillForm(form, 'John, john@example.com, 25, Developer');
    
    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('john@example.com');
    expect(form.querySelector<HTMLInputElement>('[name="age"]')?.value).toBe('25');
    expect(form.querySelector<HTMLTextAreaElement>('[name="bio"]')?.value).toBe('Developer');
  });

  // AC-2: Number fields receive numeric values (as strings that can be parsed).
  it('AC-2: Number fields receive parseable numeric strings', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({ quantity: '42' }));
    
    const form = document.createElement('form');
    form.innerHTML = `<input type="number" name="quantity">`;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.parseAndFillForm(form, '42');
    
    const input = form.querySelector<HTMLInputElement>('[name="quantity"]');
    expect(parseInt(input?.value || '', 10)).toBe(42);
  });

  // AC-3: The value property of each element is set correctly.
  it('AC-3: Value property is set correctly', () => {
    const input = document.createElement('input');
    input.type = 'text';
    
    setFieldValue(input, 'Test Value');
    
    expect(input.value).toBe('Test Value');
  });

  // AC-4: Existing values are overwritten by AI suggestions.
  it('AC-4: Existing values are overwritten', async () => {
    const mockProvider = new MockAIProvider(JSON.stringify({ name: 'New Name' }));
    
    const form = document.createElement('form');
    form.innerHTML = `<input type="text" name="name" value="Old Name">`;
    document.body.appendChild(form);
    
    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.parseAndFillForm(form, 'New Name');
    
    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('New Name');
  });
});
