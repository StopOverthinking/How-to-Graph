import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com']
  },
  plugins: [
    react(),
    legacy({
      targets: ['Safari >= 12', 'iOS >= 12'],
      modernPolyfills: true
    })
  ]
});
