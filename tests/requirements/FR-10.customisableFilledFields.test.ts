/**
 * FR-10: Customisable Filled Fields
 *
 * Requirement: The library shall allow users to specify which form fields
 * should be populated by the AI.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIFormFill } from '../../lib/core/ai-form-fill';
import { MockAIProvider } from '../mock-provider';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('FR-10: Customisable Filled Fields', () => {
  // AC-1: Developers can provide a list of field names that should be filled by the AI.
  it('AC-1: Developers can specify which fields to fill', async () => {
    const mockProvider = new MockAIProvider(
      JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }),
    );

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
    await aiFormFill.fillForm(form, 'John Doe john@example.com');

    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('john@example.com');
  });

  // AC-2: Only the specified fields are modified; all other fields remain unchanged.
  it('AC-2: Only specified fields are modified', async () => {
    const mockProvider = new MockAIProvider(
      JSON.stringify({
        firstName: 'John',
      }),
    );

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="firstName" value="Original">
      <input type="text" name="lastName" value="Unchanged">
    `;
    document.body.appendChild(form);

    const aiFormFill = new AIFormFill(mockProvider, {
      targetFields: ['firstName'],
    });
    await aiFormFill.fillForm(form, 'John');

    expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
    expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('Unchanged');
  });
});
