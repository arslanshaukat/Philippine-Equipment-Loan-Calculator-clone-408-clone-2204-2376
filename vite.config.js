import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensure relative paths for container compatibility
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
    cors: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
    target: 'esnext', // Use modern JS to reduce polyfill size
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Letting Vite/Rollup determine the optimal chunking strategy is safer
        // when using React.lazy() extensively.
      }
    }
  }
});