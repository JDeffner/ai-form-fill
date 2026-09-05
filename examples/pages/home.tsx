import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CARDS = [
  {
    path: 'element',
    title: 'Element',
    text: 'Drop <ai-form-fill> next to a form and the user gets the finished panel: text box, microphone, status, undo, review.',
  },
  {
    path: 'controller',
    title: 'Controller',
    text: 'The headless createFormFill() setup: your own markup, the state machine and the full FillResult.',
  },
  {
    path: 'voice',
    title: 'Voice',
    text: 'Dictate with the Web Speech API; the transcript goes into the same fill call.',
  },
  {
    path: 'react',
    title: 'React hook',
    text: 'useFormFill from ai-form-fill/react. Controlled inputs receive AI-filled values like typed ones.',
  },
  {
    path: 'advanced',
    title: 'Advanced',
    text: 'Switch providers and models, fill a single field, and follow the aff:* lifecycle events in a log.',
  },
  {
    path: 'script-tag',
    title: 'Script tag',
    text: 'One script tag, no bundler. The same element on a plain HTML page.',
  },
];
export function Home() {
  return (
    <>
      <section className="max-w-2xl">
        <div className="mb-4 flex gap-2">
          <Badge variant="secondary">0 runtime dependencies</Badge>
          <Badge variant="secondary">Ollama + OpenAI-compatible</Badge>
          <Badge variant="secondary">MIT</Badge>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Unstructured text, resolved into form fields.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Paste a paragraph, a resume, an email. The library extracts structured data and fills the
          matching fields. Framework-agnostic, runs locally on Ollama or against any
          OpenAI-compatible provider.
        </p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c, i) => (
          <a key={c.path} href={`#/${c.path}`} className="group">
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    <span className="mr-2 font-mono text-muted-foreground">0{i + 1}</span>
                    {c.title}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{c.text}</CardDescription>
              </CardHeader>
            </Card>
          </a>
        ))}
      </section>
    </>
  );
}
