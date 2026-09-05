/**
 * Element demo: `<ai-form-fill>` is a custom element, so React renders it like
 * any other tag. Two lines of HTML and one import give the user a text box, a
 * microphone, a fill button, live status, a summary and undo.
 */
import { useState } from 'react';
import type { HTMLAttributes } from 'react';
import { defineFormFillElement } from '../../lib/ui/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoForm } from '../components/demo-form';
import { CheckOption, CodeBlock, Options, PageHeader } from '../components/fields';

// Registering once at module level is enough; the call is a no-op afterwards.
defineFormFillElement();

/** The attributes this page sets. Empty string means "attribute present". */
type FormFillElementProps = HTMLAttributes<HTMLElement> & {
  for?: string;
  voice?: '';
  review?: '';
};

// The element is not part of React's tag list, so the demo app teaches JSX
// about it here. This augmentation belongs to the demo, not to the library.
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the only way to reach React.JSX
  namespace JSX {
    interface IntrinsicElements {
      'ai-form-fill': FormFillElementProps;
    }
  }
}

const CODE = `import { defineFormFillElement } from 'ai-form-fill/ui';
defineFormFillElement();

<form id="demo-form">...</form>
<ai-form-fill for="#demo-form" voice review></ai-form-fill>`;

export function Element() {
  const [voice, setVoice] = useState(true);
  const [review, setReview] = useState(false);

  return (
    <>
      <PageHeader title="Two lines of HTML, a finished panel">
        <code>&lt;ai-form-fill&gt;</code> is plain DOM in a shadow root with no dependencies. It
        inherits the page font and text colour, so it reads in light and dark mode without
        configuration. Toggle the attributes below and watch the panel change.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="grid gap-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Options label="Toggle">
                <CheckOption
                  type="checkbox"
                  checked={voice}
                  onChange={(e) => setVoice(e.target.checked)}
                >
                  voice
                </CheckOption>
                <CheckOption
                  type="checkbox"
                  checked={review}
                  onChange={(e) => setReview(e.target.checked)}
                >
                  review
                </CheckOption>
              </Options>
              <p className="text-sm text-muted-foreground">
                <code>voice</code> shows the microphone when the browser can dictate.{' '}
                <code>review</code> lists the values first and writes only the checked ones.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All of the code</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock>{CODE}</CodeBlock>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ai-form-fill
              for="#demo-form"
              voice={voice ? '' : undefined}
              review={review ? '' : undefined}
            />
            <DemoForm id="demo-form" onSubmit={(e) => e.preventDefault()} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
