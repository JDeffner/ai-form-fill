/**
 * Voice demo: the Web Speech API turns speech into text, the text goes into
 * the same fill call as typed input (here via `createFormFill`). The library
 * core stays text-in only.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { createFormFill } from '../../lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DemoForm } from '../components/demo-form';
import { PageHeader } from '../components/fields';

// The Web Speech API is prefixed in Chromium and absent from the TS DOM types.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
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

export function Voice() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState(
    SpeechRecognitionImpl
      ? 'Dictation uses the Web Speech API (best supported in Chrome).'
      : 'This browser does not support the Web Speech API. Type instead.',
  );
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const controller = createFormFill({
      form: '#aff-form',
      source: '#aff-text',
      trigger: '#aff-text-button',
      debug: true,
    });
    return () => controller.destroy();
  }, []);

  const toggle = () => {
    if (listening) return recognition.current?.stop();
    const r = new SpeechRecognitionImpl!();
    r.lang = 'en-US';
    r.continuous = true;
    r.onresult = (event) => {
      const parts = Array.from(event.results, (result) => result[0].transcript);
      setText(parts.join(' ').trim());
    };
    r.onerror = (event) => setHint(`Speech recognition error: ${event.error}`);
    r.onend = () => {
      setListening(false);
      setHint('Dictation stopped. Click "Fill form" to apply the transcript.');
    };
    recognition.current = r;
    setText('');
    setListening(true);
    setHint('Listening... speak now.');
    r.start();
  };

  return (
    <>
      <PageHeader title="Speak it; the form fills">
        The Web Speech API turns speech into text; the transcript flows into the same{' '}
        <code>fillForm</code> call. Voice is a thin layer on top of a text-in library.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Speak or type</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant={listening ? 'destructive' : 'default'}
                disabled={!SpeechRecognitionImpl}
                onClick={toggle}
              >
                {listening ? <Square /> : <Mic />}
                {listening ? 'Stop dictation' : 'Start dictation'}
              </Button>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
            <Textarea
              id="aff-text"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Click the microphone and introduce yourself, or type here..."
            />
            <Button id="aff-text-button" variant="secondary" className="justify-self-start">
              Fill form
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoForm id="aff-form" onSubmit={(e) => e.preventDefault()} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
