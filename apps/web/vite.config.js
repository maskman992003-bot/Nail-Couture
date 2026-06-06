import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@nail-couture/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
