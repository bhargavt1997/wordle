import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  root: '.',
  // Use '/' for single-service deployment (Render), '/wordle/' for GitHub Pages
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
}));
