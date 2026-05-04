import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  root: '.',
  // For GitHub Pages: set base to '/<repo-name>/' for project pages,
  // or '/' for user pages (e.g., <username>.github.io)
  base: mode === 'production' ? '/wordle/' : '/',
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
