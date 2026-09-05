/**
 * Controller demo: `createFormFill` wires the textarea, the button and the
 * form together. `onState` drives the status line and the Undo button, and the
 * `FillResult` is shown field by field.
 */
import { useEffect, useRef, useState } from 'react';
import { createFormFill, type FormFillController, type FormFillSnapshot } from '../../lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DemoForm, readForm } from '../components/demo-form';
import { Feedback, KIND_TEXT, PageHeader, type Kind } from '../components/fields';
import { cn } from '@/lib/utils';

const SAMPLE = `Hi, my name is Jim Raynor. You can reach me at jim.dope@starcraft.com or call me at +1-551-143-4567. I live at 1st Main Street in NYC, USA. I'm a software developer passionate about technology and music. I would like to subscribe to the newsletter and enable notifications. I'm male.`;

const IDLE: FormFillSnapshot = { state: 'idle', result: null, error: null };

const STATUS: Record<FormFillSnapshot['state'], { text: string; kind: Kind }> = {
  idle: { text: 'Ready.', kind: 'info' },
  working: { text: 'Asking the model...', kind: 'info' },
  done: { text: 'Done.', kind: 'success' },
  error: { text: 'The fill failed.', kind: 'error' },
};

export function Controller() {
  const [snapshot, setSnapshot] = useState<FormFillSnapshot>(IDLE);
  const controller = useRef<FormFillController | null>(null);

  useEffect(() => {
    controller.current = createFormFill({
      form: '#demo-form',
      source: '#aff-text',
      trigger: '#aff-text-button',
      onState: setSnapshot,
      debug: true,
    });
    return () => {
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  const { state, result, error } = snapshot;
  const status = STATUS[state];

  return (
    <>
      <PageHeader title="One call to wire a form">
        <code>createFormFill()</code> resolves the textarea, the button and the form, reports its
        state through <code>onState</code>, and gives you <code>undo()</code> for free. No markup,
        no framework, no styling.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="grid gap-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Source text</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Textarea id="aff-text" rows={10} defaultValue={SAMPLE} />
              <div className="flex gap-2">
                <Button id="aff-text-button" disabled={state === 'working'}>
                  Fill form
                </Button>
                <Button
                  variant="outline"
                  disabled={state !== 'working'}
                  onClick={() => controller.current?.cancel()}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  disabled={!result}
                  onClick={() => controller.current?.undo()}
                >
                  Undo
                </Button>
              </div>
              <Feedback kind={status.kind}>
                {state === 'error' ? `${status.text} ${String(error)}` : status.text}
              </Feedback>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FillResult</CardTitle>
            </CardHeader>
            <CardContent>{result ? <ResultTable result={result} /> : <Empty />}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoForm
              id="demo-form"
              onSubmit={(e) => {
                e.preventDefault();
                console.log('Form data:', readForm(e.currentTarget));
                alert('Form submitted, see the console for the data.');
              }}
            >
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                  Submit
                </Button>
                <Button type="reset" variant="outline">
                  Clear
                </Button>
              </div>
            </DemoForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Empty() {
  return (
    <p className="text-sm text-muted-foreground">
      Fill the form to see which fields were written, which values were skipped and which required
      fields are still empty.
    </p>
  );
}

/** The three parts of a FillResult a user of the library cares about. */
function ResultTable({ result }: { result: NonNullable<FormFillSnapshot['result']> }) {
  const rows: { key: string; outcome: string; kind: Kind }[] = [
    ...result.filled.map((field) => ({
      key: field.key,
      outcome: String(field.value),
      kind: 'success' as Kind,
    })),
    ...result.skipped.map((field) => ({
      key: field.key,
      outcome: `skipped: ${field.reason}`,
      kind: 'warning' as Kind,
    })),
    ...result.missingRequired.map((key) => ({
      key,
      outcome: 'required, still empty',
      kind: 'error' as Kind,
    })),
  ];

  if (rows.length === 0) return <Empty />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-2 font-medium">Field</th>
          <th className="pb-2 font-medium">Outcome</th>
        </tr>
      </thead>
      <tbody className="font-mono text-xs">
        {rows.map((row, i) => (
          <tr key={`${row.key}-${i}`} className="border-b last:border-0">
            <td className="py-1.5 pr-4 align-top">{row.key}</td>
            <td className={cn('py-1.5 align-top break-all', KIND_TEXT[row.kind])}>{row.outcome}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
