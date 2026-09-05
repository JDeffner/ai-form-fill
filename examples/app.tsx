import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home } from './pages/home';
import { Element } from './pages/element';
import { Controller } from './pages/controller';
import { Voice } from './pages/voice';
import { ReactHook } from './pages/react';
import { Advanced } from './pages/advanced';
import { ScriptTag } from './pages/script-tag';

export const DEMOS = [
  { path: 'element', title: 'Element', page: Element },
  { path: 'controller', title: 'Controller', page: Controller },
  { path: 'voice', title: 'Voice', page: Voice },
  { path: 'react', title: 'React hook', page: ReactHook },
  { path: 'advanced', title: 'Advanced', page: Advanced },
  { path: 'script-tag', title: 'Script tag', page: ScriptTag },
];

/** Minimal hash router: `#/element`, `#/controller`, ... and `#/` for the landing page. */
function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Dark mode: follows the OS until the user toggles, then remembers the choice. */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

export function App() {
  const route = useRoute();
  const [dark, toggleDark] = useDarkMode();
  const Page = DEMOS.find((d) => d.path === route)?.page ?? Home;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex h-14 items-center justify-between border-b">
        <a href="#/" className="font-semibold tracking-tight">
          ai-form-fill
        </a>
        <nav className="flex items-center gap-1 text-sm">
          {DEMOS.map((d) => (
            <a
              key={d.path}
              href={`#/${d.path}`}
              aria-current={route === d.path ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground',
                route === d.path && 'bg-muted text-foreground',
              )}
            >
              {d.title}
            </a>
          ))}
          {/* The generated API reference, built into `site/api` by
              `pnpm build:site`. In `pnpm dev` it 404s until you run that. */}
          <a
            href={`${import.meta.env.BASE_URL}api/`}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2"
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
        </nav>
      </header>
      <main className="flex-1 py-10">
        <Page key={route} />
      </main>
      <footer className="flex justify-between border-t py-6 text-sm text-muted-foreground">
        <span>ai-form-fill, MIT</span>
        <span className="flex gap-4">
          <a className="hover:text-foreground" href="https://github.com/JDeffner/ai-form-fill">
            GitHub
          </a>
          <a className="hover:text-foreground" href="https://www.npmjs.com/package/ai-form-fill">
            npm
          </a>
        </span>
      </footer>
    </div>
  );
}
