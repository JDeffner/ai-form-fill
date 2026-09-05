/**
 * Script tag demo: the drop-in path for a page with no build step. The live
 * proof is `examples/vanilla.html`, a static page that loads the built bundle
 * from `dist/` and uses nothing else.
 */
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock, PageHeader } from '../components/fields';

const CODE = `<script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>

<form id="form">
  <input name="name" placeholder="Name" />
  <input name="email" type="email" placeholder="Email" />
</form>

<ai-form-fill for="#form" voice></ai-form-fill>`;

const STEPS = [
  'The bundle is one minified IIFE with the core, the voice module and the element.',
  'It registers <ai-form-fill> on load, so the tag works without an import.',
  'Everything else lands on the AIFormFill global, for a page that wants the API.',
  'The provider defaults to local Ollama; set provider, model and base-url to change it.',
];

export function ScriptTag() {
  return (
    <>
      <PageHeader title="No bundler, no build step">
        One script tag and one custom element are enough. Useful for a CMS template, a legacy page
        or a quick test, and it is the same code the npm package ships.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>The whole page</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock>{CODE}</CodeBlock>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>What that gives you</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p className="text-sm">
              A running version of exactly this page is served next to the demos. It loads{' '}
              <code>/dist/ai-form-fill.browser.js</code>, so run <code>pnpm build</code> once before
              opening it.
            </p>
            <Button asChild variant="secondary" className="justify-self-start">
              <a href="/examples/vanilla.html" target="_blank" rel="noreferrer">
                Open the plain HTML page
                <ExternalLink />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
