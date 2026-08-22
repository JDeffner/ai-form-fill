/**
 * Regression tests for the 2026-08 audit findings.
 * Each case is the exact input that was previously misclassified.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setFieldValue, getFillTargets, analyzeField } from '../../lib/utils/fieldUtils';
import { parseJsonResponse } from '../../lib/utils/jsonParser';
import { buildFieldPrompt } from '../../lib/utils/prompts';

import { AIFormFill } from '../../lib/core/aiFormFill';
import { AIProvider, type ProviderType } from '../../lib/providers/aiProvider';
import type { ChatRequest, ChatResponse } from '../../lib/core/types';

class UnreachableProvider extends AIProvider {
  protected providerName = 'unreachable';
  protected providerType: ProviderType = 'local';

  async chat(_request: ChatRequest): Promise<ChatResponse> {
    throw new Error('Failed to connect to the provider');
  }
}

describe('audit regressions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('H2: a "female" answer checks the female radio, not the male one', () => {
    document.body.innerHTML = `
      <form>
        <input type="radio" id="m" name="gender" value="male"><label for="m">Male</label>
        <input type="radio" id="f" name="gender" value="female"><label for="f">Female</label>
      </form>`;
    const male = document.getElementById('m') as HTMLInputElement;
    const female = document.getElementById('f') as HTMLInputElement;

    setFieldValue(male, 'female');

    expect(female.checked).toBe(true);
    expect(male.checked).toBe(false);
  });

  it('H3: an unmatched select keeps its current selection', () => {
    document.body.innerHTML = `
      <form>
        <select id="country">
          <option value="">Select country...</option>
          <option value="de">Germany</option>
        </select>
      </form>`;
    const select = document.getElementById('country') as HTMLSelectElement;
    select.value = 'de';

    setFieldValue(select, 'Canada');

    expect(select.value).toBe('de');
  });

  it('M: readonly and disabled fields are neither described nor written', () => {
    document.body.innerHTML = `
      <form id="f">
        <input name="accountId" readonly value="ACC-1">
        <input name="locked" disabled value="LOCKED">
        <input name="email">
      </form>`;
    const form = document.getElementById('f') as HTMLFormElement;
    const readonly = form.elements.namedItem('accountId') as HTMLInputElement;

    expect(getFillTargets(form).map((f) => f.name)).toEqual(['email']);

    setFieldValue(readonly, 'NEW');
    expect(readonly.value).toBe('ACC-1');
  });

  it('M: "None" is a legitimate answer and is written', () => {
    document.body.innerHTML = '<form><input id="allergies" name="allergies"></form>';
    const input = document.getElementById('allergies') as HTMLInputElement;

    setFieldValue(input, 'None');

    expect(input.value).toBe('None');
  });

  it('M: nested values survive the parser and backticks are not stripped', () => {
    const parsed = parseJsonResponse('{"address":{"city":"Berlin"},"tags":["a","b"]}');
    expect(parsed.address).toBe('{"city":"Berlin"}');

    expect(parseJsonResponse('{"bio":"I use `code` daily"}').bio).toBe('I use `code` daily');
    expect(parseJsonResponse('```json\n{"name":"Ada"}\n```').name).toBe('Ada');
  });

  it('M: a checkbox prompt keeps the field metadata', () => {
    document.body.innerHTML = '<form><input type="checkbox" name="newsletter"></form>';
    const checkbox = document.querySelector('input') as HTMLInputElement;

    const prompt = buildFieldPrompt(analyzeField(checkbox));

    expect(prompt).not.toContain('undefined');
    expect(prompt).not.toContain('Randomly');
    expect(prompt).toContain('newsletter');
  });

  it('M: a provider failure is reported back to the caller', async () => {
    document.body.innerHTML = '<form id="f"><input name="email"></form>';
    const form = document.getElementById('f') as HTMLFormElement;
    const aiForm = new AIFormFill(new UnreachableProvider());

    const result = await aiForm.parseAndFillForm(form, 'mail me at ada@example.com');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.filled).toEqual([]);
    expect(result.skipped).toEqual(['email']);
  });
});
