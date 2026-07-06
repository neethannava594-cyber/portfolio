// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
