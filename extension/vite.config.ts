import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'sidepanel/main.tsx'),
      name: 'SidePanel',
      formats: ['iife'],
      fileName: () => 'sidepanel.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'sidepanel.js',
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});