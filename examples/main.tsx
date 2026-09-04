import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles.css';
import './fill-flash';

// No <StrictMode>: the pages now create their controllers in an effect and
// destroy them in the cleanup, so double mounting would be safe, but the
// duplicated dev-only debug logs make the demos harder to follow.
createRoot(document.getElementById('root')!).render(<App />);
