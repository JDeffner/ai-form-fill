import { describe, it, expect, beforeEach } from 'vitest';
import { AIFormFill } from '../../lib/core/ai-form-fill';
import { revertFill } from '../../lib/form/revert';
import { MockAIProvider } from '../mock-provider';

beforeEach(() => {
  document.body.innerHTML = '';
});

/** Build a form, fill it with `data`, and hand back both for assertions. */
async function fill(html: string, data: Record<string, unknown>) {
  const form = document.createElement('form');
  form.innerHTML = html;
  document.body.appendChild(form);
  const result = await new AIFormFill(new MockAIProvider(JSON.stringify(data))).fillForm(
    form,
    'text',
  );
  return { form, result };
}

describe('revertFill', () => {
  it('restores text, select, radio, checkbox group and multi-select', async () => {
    const { form, result } = await fill(
      `
        <input type="text" name="name" value="Ada">
        <input type="text" name="nickname">
        <select name="country">
          <option value="">Select...</option>
          <option value="de" selected>Germany</option>
          <option value="us">USA</option>
        </select>
        <input type="radio" name="gender" value="male">
        <input type="radio" name="gender" value="female">
        <input type="checkbox" name="tags" value="music" checked>
        <input type="checkbox" name="tags" value="tech">
        <select name="langs" multiple>
          <option value="de" selected>German</option>
          <option value="en">English</option>
          <option value="fr">French</option>
        </select>
      `,
      {
        name: 'Grace',
        nickname: 'Hopper',
        country: 'us',
        gender: 'male',
        tags: ['tech'],
        langs: ['en', 'fr'],
      },
    );

    expect(result.filled.map((entry) => entry.key).sort()).toEqual([
      'country',
      'gender',
      'langs',
      'name',
      'nickname',
      'tags',
    ]);

    revertFill(result);

    const value = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value;
    expect(value('name')).toBe('Ada');
    expect(value('nickname')).toBe('');
    expect(form.querySelector<HTMLSelectElement>('[name="country"]')!.value).toBe('de');
    // Nothing was checked before the fill, so nothing is checked after the undo.
    expect(
      Array.from(form.querySelectorAll<HTMLInputElement>('[name="gender"]')).some((r) => r.checked),
    ).toBe(false);
    expect(
      Array.from(form.querySelectorAll<HTMLInputElement>('[name="tags"]'))
        .filter((box) => box.checked)
        .map((box) => box.value),
    ).toEqual(['music']);
    expect(
      Array.from(form.querySelector<HTMLSelectElement>('[name="langs"]')!.selectedOptions).map(
        (option) => option.value,
      ),
    ).toEqual(['de']);
  });

  it('restores a single checkbox to unchecked', async () => {
    const { form, result } = await fill(`<input type="checkbox" name="newsletter">`, {
      newsletter: true,
    });
    expect(form.querySelector<HTMLInputElement>('[name="newsletter"]')!.checked).toBe(true);

    revertFill(result);

    expect(form.querySelector<HTMLInputElement>('[name="newsletter"]')!.checked).toBe(false);
  });

  it('restores only the given keys', async () => {
    const { form, result } = await fill(
      `
        <input type="text" name="first" value="Ada">
        <input type="text" name="last" value="Lovelace">
      `,
      { first: 'Grace', last: 'Hopper' },
    );

    revertFill(result, ['first']);

    expect(form.querySelector<HTMLInputElement>('[name="first"]')!.value).toBe('Ada');
    expect(form.querySelector<HTMLInputElement>('[name="last"]')!.value).toBe('Hopper');
  });

  it('dispatches input and change events so frameworks observe the undo', async () => {
    const { form, result } = await fill(`<input type="text" name="name" value="Ada">`, {
      name: 'Grace',
    });
    const seen: string[] = [];
    for (const type of ['input', 'change']) {
      form.addEventListener(type, () => seen.push(type));
    }

    revertFill(result);

    expect(seen).toEqual(['input', 'change']);
  });
});
