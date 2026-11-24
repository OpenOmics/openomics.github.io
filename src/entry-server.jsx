import { StrictMode } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import App from './App.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';

export function render({ year, page = 'home', base = '/' }) {
  return renderToString(<StrictMode><App year={year} page={page} base={base} /></StrictMode>);
}

export function renderNotFound(props) {
  return '<!doctype html>' + renderToStaticMarkup(<NotFoundPage {...props} />);
}
