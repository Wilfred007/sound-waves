import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Specific globals needed by Stacks.js
      globals: {
        Buffer: true, 
        global: true,
        process: true,
      },
    }),
  ],
});