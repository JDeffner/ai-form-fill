import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIFormFillElement, defineFormFillElement } from '../../lib/ui/element';
import { ProviderError } from '../../lib/core/errors';
import type { ChatRequest, ChatResponse } from '../../lib/core/types';
import { MockAIProvider } from '../mock-provider';

// A custom element can only be registered once per document, and vitest keeps
// one jsdom window per file, so this runs at module scope.
defineFormFillElement();

/** A provider whose response is released by hand, to catch the working state. */
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

/** A provider that always fails, to check the error wording. */
class FailingProvider extends MockAIProvider {
  failure: unknown = new Error('boom');

  override chat(): Promise<ChatResponse> {
    return Promise.reject(this.failure);
  }
}

/** Stand-in for the browser's `SpeechRecognition`; jsdom has none. */
class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start() {}

  stop() {
    this.onend?.();
  }

  /** Fire a `result` event carrying one final phrase. */
  emit(text: string) {
    this.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal: true })] });
  }
}

const FORM = `
  <form id="contact">
    <label for="name">Full name</label>
    <input id="name" name="name" />
    <label for="phone">Phone</label>
    <input id="phone" name="phone" type="tel" required />
  </form>`;

/** Render `html` and return the element it contains. */
function mount(html: string): AIFormFillElement {
  document.body.innerHTML = html;
  const element = document.querySelector('ai-form-fill');
  if (!(element instanceof AIFormFillElement)) throw new Error('The element did not upgrade.');
  return element;
}

/** Render the standard form plus a panel that points at it. */
function page(attributes = '', response = '{}'): AIFormFillElement {
  const element = mount(`${FORM}<ai-form-fill for="#contact" ${attributes}></ai-form-fill>`);
  element.provider = new MockAIProvider(response);
  return element;
}

const part = <T extends HTMLElement>(element: AIFormFillElement, name: string): T =>
  element.shadowRoot!.querySelector<T>(`[part~="${name}"]`)!;

const state = (element: AIFormFillElement) => part(element, 'panel').dataset.state;
const status = (element: AIFormFillElement) => part(element, 'status').textContent;
const field = (name: string) => document.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

/** Type `text` into the panel and press the fill button. */
function submit(element: AIFormFillElement, text = 'Ada Lovelace'): void {
  part<HTMLTextAreaElement>(element, 'textarea').value = text;
  part<HTMLButtonElement>(element, 'submit').click();
}

/** Drain the microtask queue, which is all the mock provider needs. */
async function settle(): Promise<void> {
  for (let index = 0; index < 20; index++) await Promise.resolve();
}

beforeEach(() => {
  document.body.innerHTML = '';
  FakeSpeechRecognition.instances = [];
});

afterEach(() => {
  delete (window as any).SpeechRecognition;
  vi.useRealTimers();
});

describe('<ai-form-fill>', () => {
  it('resolves the form from "for" and from an enclosing form', () => {
    expect(page().controller).not.toBeNull();

    const nested = mount(
      `<form id="contact"><input name="name" /><ai-form-fill></ai-form-fill></form>`,
    );

    expect(nested.controller).not.toBeNull();
  });

  it('says so when no form resolves', () => {
    const element = mount(`${FORM}<ai-form-fill for="#missing"></ai-form-fill>`);

    expect(element.controller).toBeNull();
    expect(status(element)).toBe('No form found for <ai-form-fill>.');
  });

  it('asks for text when the box is empty', () => {
    const element = page();

    part<HTMLButtonElement>(element, 'submit').click();

    expect(status(element)).toBe('Type or dictate something first.');
    expect(state(element)).toBe('idle');
  });

  it('goes idle to working to done, and names the fields still required', async () => {
    const element = page();
    const provider = new PendingProvider();
    element.provider = provider;

    submit(element);

    expect(state(element)).toBe('working');
    expect(part(element, 'panel').getAttribute('aria-busy')).toBe('true');
    expect(part<HTMLButtonElement>(element, 'submit').disabled).toBe(true);
    expect(part(element, 'cancel').hidden).toBe(false);
    expect(status(element)).toBe('Filling the form.');

    provider.release(JSON.stringify({ name: 'Ada Lovelace' }));
    await settle();

    expect(state(element)).toBe('done');
    expect(part(element, 'panel').hasAttribute('aria-busy')).toBe(false);
    expect(status(element)).toBe('Filled 1 field. Still needed: Phone.');
    expect(field('name').value).toBe('Ada Lovelace');
    expect(part(element, 'undo').hidden).toBe(false);
  });

  it('lists the fields whose value could not be used', async () => {
    const element = mount(`
      <form id="contact">
        <label for="colour">Favourite colour</label>
        <select id="colour" name="colour"><option value="">-</option><option>Red</option></select>
      </form>
      <ai-form-fill for="#contact"></ai-form-fill>`);
    element.provider = new MockAIProvider(JSON.stringify({ colour: 'purple' }));

    submit(element);
    await settle();

    expect(status(element)).toBe('Nothing matched the form.');
    expect(part(element, 'summary').hidden).toBe(false);
    expect(part(element, 'summary').textContent).toBe('Favourite colour: no option matched.');
  });

  it('restores the previous values on undo', async () => {
    const element = page('', JSON.stringify({ name: 'Ada Lovelace' }));
    field('name').value = 'Grace Hopper';

    submit(element);
    await settle();
    expect(field('name').value).toBe('Ada Lovelace');

    part<HTMLButtonElement>(element, 'undo').click();

    expect(field('name').value).toBe('Grace Hopper');
    expect(state(element)).toBe('idle');
    expect(status(element)).toBe('Fill undone.');
    expect(part(element, 'summary').hidden).toBe(true);
  });

  it('words each failure by its error class and announces it', async () => {
    const element = page();
    const provider = new FailingProvider();
    element.provider = provider;

    provider.failure = new ProviderError('down', { provider: 'ollama' });
    submit(element);
    await settle();
    expect(state(element)).toBe('error');
    expect(status(element)).toBe('Could not reach ollama.');
    expect(part(element, 'status').getAttribute('role')).toBe('alert');
    expect(part(element, 'undo').hidden).toBe(true);
    expect(part<HTMLButtonElement>(element, 'submit').disabled).toBe(false);

    provider.failure = new ProviderError('nope', { provider: 'ollama', status: 401 });
    submit(element);
    await settle();
    expect(status(element)).toBe('ollama answered with HTTP 401.');

    provider.failure = new Error('boom');
    submit(element);
    await settle();
    expect(status(element)).toBe('Something went wrong. Try again.');

    // An empty model answer is what ResponseParseError is thrown for.
    element.provider = new MockAIProvider('');
    submit(element);
    await settle();
    expect(status(element)).toBe('The AI answer could not be read. Try again.');
    expect(part(element, 'status').getAttribute('role')).toBe('alert');
  });

  it('writes nothing before Apply and applies only the checked rows', async () => {
    const element = page('review', JSON.stringify({ name: 'Ada Lovelace', phone: '0151 234' }));

    submit(element);
    await settle();

    expect(state(element)).toBe('review');
    expect(status(element)).toBe('Check the values, then apply.');
    expect(field('name').value).toBe('');
    expect(field('phone').value).toBe('');

    const rows = element.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="review-check"]');
    expect(rows.length).toBe(2);
    expect(part(element, 'review-label').textContent).toBe('Full name');
    expect(part(element, 'review-value').textContent).toBe('Ada Lovelace');

    rows[1].checked = false;
    part<HTMLButtonElement>(element, 'apply').click();

    expect(state(element)).toBe('done');
    expect(field('name').value).toBe('Ada Lovelace');
    expect(field('phone').value).toBe('');
  });

  it('drops the reviewed values on Discard', async () => {
    const element = page('review', JSON.stringify({ name: 'Ada Lovelace' }));

    submit(element);
    await settle();
    part<HTMLButtonElement>(element, 'discard').click();

    expect(state(element)).toBe('idle');
    expect(field('name').value).toBe('');
    expect(part<HTMLTextAreaElement>(element, 'textarea').value).toBe('Ada Lovelace');
    expect(part(element, 'summary').hidden).toBe(true);
  });

  it('shows the microphone only when the browser can dictate', () => {
    expect(part(page('voice'), 'mic').hidden).toBe(true);

    (window as any).SpeechRecognition = FakeSpeechRecognition;

    expect(part(page('voice'), 'mic').hidden).toBe(false);
    expect(part(page(), 'mic').hidden).toBe(true);
  });

  it('fills after the silence auto-stop, so one gesture is enough', async () => {
    vi.useFakeTimers();
    (window as any).SpeechRecognition = FakeSpeechRecognition;
    const element = page('voice', JSON.stringify({ name: 'Ada Lovelace' }));

    part<HTMLButtonElement>(element, 'mic').click();

    expect(state(element)).toBe('listening');
    expect(part(element, 'mic').getAttribute('aria-pressed')).toBe('true');
    expect(status(element)).toBe('Listening. Pause for a moment to fill the form.');

    FakeSpeechRecognition.instances.at(-1)!.emit('Ada Lovelace');
    expect(part<HTMLTextAreaElement>(element, 'textarea').value).toBe('Ada Lovelace');

    await vi.advanceTimersByTimeAsync(1500);
    await settle();

    expect(state(element)).toBe('done');
    expect(field('name').value).toBe('Ada Lovelace');
  });

  it('fills on Ctrl+Enter in the text box', async () => {
    const element = page('', JSON.stringify({ name: 'Ada Lovelace' }));
    const textarea = part<HTMLTextAreaElement>(element, 'textarea');
    textarea.value = 'Ada Lovelace';

    textarea.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }),
    );
    await settle();

    expect(field('name').value).toBe('Ada Lovelace');
  });

  it('takes wording from the strings property', () => {
    const element = page();

    element.strings = { fill: 'Los geht es', label: 'Formular ausfüllen' };

    expect(part(element, 'submit').textContent).toBe('Los geht es');
    expect(part(element, 'label').textContent).toBe('Formular ausfüllen');
    expect(element.strings.undo).toBe('Undo');
  });

  it('marks filled fields with data-aff-filled for a moment', async () => {
    vi.useFakeTimers();
    const element = page('', JSON.stringify({ name: 'Ada Lovelace' }));

    submit(element);
    await settle();
    expect(field('name').hasAttribute('data-aff-filled')).toBe(true);

    await vi.advanceTimersByTimeAsync(1500);

    expect(field('name').hasAttribute('data-aff-filled')).toBe(false);
  });

  it('never submits the form it sits in', async () => {
    const element = mount(
      `<form id="contact"><input name="name" /><ai-form-fill></ai-form-fill></form>`,
    );
    element.provider = new MockAIProvider(JSON.stringify({ name: 'Ada Lovelace' }));
    const submitted = vi.fn();
    document.querySelector('form')!.addEventListener('submit', submitted);

    for (const button of element.shadowRoot!.querySelectorAll('button')) {
      expect(button.type).toBe('button');
      button.click();
    }
    submit(element);
    await settle();

    expect(submitted).not.toHaveBeenCalled();
    expect(field('name').value).toBe('Ada Lovelace');
  });
});
