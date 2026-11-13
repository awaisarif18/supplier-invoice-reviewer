import { fileURLToPath } from 'node:url';
import { createExtractionHandler } from './server/extract.mjs';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const pages = ['index.html', 'review/old-rate/index.html', 'review/correct-rate/index.html',
  'review/missing-clause/index.html', 'review/custom/index.html', 'review/upload/index.html'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  const extraction = () => createExtractionHandler({ key: env.GEMINI_API_KEY, model: env.GEMINI_EXTRACTION_MODEL });
  return {
    plugins: [react(), {
      name: 'invoice-extraction',
      configureServer(server) { server.middlewares.use(extraction()); },
      configurePreviewServer(server) { server.middlewares.use(extraction()); },
    }],
    build: {
      rollupOptions: {
        input: pages.map(page => fileURLToPath(new URL(page, import.meta.url))),
      },
    },
  };
});
