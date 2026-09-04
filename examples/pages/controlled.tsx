/**
 * React demo: the form uses controlled components (value + onChange), and
 * `fillForm` still updates React state, because values are applied through
 * the native prototype setters before `input` events are dispatched.
 */
import { useRef, useState } from 'react';
import { AIFormFill } from '../../lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Feedback, TextField, PageHeader, type Kind } from '../components/fields';

const aff = new AIFormFill('ollama', { debug: true });
const EMPTY = { firstName: '', lastName: '', email: '' };

export function Controlled() {
  const [values, setValues] = useState(EMPTY);
  const [text, setText] = useState(
    'Hi, I am Ada Lovelace, you can reach me at ada@analytical.engine',
  );
  const [status, setStatus] = useState<{ text: string; kind: Kind } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const fill = async () => {
    setStatus({ text: 'Filling...', kind: 'info' });
    try {
      const result = await aff.fillForm(formRef.current!, text);
      setStatus({
        text: `Filled: ${result.filled.map((f) => f.key).join(', ') || '(none)'}`,
        kind: 'success',
      });
    } catch (error) {
      setStatus({ text: `Error: ${String(error)}`, kind: 'error' });
    }
  };

  return (
    <>
      <PageHeader title="Controlled components still update">
        Values are written through the native prototype setters, so React state updates on an AI
        fill exactly like on typing.
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Controlled form</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <Button className="justify-self-start" onClick={fill}>
            Fill with AI (Ollama)
          </Button>
          {status && <Feedback kind={status.kind}>{status.text}</Feedback>}
          <form ref={formRef} className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
            <TextField
              label="First name"
              name="firstName"
              value={values.firstName}
              onChange={set('firstName')}
            />
            <TextField
              label="Last name"
              name="lastName"
              value={values.lastName}
              onChange={set('lastName')}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={set('email')}
            />
          </form>
          <pre className="rounded-md bg-muted p-3 font-mono text-xs">
            React state: {JSON.stringify(values)}
          </pre>
        </CardContent>
      </Card>
    </>
  );
}
