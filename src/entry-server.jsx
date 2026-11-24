import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';

export function render({ year, page = 'home', base = '/' }) {
  return renderToString(<StrictMode><App year={year} page={page} base={base} /></StrictMode>);
}
