/**
 * React demo: `useFormFill` owns the controller, `formRef` goes on the form,
 * and `state` drives the button. The inputs are controlled (value + onChange)
 * and still update, because values are written through the native prototype
 * setters before the `input` event is dispatched.
 */
import { useState } from 'react';
import { useFormFill } from '../../lib/react/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CodeBlock, Feedback, PageHeader, TextField } from '../components/fields';

const EMPTY = { firstName: '', lastName: '', email: '', city: '' };

const SAMPLE = 'Hi, I am Ada Lovelace from London, you can reach me at ada@analytical.engine';

const CODE = `const { formRef, fill, state, result } = useFormFill({ debug: true });

<button disabled={state === 'working'} onClick={() => fill(text)}>Fill</button>
<form ref={formRef}>...</form>`;

export function ReactHook() {
  const [values, setValues] = useState(EMPTY);
  const [text, setText] = useState(SAMPLE);
  const { formRef, fill, cancel, undo, state, result, error } = useFormFill({ debug: true });

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <PageHeader title="One hook, controlled inputs included">
        <code>useFormFill</code> from <code>ai-form-fill/react</code> creates the controller when
        the form mounts and destroys it when it unmounts. React state updates on an AI fill exactly
        like on typing.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Controlled form</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex gap-2">
              <Button disabled={state === 'working'} onClick={() => void fill(text)}>
                {state === 'working' ? 'Filling...' : 'Fill with AI'}
              </Button>
              <Button variant="outline" disabled={state !== 'working'} onClick={cancel}>
                Cancel
              </Button>
              <Button variant="outline" disabled={!result} onClick={undo}>
                Undo
              </Button>
            </div>
            {state === 'error' && <Feedback kind="error">{String(error)}</Feedback>}
            {state === 'done' && result && (
              <Feedback kind="success">
                Filled {result.filled.length} field(s)
                {result.skipped.length > 0 && `, skipped ${result.skipped.length}`}.
              </Feedback>
            )}

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
              <TextField label="City" name="city" value={values.city} onChange={set('city')} />
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>React state</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock>{JSON.stringify(values, null, 2)}</CodeBlock>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>The whole wiring</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock>{CODE}</CodeBlock>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
