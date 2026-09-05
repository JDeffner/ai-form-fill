import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDictation, isDictationSupported } from '../../lib/voice/dictation';

/** One phrase of a fake `result` event: the text and whether it is final. */
type Phrase = [text: string, isFinal: boolean];

/**
 * Stand-in for the browser's `SpeechRecognition`. jsdom has none, so the tests
 * install this on `window` and drive the events by hand.
 */
class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  lang = '';
  continuous = false;
  interimResults = false;
  startCalls = 0;
  stopCalls = 0;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start() {
    this.startCalls++;
  }

  /** The real engine fires `end` after `stop()`; so does this one. */
  stop() {
    this.stopCalls++;
    this.end();
  }

  /** Fire a `result` event carrying every phrase of the session. */
  emit(...phrases: Phrase[]) {
    const results = phrases.map(([text, isFinal]) =>
      Object.assign([{ transcript: text }], { isFinal }),
    );
    this.onresult?.({ results });
  }

  /** Fire an `error` event with a Web Speech error code. */
  fail(error: string, message = '') {
    this.onerror?.({ error, message });
  }

  /** Fire an `end` event, as the engine does when it stops on its own. */
  end() {
    this.onend?.();
  }
}

/** The engine instance the controller created for the current session. */
function engine(): FakeSpeechRecognition {
  const last = FakeSpeechRecognition.instances.at(-1);
  if (!last) throw new Error('No SpeechRecognition instance was created.');
  return last;
}

beforeEach(() => {
  FakeSpeechRecognition.instances = [];
  (window as any).SpeechRecognition = FakeSpeechRecognition;
});

afterEach(() => {
  delete (window as any).SpeechRecognition;
  delete (window as any).webkitSpeechRecognition;
  vi.useRealTimers();
});

describe('isDictationSupported', () => {
  it('is true when the unprefixed API exists', () => {
    expect(isDictationSupported()).toBe(true);
  });

  it('is true when only the webkit-prefixed API exists', () => {
    delete (window as any).SpeechRecognition;
    (window as any).webkitSpeechRecognition = FakeSpeechRecognition;

    expect(isDictationSupported()).toBe(true);
  });

  it('is false without the API, and createDictation then throws', () => {
    delete (window as any).SpeechRecognition;

    expect(isDictationSupported()).toBe(false);
    expect(() => createDictation()).toThrow(/Web Speech API/);
  });
});

describe('createDictation session', () => {
  it('configures the engine for continuous interim recognition', () => {
    createDictation({ lang: 'de-DE' }).start();

    expect(engine().lang).toBe('de-DE');
    expect(engine().continuous).toBe(true);
    expect(engine().interimResults).toBe(true);
    expect(engine().startCalls).toBe(1);
  });

  it('falls back to the document language, then to the navigator language', () => {
    createDictation().start();
    expect(engine().lang).toBe(navigator.language);

    document.documentElement.lang = 'fr-FR';
    createDictation().start();
    expect(engine().lang).toBe('fr-FR');
    document.documentElement.lang = '';
  });

  it('honours interim: false', () => {
    createDictation({ interim: false }).start();

    expect(engine().interimResults).toBe(false);
  });

  it('ignores start() while listening', () => {
    const dictation = createDictation();
    dictation.start();
    dictation.start();

    expect(FakeSpeechRecognition.instances).toHaveLength(1);
    expect(dictation.listening).toBe(true);
  });

  it('ignores stop() while idle', () => {
    const onEnd = vi.fn();
    createDictation({ onEnd }).stop();

    expect(FakeSpeechRecognition.instances).toHaveLength(0);
    expect(onEnd).not.toHaveBeenCalled();
  });
});

describe('transcript assembly', () => {
  it('reports the full transcript so far, finals before the interim part', () => {
    const onText = vi.fn();
    createDictation({ onText, silenceMs: 0 }).start();

    engine().emit(['hello ', false]);
    engine().emit(['hello there', true]);
    engine().emit(['hello there', true], [' how are you', false]);

    expect(onText.mock.calls).toEqual([
      ['hello', false],
      ['hello there', true],
      ['hello there how are you', false],
    ]);
  });

  it('clears the transcript when a new session starts', () => {
    const onText = vi.fn();
    const onEnd = vi.fn();
    const dictation = createDictation({ onText, onEnd, silenceMs: 0 });

    dictation.start();
    engine().emit(['first', true]);
    dictation.stop();
    expect(onEnd).toHaveBeenCalledWith('first');

    dictation.start();
    engine().emit(['second', true]);

    expect(onText).toHaveBeenLastCalledWith('second', true);
  });
});

describe('silence auto-stop', () => {
  it('stops after the silence window and ends the session', () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    const dictation = createDictation({ onEnd, silenceMs: 1500 });
    dictation.start();

    engine().emit(['book a table', true]);
    vi.advanceTimersByTime(1499);
    expect(dictation.listening).toBe(true);

    vi.advanceTimersByTime(1);

    expect(engine().stopCalls).toBe(1);
    expect(dictation.listening).toBe(false);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('book a table');
  });

  it('restarts the silence window on every result', () => {
    vi.useFakeTimers();
    const dictation = createDictation({ silenceMs: 1000 });
    dictation.start();

    engine().emit(['one', true]);
    vi.advanceTimersByTime(900);
    engine().emit(['one', true], ['two', false]);
    vi.advanceTimersByTime(900);
    expect(dictation.listening).toBe(true);

    vi.advanceTimersByTime(100);
    expect(dictation.listening).toBe(false);
  });

  it('keeps listening while the transcript is still empty', () => {
    vi.useFakeTimers();
    const dictation = createDictation({ silenceMs: 1000 });
    dictation.start();

    engine().emit(['   ', false]);
    vi.advanceTimersByTime(1000);
    expect(dictation.listening).toBe(true);

    engine().emit(['hello', true]);
    vi.advanceTimersByTime(1000);
    expect(dictation.listening).toBe(false);
  });

  it('never auto-stops when silenceMs is 0', () => {
    vi.useFakeTimers();
    const dictation = createDictation({ silenceMs: 0 });
    dictation.start();

    engine().emit(['still talking', true]);
    vi.advanceTimersByTime(60_000);

    expect(dictation.listening).toBe(true);
  });
});

describe('onEnd', () => {
  it('fires exactly once, even when the engine also reports end', () => {
    const onEnd = vi.fn();
    const dictation = createDictation({ onEnd, silenceMs: 0 });
    dictation.start();

    engine().emit(['done', true]);
    dictation.stop();
    engine().end();
    dictation.stop();

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('done');
  });

  it('fires when the engine ends on its own', () => {
    const onEnd = vi.fn();
    const dictation = createDictation({ onEnd, silenceMs: 0 });
    dictation.start();

    engine().end();

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('');
    expect(dictation.listening).toBe(false);
  });
});

describe('errors', () => {
  it('reports the error code and still ends the session', () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    const dictation = createDictation({ onError, onEnd, silenceMs: 0 });
    dictation.start();

    engine().fail('not-allowed', 'Permission denied');
    expect(onError).toHaveBeenCalledWith({ error: 'not-allowed', message: 'Permission denied' });
    expect(onEnd).not.toHaveBeenCalled();

    engine().end();

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('');
    expect(dictation.listening).toBe(false);
  });

  it('treats no-speech as a report and keeps whatever was collected', () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    const dictation = createDictation({ onError, onEnd, silenceMs: 0 });
    dictation.start();

    engine().emit(['hello', true]);
    engine().fail('no-speech');
    engine().end();

    expect(onError).toHaveBeenCalledWith({ error: 'no-speech', message: '' });
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('hello');
  });
});
