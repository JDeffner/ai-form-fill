import { describe, it, expect, beforeEach } from 'vitest';
import { AIFormFill } from '../../lib/core/ai-form-fill';
import type { AFFEventMap } from '../../lib/core/events';
import { MockAIProvider } from '../mock-provider';

beforeEach(() => {
  document.body.innerHTML = '';
});

/** Record every library event seen on `target`, in order. */
function recordEvents(target: HTMLElement): Array<{ type: string; detail: any }> {
  const seen: Array<{ type: string; detail: any }> = [];
  for (const type of ['aff:start', 'aff:field-filled', 'aff:done', 'aff:error'] as Array<
    keyof AFFEventMap
  >) {
    target.addEventListener(type, (event) => {
      seen.push({ type, detail: (event as CustomEvent).detail });
    });
  }
  return seen;
}

describe('lifecycle events', () => {
  it('dispatches start, one field-filled per field and done, in order', async () => {
    const provider = new MockAIProvider(JSON.stringify({ name: 'John', email: 'j@example.com' }));
    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="name" value="old">
      <input type="email" name="email">
    `;
    document.body.appendChild(form);
    const seen = recordEvents(form);

    const result = await new AIFormFill(provider).fillForm(form, 'John, j@example.com');

    expect(seen.map((e) => e.type)).toEqual([
      'aff:start',
      'aff:field-filled',
      'aff:field-filled',
      'aff:done',
    ]);
    expect(seen[0].detail).toEqual({ text: 'John, j@example.com' });
    expect(seen[1].detail).toEqual({
      key: 'name',
      element: form.querySelector('[name="name"]'),
      value: 'John',
      previous: 'old',
    });
    expect(seen[3].detail).toBe(result);
  });

  it('dispatches error with the thrown error and still rejects', async () => {
    const provider = new MockAIProvider('not json');
    const form = document.createElement('form');
    form.innerHTML = `<input type="text" name="name">`;
    document.body.appendChild(form);
    const seen = recordEvents(form);

    const thrown = await new AIFormFill(provider).fillForm(form, 'x').catch((e: unknown) => e);

    expect(seen.map((e) => e.type)).toEqual(['aff:start', 'aff:error']);
    expect(seen[1].detail).toEqual({ error: thrown });
  });

  it('bubbles, so a listener above the form sees the events', async () => {
    const provider = new MockAIProvider(JSON.stringify({ name: 'John' }));
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<form><input type="text" name="name"></form>`;
    document.body.appendChild(wrapper);
    const seen = recordEvents(wrapper);

    await new AIFormFill(provider).fillForm(wrapper.querySelector('form')!, 'John');

    expect(seen.map((e) => e.type)).toContain('aff:done');
  });

  it('fillField dispatches field-filled on the element it wrote', async () => {
    const provider = new MockAIProvider('Jane Doe');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'fullName';
    document.body.appendChild(input);
    const seen = recordEvents(input);

    await new AIFormFill(provider).fillField(input);

    expect(seen).toEqual([
      {
        type: 'aff:field-filled',
        detail: { key: 'fullName', element: input, value: 'Jane Doe', previous: '' },
      },
    ]);
  });
});
