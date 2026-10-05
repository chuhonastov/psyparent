import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const unused = fileURLToPath(new URL('./src/lib/pdf/unused.ts', import.meta.url));
// KORA_SINGLE=1 builds one JS file for the self-contained Kora-preview.html (tools/build_preview.py).
const single = !!process.env.KORA_SINGLE;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { html2canvas: unused, dompurify: unused, canvg: unused } },
  build: single ? { outDir: 'dist-single', rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  server: {
    port: 5173,
    host: true
  }
});
