/**
 * FR-05: Checkbox Support
 *
 * Requirement: The library shall support the analysis and AI-assisted filling of checkbox elements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIFormFill } from '../../lib/core/ai-form-fill';
import { MockAIProvider } from '../mock-provider';
import { getFormFields } from '../../lib/form/analyze';
import { applyFieldValue } from '../../lib/form/apply';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('FR-05: Checkbox Support', () => {
  // AC-1: Checkbox fields are included in form analysis alongside other supported elements.
  it('AC-1: Checkbox fields are included in form analysis', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="name">
      <input type="checkbox" name="subscribe">
    `;
    document.body.appendChild(form);

    const targets = getFormFields(form);

    expect(targets.length).toBe(2);
    expect(targets.some((t) => t.type === 'checkbox')).toBe(true);
  });

  // AC-2: The AI can return boolean-like values (e.g. true/false, yes/no) for checkbox fields.
  it('AC-2: Handles boolean-like values', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    applyFieldValue(checkbox, 'true');
    expect(checkbox.checked).toBe(true);

    applyFieldValue(checkbox, 'false');
    expect(checkbox.checked).toBe(false);

    applyFieldValue(checkbox, 'yes');
    expect(checkbox.checked).toBe(true);
  });

  // AC-3: The library correctly sets the checked property of each checkbox based on the AI response.
  it('AC-3: Sets checked property based on AI response', async () => {
    const mockProvider = new MockAIProvider(
      JSON.stringify({
        newsletter: 'true',
        terms: 'false',
      }),
    );

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="checkbox" name="newsletter">
      <input type="checkbox" name="terms" checked>
    `;
    document.body.appendChild(form);

    const aiFormFill = new AIFormFill(mockProvider);
    await aiFormFill.fillForm(form, 'subscribe, no terms');

    expect(form.querySelector<HTMLInputElement>('[name="newsletter"]')?.checked).toBe(true);
    expect(form.querySelector<HTMLInputElement>('[name="terms"]')?.checked).toBe(false);
  });
});
