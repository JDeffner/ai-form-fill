/**
 * FR-02: Form Field Detection
 * 
 * Requirement: The library shall automatically detect and analyse form fields within a 
 * given HTML form element and extract relevant metadata for each supported field.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { analyzeField, getFillTargets } from '../../lib/utils/fieldUtils';

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

describe('FR-02: Form Field Detection', () => {
  
  // AC-1: The library detects at least input, textarea and select elements.
  it('AC-1: Detects input, textarea and select elements', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="name">
      <textarea name="bio"></textarea>
      <select name="country"><option value="de">Germany</option></select>
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    expect(targets.length).toBe(3);
    expect(targets.some(t => t.type === 'text')).toBe(true);
    expect(targets.some(t => t.type === 'textarea')).toBe(true);
    expect(targets.some(t => t.type === 'select')).toBe(true);
  });

  // AC-2: For each field, the library extracts: type, name, label text and placeholder.
  it('AC-2: Extracts type, name, label and placeholder', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'emailField');
    label.textContent = 'Email Address';
    document.body.appendChild(label);
    
    const input = document.createElement('input');
    input.id = 'emailField';
    input.type = 'email';
    input.name = 'email';
    input.placeholder = 'Enter email';
    document.body.appendChild(input);
    
    const result = analyzeField(input);
    
    expect(result.type).toBe('email');
    expect(result.name).toBe('email');
    expect(result.label).toBe('Email Address');
    expect(result.placeholder).toBe('Enter email');
  });

  // AC-3: Hidden fields and submit buttons are excluded from detection.
  it('AC-3: Excludes hidden fields and submit buttons', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="visible">
      <input type="hidden" name="token">
      <input type="submit" value="Submit">
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    expect(targets.length).toBe(1);
    expect(targets[0].name).toBe('visible');
  });
});
