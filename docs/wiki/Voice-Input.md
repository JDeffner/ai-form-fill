# Voice Input

This page covers dictation: the `createDictation` API, the one-gesture flow, browser support, and
what to tell your users about privacy.

Speech is a separate entry point (`ai-form-fill/voice`), so importing the core pulls in no speech
code. It wraps the browser's Web Speech API and produces text. What happens with that text is up to
you.

## The API

```typescript
import { createDictation, isDictationSupported } from 'ai-form-fill/voice';

if (isDictationSupported()) {
  const dictation = createDictation({
    onText: (text) => (textarea.value = text), // full transcript so far
    onEnd: (text) => controller.fill(text), // once, after stop or silence
  });
  micButton.addEventListener('click', () =>
    dictation.listening ? dictation.stop() : dictation.start(),
  );
}
```

`isDictationSupported()` is a function, not a constant, so it is safe to import during server-side
rendering. `createDictation` throws when the browser has no Web Speech API, so guard with it.

### Options

| Option      | Type                                                  | Default                                  | Meaning                                                      |
| ----------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `lang`      | `string`                                              | `<html lang>`, then `navigator.language` | BCP 47 tag for the recogniser, for example `de-DE`           |
| `interim`   | `boolean`                                             | `true`                                   | Report text while the engine is still revising it            |
| `silenceMs` | `number`                                              | `1500`                                   | Auto-stop after this long without a new result; `0` disables |
| `onText`    | `(text: string, isFinal: boolean) => void`            | —                                        | Every result, with the full transcript so far                |
| `onEnd`     | `(finalText: string) => void`                         | —                                        | Once per session, with the trimmed transcript                |
| `onError`   | `(error: { error: string; message: string }) => void` | —                                        | Every recognition error                                      |

### The returned object

| Member      | Type         | Notes                                      |
| ----------- | ------------ | ------------------------------------------ |
| `start()`   | `() => void` | Starts a session and clears the transcript |
| `stop()`    | `() => void` | Ends the session, which makes `onEnd` fire |
| `listening` | `boolean`    | Read-only, true while a session runs       |

One controller can run many sessions. Each `start()` begins with an empty transcript and ends with
exactly one `onEnd` call.

## The one-gesture flow

`onText` reports the full transcript on every result, not the delta, so a text box only has to be
assigned. The silence window restarts with every result, so the user presses once, speaks, and stops
speaking: after 1.5 seconds of silence the session ends and `onEnd` fires. That is the whole
interaction, with no second click.

Set `silenceMs: 0` when you want an explicit stop button instead, and call `stop()` yourself.

```typescript
const dictation = createDictation({
  lang: 'de-DE',
  silenceMs: 2500,
  onText: (text, isFinal) => {
    textarea.value = text;
    textarea.dataset.interim = String(!isFinal);
  },
  onEnd: (text) => {
    if (text) void controller.fill(text);
  },
});
```

`isFinal` is `true` when nothing is pending, so you can render interim words in a lighter colour and
commit them when it flips.

## Browser support

| Browser                      | Web Speech API | Notes                                                       |
| ---------------------------- | -------------- | ----------------------------------------------------------- |
| Chrome, Edge, other Chromium | Yes            | Audio is sent to a Google speech service                    |
| Safari (macOS, iOS)          | Yes            | Prefixed as `webkitSpeechRecognition`, uses Apple's service |
| Firefox                      | No             | `isDictationSupported()` returns `false`                    |

Always keep typing available. The `<ai-form-fill>` element hides the microphone by itself when the
API is missing, so a Firefox user only sees the text box.

## Privacy

The recognition does not run in the library and, in the browsers above, does not run on the device
either: the audio goes to the browser vendor's speech service. That is a data flow your privacy
notice has to mention, next to the provider the text is sent to afterwards. See
[Security and Privacy](Security-and-Privacy).

The user is asked for microphone permission by the browser, per origin. The library never touches
`getUserMedia` itself.

## Errors and permissions

Errors are reported through `onError`, never thrown. The engine ends the session afterwards, and
`onEnd` still fires. The `error` field is a Web Speech error code:

| Code                  | Cause                                       | What to show                                           |
| --------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `not-allowed`         | Microphone permission denied or blocked     | Ask the user to allow the microphone, and offer typing |
| `service-not-allowed` | The speech service was refused              | Same as above                                          |
| `no-speech`           | Nothing was heard                           | "I did not hear anything, try again"                   |
| `audio-capture`       | No microphone available                     | Point at the device settings                           |
| `network`             | The speech service was unreachable          | Offer typing                                           |
| `aborted`             | `stop()` or a page change ended the session | Nothing, this is normal                                |

```typescript
const dictation = createDictation({
  onError: ({ error }) => {
    hint.textContent =
      error === 'not-allowed'
        ? 'Microphone access is blocked. Type the text instead.'
        : 'Dictation failed. Type the text instead.';
  },
  onEnd: (text) => text && controller.fill(text),
});
```

## With the controller

Dictation produces text, the controller consumes it:

```typescript
import { createFormFill } from 'ai-form-fill';
import { createDictation, isDictationSupported } from 'ai-form-fill/voice';

const controller = createFormFill({ form: '#contact' });
const dictation = isDictationSupported()
  ? createDictation({
      onText: (text) => (document.querySelector('#notes').value = text),
      onEnd: (text) => text && controller.fill(text),
    })
  : null;

document.querySelector('#mic').hidden = dictation === null;
document.querySelector('#mic').addEventListener('click', () => dictation?.start());
```

## With the element

The element does all of the above for you. Add `voice`, and `lang` when the page language is not the
speaking language:

```html
<ai-form-fill for="#contact" voice lang="de-DE"></ai-form-fill>
```

The microphone only appears when the browser supports dictation. Press it, speak, stop speaking: the
panel writes the transcript into its text box and starts the fill on its own. `Escape` cancels a
running dictation and throws away what it heard.
