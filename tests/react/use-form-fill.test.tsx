/**
 * The React binding, driven with `react-dom/client` and `act` directly: the
 * hook is small enough that a testing library would only add a dependency.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useFormFill, type UseFormFillResult } from '../../lib/react/index';
import type { AIProvider } from '../../lib/providers/provider';
import type { ChatRequest, ChatResponse } from '../../lib/core/types';
import { MockAIProvider } from '../mock-provider';

// React 19 refuses to run `act` unless this flag is set, and vitest's jsdom
// environment does not set it.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OK = JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com' });

/** A provider whose answer is released by hand, so a fill can be caught mid-flight. */
class PendingProvider extends MockAIProvider {
  release!: (content: string) => void;
  fail!: (error: Error) => void;
  aborted = false;
  private pending = new Promise<string>((resolve, reject) => {
    this.release = resolve;
    this.fail = reject;
  });

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const content = await new Promise<string>((resolve, reject) => {
      this.pending.then(resolve, reject);
      request.signal?.addEventListener('abort', () => {
        this.aborted = true;
        reject(new Error('aborted'));
      });
    });
    return { content, model: 'mock-model' };
  }
}

let container: HTMLDivElement;
let root: Root;
let hook: UseFormFillResult;
let states: string[];

/** A page whose form can be taken away without unmounting the hook. */
function Demo({ provider, withForm }: { provider: AIProvider; withForm: boolean }) {
  hook = useFormFill({ provider });
  states.push(hook.state);
  return withForm ? (
    <form ref={hook.formRef}>
      <input type="text" name="name" />
      <input type="email" name="email" />
    </form>
  ) : null;
}

function render(provider: AIProvider, withForm = true) {
  act(() => root.render(<Demo provider={provider} withForm={withForm} />));
}

beforeEach(() => {
  states = [];
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useFormFill', () => {
  it('goes idle -> working -> done and writes the values', async () => {
    const provider = new PendingProvider(OK);
    render(provider);
    expect(hook.state).toBe('idle');

    let filling!: Promise<unknown>;
    act(() => {
      filling = hook.fill('Ada Lovelace, ada@example.com');
    });
    expect(hook.state).toBe('working');

    provider.release(OK);
    await act(async () => {
      await filling;
    });

    expect(states).toEqual(['idle', 'working', 'done']);
    expect(hook.result?.filled.map((field) => field.key)).toEqual(['name', 'email']);
    expect(container.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe('Ada Lovelace');
    expect(hook.error).toBeNull();
  });

  it('reports a failed fill as the error state instead of rejecting', async () => {
    const provider = new PendingProvider(OK);
    render(provider);

    let filling!: Promise<unknown>;
    act(() => {
      filling = hook.fill('Ada Lovelace');
    });
    provider.fail(new Error('provider is down'));
    await act(async () => {
      expect(await filling).toBeNull();
    });

    expect(hook.state).toBe('error');
    expect(String(hook.error)).toContain('provider is down');
    expect(hook.result).toBeNull();
  });

  it('resolves to null and stays idle while no form is mounted', async () => {
    render(new MockAIProvider(OK), false);

    expect(await hook.fill('anything')).toBeNull();
    expect(hook.state).toBe('idle');
    expect(hook.applyExtracted({}, [])).toBeNull();
    await expect(hook.extract('anything')).rejects.toThrow('before the form mounted');
  });

  it('aborts an in-flight fill when the form unmounts', async () => {
    const provider = new PendingProvider(OK);
    render(provider);

    let filling!: Promise<unknown>;
    act(() => {
      filling = hook.fill('Ada Lovelace');
    });
    expect(hook.state).toBe('working');

    render(provider, false);
    expect(provider.aborted).toBe(true);
    expect(await filling).toBeNull();
    expect(hook.state).toBe('idle');
  });
});
