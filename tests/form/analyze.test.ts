import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeField, getFormFields, readFieldValue } from '../../lib/form/analyze';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('analyzeField', () => {
  it('extracts type and name from input element', () => {
    const input = document.createElement('input');
    input.type = 'email';
    input.name = 'userEmail';

    const result = analyzeField(input);

    expect(result.type).toBe('email');
    expect(result.name).toBe('userEmail');
    expect(result.key).toBe('userEmail');
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

  it('identifies select elements and reads their options', () => {
    const select = document.createElement('select');
    select.name = 'country';
    select.innerHTML = `
      <option value="">Select...</option>
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `;

    const result = analyzeField(select);

    expect(result.type).toBe('select');
    expect(result.name).toBe('country');
    // The empty placeholder option is not a real choice.
    expect(result.options).toEqual([
      { value: 'de', label: 'Germany' },
      { value: 'us', label: 'United States' },
    ]);
  });

  it('marks <select multiple> as multi-value', () => {
    const select = document.createElement('select');
    select.name = 'languages';
    select.multiple = true;
    select.innerHTML = `<option value="en">English</option><option value="de">German</option>`;

    const result = analyzeField(select);

    expect(result.multiple).toBe(true);
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

  it('falls back to aria-label', () => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Search query');
    document.body.appendChild(input);

    expect(analyzeField(input).label).toBe('Search query');
  });

  it('resolves aria-labelledby references', () => {
    const heading = document.createElement('span');
    heading.id = 'billing';
    heading.textContent = 'Billing';
    const detail = document.createElement('span');
    detail.id = 'zip';
    detail.textContent = 'ZIP code';
    document.body.append(heading, detail);

    const input = document.createElement('input');
    input.setAttribute('aria-labelledby', 'billing zip');
    document.body.appendChild(input);

    expect(analyzeField(input).label).toBe('Billing ZIP code');
  });

  it('falls back to title attribute', () => {
    const input = document.createElement('input');
    input.title = 'Phone number';
    document.body.appendChild(input);

    expect(analyzeField(input).label).toBe('Phone number');
  });

  it('reads the data-aff-hint attribute', () => {
    const input = document.createElement('input');
    input.dataset.affHint = 'Use the earliest date';

    expect(analyzeField(input).hint).toBe('Use the earliest date');
  });
});

describe('getFormFields', () => {
  it('finds all input fields in a form', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="name">
      <input type="email" name="email">
      <textarea name="bio"></textarea>
    `;
    document.body.appendChild(form);

    const targets = getFormFields(form);

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

    const targets = getFormFields(form);

    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe('visible');
  });

  it('groups radio buttons by name with value+label options', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <label><input type="radio" name="gender" value="m"> Male</label>
      <label><input type="radio" name="gender" value="f"> Female</label>
      <label><input type="radio" name="gender" value="o"> Other</label>
    `;
    document.body.appendChild(form);

    const targets = getFormFields(form);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('radio');
    expect(targets[0].key).toBe('gender');
    expect(targets[0].options).toEqual([
      { value: 'm', label: 'Male' },
      { value: 'f', label: 'Female' },
      { value: 'o', label: 'Other' },
    ]);
  });

  it('groups same-name checkboxes into one multi-value field', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <label><input type="checkbox" name="interests" value="tech"> Technology</label>
      <label><input type="checkbox" name="interests" value="music"> Music</label>
      <label><input type="checkbox" name="interests" value="sports"> Sports</label>
      <input type="checkbox" name="newsletter" value="yes">
    `;
    document.body.appendChild(form);

    const targets = getFormFields(form);

    expect(targets).toHaveLength(2);
    const group = targets.find((t) => t.key === 'interests')!;
    expect(group.multiple).toBe(true);
    expect(group.options).toEqual([
      { value: 'tech', label: 'Technology' },
      { value: 'music', label: 'Music' },
      { value: 'sports', label: 'Sports' },
    ]);
    // A lone checkbox stays a plain boolean field.
    const single = targets.find((t) => t.key === 'newsletter')!;
    expect(single.multiple).toBeUndefined();
  });

  it('assigns stable keys: name, then id, then indexed fallback', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="email">
      <input type="text" id="onlyId">
      <input type="text">
    `;
    document.body.appendChild(form);

    const keys = getFormFields(form).map((f) => f.key);

    expect(keys[0]).toBe('email');
    expect(keys[1]).toBe('onlyId');
    expect(keys[2]).toBe('field_3');
  });

  it('deduplicates colliding keys', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="email">
      <input type="text" name="email">
    `;
    document.body.appendChild(form);

    const keys = getFormFields(form).map((f) => f.key);

    expect(keys).toEqual(['email', 'email_2']);
  });

  it('keeps DOM order, with groups at their first member position', () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="first">
      <input type="radio" name="choice" value="a">
      <input type="radio" name="choice" value="b">
      <input type="text" name="last">
    `;
    document.body.appendChild(form);

    const keys = getFormFields(form).map((f) => f.key);

    expect(keys).toEqual(['first', 'choice', 'last']);
  });
});

describe('readFieldValue', () => {
  /** Build a form from `html` and return the named element. */
  function field<T extends HTMLElement>(html: string, name: string): T {
    const form = document.createElement('form');
    form.innerHTML = html;
    document.body.appendChild(form);
    return form.querySelector<T>(`[name="${name}"]`)!;
  }

  it('reads text inputs and textareas', () => {
    expect(readFieldValue(field(`<input type="text" name="a" value="Ada">`, 'a'))).toBe('Ada');
    expect(readFieldValue(field(`<textarea name="b">bio</textarea>`, 'b'))).toBe('bio');
    expect(readFieldValue(field(`<input type="email" name="c">`, 'c'))).toBe('');
  });

  it('reads a single select and a multiple select', () => {
    const single = field(
      `<select name="s"><option value="">-</option><option value="de" selected>DE</option></select>`,
      's',
    );
    expect(readFieldValue(single)).toBe('de');

    const multi = field(
      `<select name="m" multiple>
         <option value="de" selected>DE</option>
         <option value="en">EN</option>
         <option value="fr" selected>FR</option>
       </select>`,
      'm',
    );
    expect(readFieldValue(multi)).toEqual(['de', 'fr']);
  });

  it('reads the checked value of a radio group, or an empty string', () => {
    const unchecked = `<input type="radio" name="g" value="a"><input type="radio" name="g" value="b">`;
    expect(readFieldValue(field(unchecked, 'g'))).toBe('');

    document.body.innerHTML = '';
    const checked = `<input type="radio" name="g" value="a"><input type="radio" name="g" value="b" checked>`;
    expect(readFieldValue(field(checked, 'g'))).toBe('b');
  });

  it('reads a checkbox group as the checked values and a single checkbox as a boolean', () => {
    const group = `<input type="checkbox" name="t" value="music" checked>
                   <input type="checkbox" name="t" value="tech">
                   <input type="checkbox" name="t" value="sport" checked>`;
    expect(readFieldValue(field(group, 't'))).toEqual(['music', 'sport']);

    document.body.innerHTML = '';
    expect(readFieldValue(field(`<input type="checkbox" name="n" checked>`, 'n'))).toBe('true');

    document.body.innerHTML = '';
    expect(readFieldValue(field(`<input type="checkbox" name="n">`, 'n'))).toBe('false');
  });
});
