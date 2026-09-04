import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles.css';
import './fill-flash';

// No <StrictMode>: it mounts effects twice in dev, and `autoInit()` (used by
// the Basic and Voice pages) has no teardown, so the fill button would be
// wired twice.
createRoot(document.getElementById('root')!).render(<App />);
