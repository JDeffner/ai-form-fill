import { describe, it, expect, beforeEach } from 'vitest';
import { createFormFill, type FormFillSnapshot } from '../../lib/core/controller';
import type { ChatRequest, ChatResponse } from '../../lib/core/types';
import { MockAIProvider } from '../mock-provider';

beforeEach(() => {
  document.body.innerHTML = '';
});

const OK = JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com' });

/** Render the quick-start page (form, source textarea, submit button) . */
function page() {
  document.body.innerHTML = `
    <form id="contact">
      <input type="text" name="name">
      <input type="email" name="email">
      <button id="fill" type="submit">Fill</button>
    </form>
    <textarea id="notes">Ada Lovelace, ada@example.com</textarea>
  `;
  return {
    form: document.querySelector<HTMLFormElement>('#contact')!,
    source: document.querySelector<HTMLTextAreaElement>('#notes')!,
    trigger: document.querySelector<HTMLButtonElement>('#fill')!,
  };
}

/** A provider whose response is released by hand, so a fill can be caught mid-flight. */
class PendingProvider extends MockAIProvider {
  release!: (content: string) => void;
  private pending = new Promise<string>((resolve) => {
    this.release = resolve;
  });

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const content = await new Promise<string>((resolve, reject) => {
      void this.pending.then(resolve);
      request.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });
    return { content, model: 'mock-model' };
  }
}

describe('createFormFill', () => {
  it('resolves the form, source and trigger from selectors or elements', async () => {
    const { form, source, trigger } = page();
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!;
    const email = form.querySelector<HTMLInputElement>('[name="email"]')!;

    const bySelector = createFormFill({
      form: '#contact',
      source: '#notes',
      trigger: '#fill',
      provider: new MockAIProvider(OK),
    });
    expect(await bySelector.fill()).not.toBeNull();
    expect(name.value).toBe('Ada Lovelace');
    bySelector.undo();
    bySelector.destroy();

    const byElement = createFormFill({ form, source, trigger, provider: new MockAIProvider(OK) });
    const result = await byElement.fill();

    expect(result?.filled.map((entry) => entry.key)).toEqual(['name', 'email']);
    expect(email.value).toBe('ada@example.com');
  });

  it('throws when the form does not resolve', () => {
    page();

    expect(() => createFormFill({ form: '#missing' })).toThrow(/form selector "#missing"/);
    expect(() => createFormFill({ form: '#notes' })).toThrow(/<form> element/);
  });

  it('moves idle to working to done', async () => {
    const { form } = page();
    const states: string[] = [];
    const controller = createFormFill({
      form,
      provider: new MockAIProvider(OK),
      onState: (snapshot) => states.push(snapshot.state),
    });

    expect(controller.getSnapshot().state).toBe('idle');
    await controller.fill('Ada Lovelace, ada@example.com');

    expect(states).toEqual(['working', 'done']);
    expect(controller.getSnapshot().result?.filled).toHaveLength(2);
  });

  it('reports a provider failure as an error state and resolves null', async () => {
    const { form } = page();
    const controller = createFormFill({ form, provider: new MockAIProvider('not json') });

    const result = await controller.fill('text');

    expect(result).toBeNull();
    expect(controller.getSnapshot().state).toBe('error');
    expect(controller.getSnapshot().error).toBeInstanceOf(Error);
  });

  it('reports missing and empty text as an error state without a request', async () => {
    const { form } = page();
    const provider = new MockAIProvider(OK);
    const controller = createFormFill({ form, provider });

    expect(await controller.fill()).toBeNull();
    expect(controller.getSnapshot().state).toBe('error');
    expect(await controller.fill('   ')).toBeNull();
    expect(provider.lastRequest).toBeUndefined();
  });

  it('cancel aborts the in-flight fill, back to idle and null', async () => {
    const { form } = page();
    const provider = new PendingProvider();
    const controller = createFormFill({ form, provider });

    const pending = controller.fill('text');
    expect(controller.getSnapshot().state).toBe('working');
    controller.cancel();
    provider.release(OK);

    expect(await pending).toBeNull();
    expect(controller.getSnapshot()).toEqual({ state: 'idle', result: null, error: null });
  });

  it('undo restores the overwritten values and clears the result', async () => {
    const { form } = page();
    form.querySelector<HTMLInputElement>('[name="name"]')!.value = 'Grace';
    const controller = createFormFill({ form, provider: new MockAIProvider(OK) });

    await controller.fill('text');
    controller.undo();

    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('Grace');
    expect(form.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('');
    expect(controller.getSnapshot()).toEqual({ state: 'idle', result: null, error: null });
  });

  it('applyExtracted writes a reviewed extraction and makes it undoable', async () => {
    const { form } = page();
    const controller = createFormFill({ form, provider: new MockAIProvider(OK) });

    const { data, fields } = await controller.extract('text');
    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('');

    const result = controller.applyExtracted({ ...data, name: 'Grace Hopper' }, fields);

    expect(form.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('Grace Hopper');
    expect(controller.getSnapshot()).toEqual({ state: 'done', result, error: null });
  });

  it('fills on a trigger click without submitting the form', async () => {
    const { form, trigger } = page();
    let submitted = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
    });
    const controller = createFormFill({
      form,
      source: '#notes',
      trigger,
      provider: new MockAIProvider(OK),
    });

    trigger.click();
    expect(controller.getSnapshot().state).toBe('working');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitted).toBe(false);
    expect(controller.getSnapshot().state).toBe('done');
  });

  it('destroy removes the trigger listener', async () => {
    const { form, trigger } = page();
    trigger.type = 'button'; // no submit attempt once the listener is gone
    const controller = createFormFill({
      form,
      source: '#notes',
      trigger,
      provider: new MockAIProvider(OK),
    });

    controller.destroy();
    trigger.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getSnapshot().state).toBe('idle');
  });

  it('keeps the snapshot reference stable between state changes', async () => {
    const { form } = page();
    const seen: FormFillSnapshot[] = [];
    const controller = createFormFill({ form, provider: new MockAIProvider(OK) });
    const unsubscribe = controller.subscribe((snapshot) => seen.push(snapshot));

    const idle = controller.getSnapshot();
    expect(controller.getSnapshot()).toBe(idle);

    await controller.fill('text');
    const done = controller.getSnapshot();

    expect(done).not.toBe(idle);
    expect(controller.getSnapshot()).toBe(done);
    expect(seen).toEqual([{ state: 'working', result: null, error: null }, done]);

    unsubscribe();
    await controller.fill('text');
    expect(seen).toHaveLength(2);
  });
});
