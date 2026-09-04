import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CARDS = [
  {
    path: 'basic',
    title: 'Basic',
    text: 'The one-line autoInit() setup. A contact form filled from a short introduction.',
  },
  {
    path: 'advanced',
    title: 'Advanced',
    text: 'Switch providers and models, fill a single field, and read the full FillResult in a log.',
  },
  {
    path: 'voice',
    title: 'Voice',
    text: 'Dictate with the Web Speech API; the transcript goes into the same fillForm call.',
  },
  {
    path: 'controlled',
    title: 'React controlled',
    text: 'Controlled components: AI-filled values update React state exactly like typing.',
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

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
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
