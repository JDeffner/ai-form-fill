/**
 * Advanced demo: provider and model switching, single-field fill, and the
 * `aff:*` lifecycle events in a log. The log listens on the form instead of
 * wrapping the fill call, which is what a real page would do.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AIFormFill,
  OllamaProvider,
  OpenAICompatibleProvider,
  type AIProvider,
} from '../../lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { DemoForm, readForm } from '../components/demo-form';
import { Feedback, Field, KIND_TEXT, PageHeader, type Kind } from '../components/fields';
import { cn } from '@/lib/utils';

// The remote providers point at the dev-server passthrough proxies
// (mock/*.mock.ts) so API keys stay server-side. In production this would be
// your own proxy URL (see examples/server).
const PROVIDERS: { label: string; provider: AIProvider }[] = [
  { label: 'Local Ollama', provider: new OllamaProvider() },
  { label: 'OpenAI', provider: new OpenAICompatibleProvider('openai', { baseUrl: '/api/openai' }) },
  {
    label: 'Perplexity',
    provider: new OpenAICompatibleProvider('perplexity', { baseUrl: '/api/perplexity' }),
  },
  {
    label: 'OpenRouter',
    provider: new OpenAICompatibleProvider('openrouter', { baseUrl: '/api/openrouter' }),
  },
];

const SAMPLE = `Hi, my name is John Doe. You can reach me at john.doe@example.com or call me at +1-555-123-4567. I live at 123 Main Street in New York, USA. I was born on March 15, 1990. I'm looking for a full-time position as a senior software developer and can start on January 1, 2026. Best time to reach me is around 2:30 PM.`;

type Status = { text: string; kind?: Kind };
type LogEntry = { time: string; text: string; kind?: Kind };

export function Advanced() {
  const aff = useRef(new AIFormFill(PROVIDERS[0].provider, { debug: true })).current;
  const formRef = useRef<HTMLFormElement>(null);

  const [providerName, setProviderName] = useState(PROVIDERS[0].provider.getName());
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [text, setText] = useState(SAMPLE);
  const [status, setStatus] = useState<Status>({ text: 'Ready' });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selectedField, setSelectedField] = useState<HTMLElement | null>(null);

  const logLine = useCallback(
    (text: string, kind?: Kind) =>
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), text, kind }]),
    [],
  );
  const fail = (text: string, error: unknown) => {
    setStatus({ text, kind: 'error' });
    logLine(`${text}: ${String(error)}`, 'error');
  };

  // Switching the provider reloads its model list.
  useEffect(() => {
    const entry = PROVIDERS.find((p) => p.provider.getName() === providerName)!;
    aff.setProvider(entry.provider);
    setModels([]);
    setModel('');
    setStatus({ text: 'Loading models...', kind: 'info' });
    aff
      .getAvailableModels()
      .then((list) => {
        setModels(list);
        setModel(list.includes(aff.getSelectedModel()) ? aff.getSelectedModel() : (list[0] ?? ''));
        setStatus({ text: `${entry.label}: ${list.length} models`, kind: 'success' });
        logLine(`${entry.label} models: ${list.join(', ')}`);
      })
      .catch((error) => fail('Could not load models. Is the service running?', error));
  }, [aff, providerName]);

  // The library reports every step as a bubbling event on the form, so the log
  // needs no wrapper around the fill call. `fillField` dispatches
  // `aff:field-filled` on the field it wrote, which bubbles to the form too.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onStart = (event: HTMLElementEventMap['aff:start']) =>
      logLine(`aff:start - ${event.detail.text.length} characters sent`);
    const onFieldFilled = (event: HTMLElementEventMap['aff:field-filled']) =>
      logLine(`aff:field-filled - ${event.detail.key} = ${String(event.detail.value)}`);
    const onDone = (event: HTMLElementEventMap['aff:done']) => {
      const { filled, skipped, unmatchedKeys, missingRequired } = event.detail;
      logLine(
        `aff:done - ${filled.length} filled, ${skipped.length} skipped, ` +
          `${unmatchedKeys.length} unmatched, ${missingRequired.length} required still empty`,
        'success',
      );
    };
    const onError = (event: HTMLElementEventMap['aff:error']) =>
      logLine(`aff:error - ${String(event.detail.error)}`, 'error');

    form.addEventListener('aff:start', onStart);
    form.addEventListener('aff:field-filled', onFieldFilled);
    form.addEventListener('aff:done', onDone);
    form.addEventListener('aff:error', onError);
    return () => {
      form.removeEventListener('aff:start', onStart);
      form.removeEventListener('aff:field-filled', onFieldFilled);
      form.removeEventListener('aff:done', onDone);
      form.removeEventListener('aff:error', onError);
    };
  }, [logLine]);

  const initialize = async () => {
    if (!model) return setStatus({ text: 'Select a model first', kind: 'warning' });
    const ok = await aff.setSelectedModel(model);
    if (!ok) return setStatus({ text: `Model "${model}" is not offered`, kind: 'error' });
    setStatus({ text: `Using ${providerName} / ${model}`, kind: 'success' });
    logLine(`Initialized with provider '${providerName}' and model '${model}'`, 'success');
  };

  const testConnection = async () => {
    setStatus({ text: 'Testing provider availability...', kind: 'info' });
    const available = await aff.isProviderAvailable();
    const text = available ? 'Provider is available' : 'Provider is unavailable';
    setStatus({ text, kind: available ? 'success' : 'error' });
    logLine(text, available ? 'success' : 'error');
  };

  const fillForm = async () => {
    if (!text.trim()) return setStatus({ text: 'Enter some text first', kind: 'warning' });
    setStatus({ text: 'Filling form...', kind: 'info' });
    try {
      const result = await aff.fillForm(formRef.current!, text);
      setStatus({ text: `Filled ${result.filled.length} field(s)`, kind: 'success' });
    } catch (error) {
      fail('Error filling form', error);
    }
  };

  const fillField = async () => {
    if (!selectedField)
      return setStatus({ text: 'Click a field in the form first', kind: 'warning' });
    setStatus({ text: 'Filling field...', kind: 'info' });
    try {
      const outcome = await aff.fillField(selectedField);
      setStatus(
        outcome
          ? { text: 'Field filled', kind: 'success' }
          : { text: 'Model produced no usable value', kind: 'warning' },
      );
      if (!outcome) logLine('No usable value for this field', 'warning');
    } catch (error) {
      fail('Error filling field', error);
    }
  };

  const fieldName = (el: HTMLElement) =>
    `${el.getAttribute('name') || el.id} (${(el as HTMLInputElement).type || el.tagName.toLowerCase()})`;

  return (
    <>
      <PageHeader title="Provider switching and full results">
        Pick a provider and model, fill the whole form or a single field, and follow the{' '}
        <code>aff:start</code>, <code>aff:field-filled</code>, <code>aff:done</code> and{' '}
        <code>aff:error</code> events in the log. The log listens on the form; nothing wraps the
        fill call.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="grid gap-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Provider" htmlFor="provider">
                  <NativeSelect
                    id="provider"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  >
                    {PROVIDERS.map((p) => (
                      <NativeSelectOption key={p.provider.getName()} value={p.provider.getName()}>
                        {p.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Model" htmlFor="model">
                  <NativeSelect id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                    {models.length === 0 && (
                      <NativeSelectOption value="">No models</NativeSelectOption>
                    )}
                    {models.map((m) => (
                      <NativeSelectOption key={m} value={m}>
                        {m}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="flex gap-2">
                <Button onClick={initialize}>Initialize</Button>
                <Button variant="outline" onClick={testConnection}>
                  Test connection
                </Button>
              </div>
              <Feedback kind={status.kind ?? 'info'}>{status.text}</Feedback>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fill from text</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
              <Button className="justify-self-start" onClick={fillForm}>
                Fill form
              </Button>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Selected field:{' '}
                <span className="font-mono text-foreground">
                  {selectedField ? fieldName(selectedField) : 'none (click a field in the form)'}
                </span>
              </p>
              <Button variant="secondary" className="justify-self-start" onClick={fillField}>
                Fill selected field
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoForm
              ref={formRef}
              extended
              onFocus={(e) => {
                const t = e.target;
                if (
                  t instanceof HTMLInputElement ||
                  t instanceof HTMLTextAreaElement ||
                  t instanceof HTMLSelectElement
                )
                  setSelectedField(t);
              }}
              onSubmit={(e) => {
                e.preventDefault();
                setStatus({ text: 'Form submitted', kind: 'success' });
                logLine(`Form data: ${JSON.stringify(readForm(e.currentTarget), null, 2)}`);
              }}
            >
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                  Submit
                </Button>
                <Button type="reset" variant="outline" onClick={() => logLine('Form cleared')}>
                  Clear
                </Button>
              </div>
            </DemoForm>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Debug log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto rounded-md bg-muted p-4 font-mono text-xs">
              {log.length === 0 && (
                <p className="text-muted-foreground">
                  The lifecycle events of a fill will appear here.
                </p>
              )}
              {log.map((entry, i) => (
                <p
                  key={i}
                  className={cn('whitespace-pre-wrap', entry.kind && KIND_TEXT[entry.kind])}
                >
                  <span className="text-muted-foreground">[{entry.time}]</span> {entry.text}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
