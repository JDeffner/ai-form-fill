/**
 * Voice demo: `createDictation` (from `ai-form-fill/voice`) turns speech into
 * text, and the transcript goes into the same fill call as typed input. One
 * gesture: click the microphone, speak, and the pause at the end stops the
 * dictation and fills the form. The library core stays text-in only.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { createFormFill, type FormFillController } from '../../lib/index';
import { createDictation, isDictationSupported, type Dictation } from '../../lib/voice/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DemoForm } from '../components/demo-form';
import { PageHeader } from '../components/fields';

const supported = isDictationSupported();

export function Voice() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState(
    supported
      ? 'Dictation uses the Web Speech API (Chromium and Safari).'
      : 'This browser does not support the Web Speech API. Type instead.',
  );
  const controller = useRef<FormFillController | null>(null);
  const dictation = useRef<Dictation | null>(null);

  useEffect(() => {
    controller.current = createFormFill({
      form: '#aff-form',
      source: '#aff-text',
      trigger: '#aff-text-button',
      debug: true,
    });
    return () => {
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    // `onText` carries the full transcript so far, interim words included, so
    // the textarea shows the words as they are recognised.
    dictation.current = createDictation({
      onText: setText,
      onEnd: (finalText) => {
        setListening(false);
        if (!finalText) {
          setHint('Nothing was recognised. Try again, or type the text.');
          return;
        }
        setHint('Dictation stopped. Filling the form...');
        void controller.current
          ?.fill(finalText)
          .then(() => setHint('Form filled from the transcript.'));
      },
      onError: (error) => setHint(`Speech recognition error: ${error.error}`),
    });
    return () => {
      dictation.current?.stop();
      dictation.current = null;
    };
  }, []);

  const toggle = () => {
    if (!dictation.current) return;
    if (dictation.current.listening) {
      dictation.current.stop();
      return;
    }
    setText('');
    setListening(true);
    setHint('Listening... stop speaking for a moment and the form fills itself.');
    dictation.current.start();
  };

  return (
    <>
      <PageHeader title="Speak it; the form fills">
        <code>createDictation</code> turns speech into text; the transcript flows into the same{' '}
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
                disabled={!supported}
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
