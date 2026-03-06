import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/webview/main.ts'),
      name: 'CodeTerrariumWebview',
      formats: ['iife'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
