/**
 * FR-04: Select Element Support
 *
 * Requirement: The library shall support AI-assisted filling of dropdown (select) elements
 * by matching AI suggestions to available options.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setFieldValue, getFillTargets } from '../../lib/utils/fieldUtils';

beforeEach(() => {
  document.body.innerHTML = '';
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
