import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { AIFormFill } from '../../lib/core/aiFormFill';
import { MockAIProvider } from '../mockProvider';

// Setup jsdom for each test
let document: Document;
let window: Window & typeof globalThis;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  window = dom.window as unknown as Window & typeof globalThis;
  
  // Set up globals that the library code depends on
  global.document = document;
  global.Event = window.Event;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLSelectElement = window.HTMLSelectElement;
  global.HTMLFormElement = window.HTMLFormElement;
});

describe('AIFormFill', () => {
  describe('constructor', () => {
    it('accepts a custom AIProvider instance', () => {
      const mockProvider = new MockAIProvider();
      
      const aiFormFill = new AIFormFill(mockProvider);
      
      expect(aiFormFill).toBeDefined();
    });
  });

  describe('parseAndFillForm', () => {
    it('fills text fields from mock AI response', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        })
      );
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="firstName">
        <input type="text" name="lastName">
        <input type="email" name="email">
      `;
      document.body.appendChild(form);
      
      const aiFormFill = new AIFormFill(mockProvider);
      await aiFormFill.parseAndFillForm(form, 'John Doe, email: john@example.com');
      
      const firstName = form.querySelector<HTMLInputElement>('[name="firstName"]');
      const lastName = form.querySelector<HTMLInputElement>('[name="lastName"]');
      const email = form.querySelector<HTMLInputElement>('[name="email"]');
      
      expect(firstName?.value).toBe('John');
      expect(lastName?.value).toBe('Doe');
      expect(email?.value).toBe('john@example.com');
    });

    it('fills checkbox fields from mock AI response', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          newsletter: 'true',
          terms: 'false',
        })
      );
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="checkbox" name="newsletter">
        <input type="checkbox" name="terms" checked>
      `;
      document.body.appendChild(form);
      
      const aiFormFill = new AIFormFill(mockProvider);
      await aiFormFill.parseAndFillForm(form, 'Subscribe to newsletter');
      
      const newsletter = form.querySelector<HTMLInputElement>('[name="newsletter"]');
      const terms = form.querySelector<HTMLInputElement>('[name="terms"]');
      
      expect(newsletter?.checked).toBe(true);
      expect(terms?.checked).toBe(false);
    });

    it('fills select fields from mock AI response', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          country: 'Germany',
        })
      );
      
      const form = document.createElement('form');
      form.innerHTML = `
        <select name="country">
          <option value="">Select...</option>
          <option value="de">Germany</option>
          <option value="us">USA</option>
        </select>
      `;
      document.body.appendChild(form);
      
      const aiFormFill = new AIFormFill(mockProvider);
      await aiFormFill.parseAndFillForm(form, 'I live in Germany');
      
      const country = form.querySelector<HTMLSelectElement>('[name="country"]');
      
      expect(country?.value).toBe('de');
    });

    it('only fills specified fields when targetFields option is set', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
        })
      );
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="firstName">
        <input type="text" name="lastName">
      `;
      document.body.appendChild(form);
      
      const aiFormFill = new AIFormFill(mockProvider, {
        targetFields: ['firstName'],
      });
      await aiFormFill.parseAndFillForm(form, 'John Doe');
      
      const firstName = form.querySelector<HTMLInputElement>('[name="firstName"]');
      const lastName = form.querySelector<HTMLInputElement>('[name="lastName"]');
      
      expect(firstName?.value).toBe('John');
      // lastName should not be filled because it's not in targetFields
      // The mock returns it, but the filter should exclude it from the prompt
      expect(lastName?.value).toBe('');
    });

    it('ignores extra keys in AI response that do not match form fields', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          name: 'John',
          extraField: 'should be ignored',
          anotherExtra: '12345',
        })
      );
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="name">
      `;
      document.body.appendChild(form);
      
      const aiFormFill = new AIFormFill(mockProvider);
      // This should not throw
      await aiFormFill.parseAndFillForm(form, 'John');
      
      const name = form.querySelector<HTMLInputElement>('[name="name"]');
      expect(name?.value).toBe('John');
    });

    it('handles malformed AI response gracefully', async () => {
      const mockProvider = new MockAIProvider('not valid json');
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="name" value="original">
      `;
      document.body.appendChild(form);
      
      const aiFormFill = new AIFormFill(mockProvider);
      
      // Should not throw
      await aiFormFill.parseAndFillForm(form, 'test');
      
      const name = form.querySelector<HTMLInputElement>('[name="name"]');
      // Original value should remain unchanged after error
      expect(name?.value).toBe('original');
    });
  });
});
