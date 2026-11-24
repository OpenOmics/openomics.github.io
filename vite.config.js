import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveSite } from './scripts/site-config.mjs';

export default defineConfig({
  plugins: [react()],
  base: resolveSite().base,
  build: { target: 'es2022' },
});
