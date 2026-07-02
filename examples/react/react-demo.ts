/**
 * React demo without a build-time React plugin: React is loaded from a CDN
 * and the UI is written with createElement. The point being proven: the form
 * uses **controlled components** (value + onChange), and `fillForm` updates
 * React state because values are applied through the native prototype
 * setters before dispatching `input` events.
 */

import { AIFormFill, type FillResult } from '../../lib/index';

// CDN ESM builds — no react dependency in this repo.
// @ts-expect-error remote ESM module without local types
import React from 'https://esm.sh/react@18.3.1';
// @ts-expect-error remote ESM module without local types
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';

const h = React.createElement;
const aiFormFill = new AIFormFill('ollama', { debug: true });

function Field(props: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return h(
    'div',
    { className: 'form-group' },
    h('label', { htmlFor: props.name }, props.label),
    h('input', {
      id: props.name,
      name: props.name,
      type: props.type ?? 'text',
      value: props.value,
      onChange: (event: { target: { value: string } }) => props.onChange(event.target.value),
    }),
  );
}

function App() {
  const [values, setValues] = React.useState({ firstName: '', lastName: '', email: '' });
  const [text, setText] = React.useState(
    'Hi, I am Ada Lovelace, you can reach me at ada@analytical.engine',
  );
  const [status, setStatus] = React.useState('');
  const formRef = React.useRef(null);

  const set = (key: string) => (value: string) =>
    setValues((prev: Record<string, string>) => ({ ...prev, [key]: value }));

  const fill = () => {
    if (!formRef.current) return;
    setStatus('Filling…');
    aiFormFill
      .fillForm(formRef.current, text)
      .then((result: FillResult) =>
        setStatus(`Filled: ${result.filled.map((f) => f.key).join(', ') || '(none)'}`),
      )
      .catch((error: unknown) => setStatus(`Error: ${String(error)}`));
  };

  return h(
    'section',
    { className: 'panel' },
    h('h2', null, 'Controlled form'),
    h('textarea', {
      rows: 4,
      value: text,
      onChange: (event: { target: { value: string } }) => setText(event.target.value),
    }),
    h(
      'div',
      { className: 'button-row' },
      h('button', { className: 'btn-primary', onClick: fill }, 'Fill with AI (Ollama)'),
    ),
    h('p', { className: 'info' }, status),
    h(
      'form',
      { ref: formRef },
      h(Field, {
        label: 'First name',
        name: 'firstName',
        value: values.firstName,
        onChange: set('firstName'),
      }),
      h(Field, {
        label: 'Last name',
        name: 'lastName',
        value: values.lastName,
        onChange: set('lastName'),
      }),
      h(Field, {
        label: 'Email',
        name: 'email',
        type: 'email',
        value: values.email,
        onChange: set('email'),
      }),
    ),
    h('p', { className: 'info' }, 'React state: ', h('code', null, JSON.stringify(values))),
  );
}

createRoot(document.getElementById('root')!).render(h(App));
