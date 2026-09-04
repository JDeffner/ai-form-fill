/**
 * Basic demo: the one-line `autoInit()` setup. The page follows the
 * quick-start layout (`#aff-form`, `#aff-text`, `#aff-text-button`) and the
 * provider comes from `data-aff-provider` on the form.
 */
import { useEffect } from 'react';
import { autoInit } from '../../lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DemoForm, readForm } from '../components/demo-form';
import { PageHeader } from '../components/fields';

const SAMPLE = `Hi, my name is Jim Raynor. You can reach me at jim.dope@starcraft.com or call me at +1-551-143-4567. I live at 1st Main Street in NYC, USA. I'm a software developer passionate about technology and music. I would like to subscribe to the newsletter and enable notifications. I'm male.`;

export function Basic() {
  useEffect(() => {
    autoInit({ debug: true });
  }, []);

  return (
    <>
      <PageHeader title="One line to fill a form">
        A single <code>autoInit()</code> call wires the textarea, the button and the form together.
        Fills from the text on the left using local Ollama.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Source text</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea id="aff-text" rows={10} defaultValue={SAMPLE} />
            <Button id="aff-text-button" className="justify-self-start">
              Fill form
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoForm
              id="aff-form"
              data-aff-provider="ollama"
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
