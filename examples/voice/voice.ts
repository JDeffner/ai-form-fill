/**
 * Voice input demo: the Web Speech API turns speech into text, the text goes
 * into the same `fillForm` call as typed input. The library core stays
 * text-in only.
 */

import { autoInit } from '../../lib/index';

// Standard quick-start wiring: #aff-form + #aff-text + #aff-text-button.
autoInit({ debug: true });

// --- Thin voice layer --------------------------------------------------------

// The Web Speech API is prefixed in Chromium and absent from TS DOM types.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

const SpeechRecognitionImpl =
  (
    window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }
  ).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
    .webkitSpeechRecognition;

const micButton = document.getElementById('mic-button') as HTMLButtonElement;
const micStatus = document.getElementById('mic-status') as HTMLParagraphElement;
const textArea = document.getElementById('aff-text') as HTMLTextAreaElement;

if (!SpeechRecognitionImpl) {
  micButton.disabled = true;
  micStatus.textContent = 'This browser does not support the Web Speech API - type instead.';
} else {
  const recognition = new SpeechRecognitionImpl();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = false;
  let listening = false;

  recognition.onresult = (event) => {
    const results = Array.from({ length: event.results.length }, (_, i) => event.results[i]);
    const transcript = results.map((result) => result[0].transcript).join(' ');
    textArea.value = transcript.trim();
  };
  recognition.onerror = (event) => {
    micStatus.textContent = `Speech recognition error: ${event.error}`;
  };
  recognition.onend = () => {
    listening = false;
    micButton.textContent = 'Start dictation';
    micStatus.textContent = 'Dictation stopped. Click "Fill Form" to apply the transcript.';
  };

  micButton.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    listening = true;
    textArea.value = '';
    micButton.textContent = 'Stop dictation';
    micStatus.textContent = 'Listening... speak now.';
    recognition.start();
  });
}
