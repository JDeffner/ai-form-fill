import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyFieldValue } from '../../lib/form/apply';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('applyFieldValue - text', () => {
  it('sets text input value', () => {
    const input = document.createElement('input');
    input.type = 'text';

    const result = applyFieldValue(input, 'Hello World');

    expect(input.value).toBe('Hello World');
    expect(result).toEqual({ applied: true, value: 'Hello World' });
  });

  it('sets textarea value', () => {
    const textarea = document.createElement('textarea');

    applyFieldValue(textarea, 'Long text content');

    expect(textarea.value).toBe('Long text content');
  });

  it('coerces numbers to strings', () => {
    const input = document.createElement('input');
    input.type = 'number';

    const result = applyFieldValue(input, 42);

    expect(input.value).toBe('42');
    expect(result).toEqual({ applied: true, value: '42' });
  });

  it('skips empty values and "no value" markers', () => {
    const input = document.createElement('input');
    input.value = 'original';

    expect(applyFieldValue(input, '')).toEqual({ applied: false, reason: 'empty-value' });
    expect(applyFieldValue(input, 'null')).toEqual({ applied: false, reason: 'empty-value' });
    expect(applyFieldValue(input, null)).toEqual({ applied: false, reason: 'empty-value' });
    expect(applyFieldValue(input, undefined)).toEqual({ applied: false, reason: 'empty-value' });
    expect(input.value).toBe('original');
  });

  it('skips object values as unsupported', () => {
    const input = document.createElement('input');

    expect(applyFieldValue(input, { nested: true })).toEqual({
      applied: false,
      reason: 'unsupported-value',
    });
  });

  it('writes through the native prototype setter (React value tracker)', () => {
    const input = document.createElement('input');
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    const setterSpy = vi.fn(nativeSetter);
    // A React-like instance-level override that would swallow plain assignments.
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => 'shadowed',
      set: () => {},
    });
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      ...Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!,
      set: setterSpy,
    });

    try {
      applyFieldValue(input, 'via prototype');
      expect(setterSpy).toHaveBeenCalledWith('via prototype');
    } finally {
      Object.defineProperty(HTMLInputElement.prototype, 'value', {
        ...Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!,
        set: nativeSetter,
      });
    }
  });

  it('dispatches input and change events', () => {
    const input = document.createElement('input');
    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));

    applyFieldValue(input, 'x');

    expect(events).toEqual(['input', 'change']);
  });
});

describe('applyFieldValue - checkbox', () => {
  it('handles boolean and boolean-like values', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    applyFieldValue(checkbox, true);
    expect(checkbox.checked).toBe(true);
    applyFieldValue(checkbox, false);
    expect(checkbox.checked).toBe(false);
    applyFieldValue(checkbox, 'true');
    expect(checkbox.checked).toBe(true);
    applyFieldValue(checkbox, 'no');
    expect(checkbox.checked).toBe(false);
    applyFieldValue(checkbox, 'yes');
    expect(checkbox.checked).toBe(true);
  });

  it("accepts the checkbox's own value as confirmation", () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = 'technology';

    const result = applyFieldValue(checkbox, 'technology');

    expect(checkbox.checked).toBe(true);
    expect(result).toEqual({ applied: true, value: 'true' });
  });

  it('applies an array of values to a checkbox group', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <label><input type="checkbox" name="interests" value="tech"> Technology</label>
      <label><input type="checkbox" name="interests" value="music" checked> Music</label>
      <label><input type="checkbox" name="interests" value="sports"> Sports</label>
    `;
    document.body.appendChild(form);
    const first = form.querySelector<HTMLInputElement>('input')!;

    const result = applyFieldValue(first, ['tech', 'Sports']);

    const states = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ).map((cb) => cb.checked);
    expect(states).toEqual([true, false, true]);
    expect(result).toEqual({ applied: true, value: ['tech', 'sports'] });
  });

  it('reports no-matching-option for a group when nothing matches', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="checkbox" name="interests" value="tech">
      <input type="checkbox" name="interests" value="music">
    `;
    document.body.appendChild(form);
    const first = form.querySelector<HTMLInputElement>('input')!;

    expect(applyFieldValue(first, ['gardening'])).toEqual({
      applied: false,
      reason: 'no-matching-option',
    });
  });
});

describe('applyFieldValue - radio', () => {
  function genderForm(): HTMLFormElement {
    const form = document.createElement('form');
    form.innerHTML = `
      <label><input type="radio" name="gender" value="female"> Female</label>
      <label><input type="radio" name="gender" value="male"> Male</label>
    `;
    document.body.appendChild(form);
    return form;
  }

  it('selects "male" even though "female" contains it as a substring (B1)', () => {
    const form = genderForm();
    const firstRadio = form.querySelector<HTMLInputElement>('input')!;

    const result = applyFieldValue(firstRadio, 'male');

    expect(form.querySelector<HTMLInputElement>('input[value="male"]')?.checked).toBe(true);
    expect(form.querySelector<HTMLInputElement>('input[value="female"]')?.checked).toBe(false);
    expect(result).toEqual({ applied: true, value: 'male' });
  });

  it('matches by exact label', () => {
    const form = genderForm();
    const firstRadio = form.querySelector<HTMLInputElement>('input')!;

    applyFieldValue(firstRadio, 'Female');

    expect(form.querySelector<HTMLInputElement>('input[value="female"]')?.checked).toBe(true);
  });

  it('matches case-insensitively but never by substring', () => {
    const form = genderForm();
    const firstRadio = form.querySelector<HTMLInputElement>('input')!;

    expect(applyFieldValue(firstRadio, 'MALE')).toEqual({ applied: true, value: 'male' });
    expect(applyFieldValue(firstRadio, 'mal')).toEqual({
      applied: false,
      reason: 'no-matching-option',
    });
  });
});

describe('applyFieldValue - select', () => {
  it('selects option by exact value or exact text', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `;

    applyFieldValue(select, 'us');
    expect(select.value).toBe('us');

    applyFieldValue(select, 'Germany');
    expect(select.value).toBe('de');
  });

  it('matches case-insensitively when no exact match exists', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `;

    applyFieldValue(select, 'united states');
    expect(select.value).toBe('us');
  });

  it('never matches options by substring (B1)', () => {
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="">Select</option>
      <option value="female">Female</option>
      <option value="male">Male</option>
    `;

    const result = applyFieldValue(select, 'male');

    expect(select.value).toBe('male');
    expect(result).toEqual({ applied: true, value: 'male' });

    expect(applyFieldValue(select, 'Engineer')).toEqual({
      applied: false,
      reason: 'no-matching-option',
    });
  });

  it('supports <select multiple> with array values', () => {
    const select = document.createElement('select');
    select.multiple = true;
    select.innerHTML = `
      <option value="en">English</option>
      <option value="de">German</option>
      <option value="fr">French</option>
    `;

    const result = applyFieldValue(select, ['en', 'French']);

    const selected = Array.from(select.options)
      .filter((o) => o.selected)
      .map((o) => o.value);
    expect(selected).toEqual(['en', 'fr']);
    expect(result).toEqual({ applied: true, value: ['en', 'fr'] });
  });
});

describe('applyFieldValue - dates (strict ISO, B2)', () => {
  it('accepts valid ISO dates', () => {
    const input = document.createElement('input');
    input.type = 'date';

    const result = applyFieldValue(input, '1990-03-15');

    expect(input.value).toBe('1990-03-15');
    expect(result).toEqual({ applied: true, value: '1990-03-15' });
  });

  it('rejects non-ISO formats instead of guessing (15.03.1990 must not roll over)', () => {
    const input = document.createElement('input');
    input.type = 'date';

    expect(applyFieldValue(input, '15.03.1990')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
    expect(applyFieldValue(input, '03/15/1990')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
    expect(input.value).toBe('');
  });

  it('rejects impossible calendar dates', () => {
    const input = document.createElement('input');
    input.type = 'date';

    expect(applyFieldValue(input, '2023-02-30')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
    expect(applyFieldValue(input, '2023-15-01')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
  });

  it('validates datetime-local and time formats', () => {
    const datetime = document.createElement('input');
    datetime.type = 'datetime-local';
    expect(applyFieldValue(datetime, '2024-02-01T14:30')).toEqual({
      applied: true,
      value: '2024-02-01T14:30',
    });
    expect(applyFieldValue(datetime, '2024-02-01 14:30')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });

    const time = document.createElement('input');
    time.type = 'time';
    expect(applyFieldValue(time, '09:30')).toEqual({ applied: true, value: '09:30' });
    expect(applyFieldValue(time, '25:00')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
    expect(applyFieldValue(time, '3 PM')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
  });

  it('validates month and week values by regex', () => {
    const month = document.createElement('input');
    month.type = 'month';
    expect(applyFieldValue(month, '2024-05')).toEqual({ applied: true, value: '2024-05' });
    expect(applyFieldValue(month, '2024-13')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });

    const week = document.createElement('input');
    week.type = 'week';
    expect(applyFieldValue(week, '2024-W22')).toEqual({ applied: true, value: '2024-W22' });
    expect(applyFieldValue(week, '2024-W60')).toEqual({
      applied: false,
      reason: 'invalid-date-format',
    });
  });
});
