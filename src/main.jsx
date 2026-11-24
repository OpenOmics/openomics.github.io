import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { PAGE_DEFINITIONS, resolvePage } from './lib/routes.js';

const container = document.getElementById('root');
const year = Number(container.dataset.buildYear) || new Date().getUTCFullYear();
const base = container.dataset.siteBase || import.meta.env.BASE_URL;
const page = container.dataset.page || resolvePage(window.location.pathname, base);
const app = <StrictMode><App year={year} page={page} base={base} /></StrictMode>;

// Vite serves the shared HTML template in development; production metadata is
// already rendered separately for each page during the static build.
if (container.dataset.prerendered !== 'true') {
  document.title = PAGE_DEFINITIONS.find((definition) => definition.id === page).title;
}

if (container.dataset.prerendered === 'true') {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
