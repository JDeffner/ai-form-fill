import { describe, it, expect, beforeEach } from 'vitest';
import { AIFormFill } from '../../lib/core/ai-form-fill';
import { ResponseParseError } from '../../lib/core/errors';
import { MockAIProvider } from '../mock-provider';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('AIFormFill', () => {
  describe('constructor', () => {
    it('accepts a custom AIProvider instance', () => {
      const mockProvider = new MockAIProvider();

      const aiFormFill = new AIFormFill(mockProvider);

      expect(aiFormFill).toBeDefined();
      expect(aiFormFill.getProvider()).toBe(mockProvider);
    });
  });

  describe('fillForm', () => {
    it('fills text fields from mock AI response', async () => {
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

      const aiFormFill = new AIFormFill(mockProvider);
      const result = await aiFormFill.fillForm(form, 'John Doe, email: john@example.com');

      expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
      expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('Doe');
      expect(form.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe(
        'john@example.com',
      );
      expect(result.filled.map((f) => f.key).sort()).toEqual(['email', 'firstName', 'lastName']);
      expect(result.skipped).toEqual([]);
      expect(result.unmatchedKeys).toEqual([]);
    });

    it('fills checkbox fields from mock AI response', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          newsletter: true,
          terms: false,
        }),
      );

      const form = document.createElement('form');
      form.innerHTML = `
        <input type="checkbox" name="newsletter">
        <input type="checkbox" name="terms" checked>
      `;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      await aiFormFill.fillForm(form, 'Subscribe to newsletter');

      expect(form.querySelector<HTMLInputElement>('[name="newsletter"]')?.checked).toBe(true);
      expect(form.querySelector<HTMLInputElement>('[name="terms"]')?.checked).toBe(false);
    });

    it('fills select fields from mock AI response', async () => {
      const mockProvider = new MockAIProvider(JSON.stringify({ country: 'Germany' }));

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
      const result = await aiFormFill.fillForm(form, 'I live in Germany');

      expect(form.querySelector<HTMLSelectElement>('[name="country"]')?.value).toBe('de');
      expect(result.filled[0]).toMatchObject({ key: 'country', value: 'de' });
    });

    it('only fills specified fields when targetFields option is set', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
        }),
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
      const result = await aiFormFill.fillForm(form, 'John Doe');

      expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('John');
      // lastName is not targeted: untouched, and its key counts as unmatched.
      expect(form.querySelector<HTMLInputElement>('[name="lastName"]')?.value).toBe('');
      expect(result.unmatchedKeys).toContain('lastName');
    });

    it('reports extra keys in AI response as unmatchedKeys', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({
          name: 'John',
          extraField: 'should be ignored',
          anotherExtra: '12345',
        }),
      );

      const form = document.createElement('form');
      form.innerHTML = `<input type="text" name="name">`;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      const result = await aiFormFill.fillForm(form, 'John');

      expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('John');
      expect(result.unmatchedKeys.sort()).toEqual(['anotherExtra', 'extraField']);
    });

    it('rejects with ResponseParseError on malformed AI response', async () => {
      const mockProvider = new MockAIProvider('not valid json');

      const form = document.createElement('form');
      form.innerHTML = `<input type="text" name="name" value="original">`;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);

      await expect(aiFormFill.fillForm(form, 'test')).rejects.toThrow(ResponseParseError);
      // Original value remains unchanged after the error.
      expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('original');
    });

    it('rejects with ResponseParseError carrying the raw output', async () => {
      const mockProvider = new MockAIProvider('garbage output');
      const form = document.createElement('form');
      form.innerHTML = `<input type="text" name="name">`;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      const error = await aiFormFill.fillForm(form, 'x').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ResponseParseError);
      expect((error as ResponseParseError).raw).toBe('garbage output');
    });

    it('rejects with ResponseParseError on empty provider content', async () => {
      const mockProvider = new MockAIProvider('');
      const form = document.createElement('form');
      form.innerHTML = `<input type="text" name="name">`;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      await expect(aiFormFill.fillForm(form, 'x')).rejects.toThrow(ResponseParseError);
    });

    it('collects mixed success and skip outcomes in the FillResult', async () => {
      const raw = JSON.stringify({
        name: 'John',
        birthDate: '15.03.1990', // not ISO -> skipped
        country: 'Atlantis', // no such option -> skipped
      });
      const mockProvider = new MockAIProvider(raw);

      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="name">
        <input type="date" name="birthDate">
        <select name="country">
          <option value="de">Germany</option>
          <option value="us">USA</option>
        </select>
      `;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      const result = await aiFormFill.fillForm(form, 'text');

      expect(result.filled.map((f) => f.key)).toEqual(['name']);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { key: 'birthDate', reason: 'invalid-date-format' },
          { key: 'country', reason: 'no-matching-option' },
        ]),
      );
      expect(result.raw).toBe(raw);
    });

    it('sends the form schema to structured-output providers', async () => {
      const mockProvider = new MockAIProvider(JSON.stringify({ name: 'x' }));
      const form = document.createElement('form');
      form.innerHTML = `<input type="text" name="name">`;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      await aiFormFill.fillForm(form, 'x');

      expect(mockProvider.lastRequest?.format).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
    });
  });

  describe('extract', () => {
    it('returns the extracted data without writing to the form', async () => {
      const mockProvider = new MockAIProvider(
        JSON.stringify({ firstName: 'John', email: 'john@example.com' }),
      );

      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="firstName">
        <input type="email" name="email">
      `;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);
      const result = await aiFormFill.extract(form, 'John, john@example.com');

      expect(result.data).toEqual({ firstName: 'John', email: 'john@example.com' });
      expect(result.fields.map((f) => f.key)).toEqual(['firstName', 'email']);
      expect(result.raw).toContain('john@example.com');

      // The whole point: the form is untouched until the caller applies.
      expect(form.querySelector<HTMLInputElement>('[name="firstName"]')?.value).toBe('');
      expect(form.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('');
    });

    it('honours targetFields when building the schema', async () => {
      const mockProvider = new MockAIProvider(JSON.stringify({ firstName: 'John' }));

      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="firstName">
        <input type="text" name="lastName">
      `;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider, { targetFields: ['firstName'] });
      const result = await aiFormFill.extract(form, 'John Doe');

      expect(result.fields.map((f) => f.key)).toEqual(['firstName']);
    });

    it('rejects with ResponseParseError on an empty provider response', async () => {
      const mockProvider = new MockAIProvider('');

      const form = document.createElement('form');
      form.innerHTML = `<input type="text" name="name">`;
      document.body.appendChild(form);

      const aiFormFill = new AIFormFill(mockProvider);

      await expect(aiFormFill.extract(form, 'x')).rejects.toBeInstanceOf(ResponseParseError);
    });
  });

  describe('fillField', () => {
    it('applies the model value and returns it', async () => {
      const mockProvider = new MockAIProvider('Jane Doe');
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'fullName';
      document.body.appendChild(input);

      const aiFormFill = new AIFormFill(mockProvider);
      const result = await aiFormFill.fillField(input);

      expect(input.value).toBe('Jane Doe');
      expect(result).toEqual({ value: 'Jane Doe' });
    });

    it('returns null when the model produced no usable value', async () => {
      const mockProvider = new MockAIProvider('   ');
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      const aiFormFill = new AIFormFill(mockProvider);
      const result = await aiFormFill.fillField(input);

      expect(result).toBeNull();
    });
  });
});
