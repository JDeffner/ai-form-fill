import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { analyzeField, getFillTargets, setFieldValue, getFieldIdentifier } from '../../lib/utils/fieldUtils';

// Setup jsdom for each test
let document: Document;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  const window = dom.window as unknown as Window & typeof globalThis;
  
  // Set up globals that the library code depends on
  global.document = document;
  global.Event = window.Event;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLSelectElement = window.HTMLSelectElement;
  global.HTMLFormElement = window.HTMLFormElement;
});

describe('analyzeField', () => {
  it('extracts type from input element', () => {
    const input = document.createElement('input');
    input.type = 'email';
    input.name = 'userEmail';
    
    const result = analyzeField(input);
    
    expect(result.type).toBe('email');
    expect(result.name).toBe('userEmail');
  });

  it('extracts placeholder from input', () => {
    const input = document.createElement('input');
    input.placeholder = 'Enter name';
    
    const result = analyzeField(input);
    
    expect(result.placeholder).toBe('Enter name');
  });

  it('identifies textarea elements', () => {
    const textarea = document.createElement('textarea');
    textarea.name = 'comments';
    
    const result = analyzeField(textarea);
    
    expect(result.type).toBe('textarea');
    expect(result.name).toBe('comments');
  });

  it('identifies select elements', () => {
    const select = document.createElement('select');
    select.name = 'country';
    
    const result = analyzeField(select);
    
    expect(result.type).toBe('select');
    expect(result.name).toBe('country');
  });

  it('finds label by for attribute', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'nameInput');
    label.textContent = 'Your Name';
    document.body.appendChild(label);
    
    const input = document.createElement('input');
    input.id = 'nameInput';
    document.body.appendChild(input);
    
    const result = analyzeField(input);
    
    expect(result.label).toBe('Your Name');
  });
});

describe('getFillTargets', () => {
  it('finds all input fields in a form', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="name">
      <input type="email" name="email">
      <textarea name="bio"></textarea>
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    expect(targets).toHaveLength(3);
  });

  it('excludes hidden and submit inputs', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="visible">
      <input type="hidden" name="secret">
      <input type="submit" value="Submit">
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe('visible');
  });

  it('includes select elements', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <select name="country">
        <option value="de">Germany</option>
        <option value="us">USA</option>
      </select>
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('select');
  });

  it('groups radio buttons by name', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="radio" name="gender" value="m">
      <input type="radio" name="gender" value="f">
      <input type="radio" name="gender" value="o">
    `;
    document.body.appendChild(form);
    
    const targets = getFillTargets(form);
    
    // Radio buttons with same name should be grouped into one FieldInfo
    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('radio');
    expect(targets[0].options).toHaveLength(3);
  });
});

describe('setFieldValue', () => {
  it('sets text input value', () => {
    const input = document.createElement('input');
    input.type = 'text';
    
    setFieldValue(input, 'Hello World');
    
    expect(input.value).toBe('Hello World');
  });

  it('sets textarea value', () => {
    const textarea = document.createElement('textarea');
    
    setFieldValue(textarea, 'Long text content');
    
    expect(textarea.value).toBe('Long text content');
  });

  it('sets checkbox to checked when value is "true"', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    
    setFieldValue(checkbox, 'true');
    
    expect(checkbox.checked).toBe(true);
  });

  it('sets checkbox to unchecked when value is "false"', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    
    setFieldValue(checkbox, 'false');
    
    expect(checkbox.checked).toBe(false);
  });

  it('selects correct option in select element', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="de">Germany</option>
      <option value="us">USA</option>
    `;
    
    setFieldValue(select, 'us');
    
    expect(select.value).toBe('us');
  });

  it('matches select option by text (case-insensitive)', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `;
    
    setFieldValue(select, 'united states');
    
    expect(select.value).toBe('us');
  });

  it('ignores empty values', () => {
    const input = document.createElement('input');
    input.value = 'original';
    
    setFieldValue(input, '');
    
    expect(input.value).toBe('original');
  });

  it('ignores "null" string values', () => {
    const input = document.createElement('input');
    input.value = 'original';
    
    setFieldValue(input, 'null');
    
    expect(input.value).toBe('original');
  });
});

describe('getFieldIdentifier', () => {
  const mockElement = {} as HTMLElement;

  it('returns name when available', () => {
    const field = { element: mockElement, type: 'text', name: 'email', label: 'Email Address' };
    
    expect(getFieldIdentifier(field)).toBe('email');
  });

  it('falls back to label when no name', () => {
    const field = { element: mockElement, type: 'text', label: 'Email Address' };
    
    expect(getFieldIdentifier(field)).toBe('Email Address');
  });

  it('falls back to placeholder when no name or label', () => {
    const field = { element: mockElement, type: 'text', placeholder: 'Enter email' };
    
    expect(getFieldIdentifier(field)).toBe('Enter email');
  });

  it('returns "unknown" when no identifiers available', () => {
    const field = { element: mockElement, type: 'text' };
    
    expect(getFieldIdentifier(field)).toBe('unknown');
  });
});
