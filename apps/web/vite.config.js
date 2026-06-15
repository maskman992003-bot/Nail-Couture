import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import Sitemap from 'vite-plugin-sitemap';
import {
  publicSitemapRoutes,
  sitemapChangefreq,
  sitemapPriority,
} from './sitemap.routes.js';

export default defineConfig({
  base: '/',
  envDir: path.resolve(__dirname, '../..'),
  plugins: [
    react(),
    tailwindcss(),
    Sitemap({
      hostname: 'https://www.nailcouture.net',
      dynamicRoutes: publicSitemapRoutes,
      generateRobotsTxt: true,
      outDir: 'dist',
      changefreq: sitemapChangefreq,
      priority: sitemapPriority,
      robots: [
        {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/superadmin',
            '/admin',
            '/owner',
            '/partner',
            '/cashier',
            '/technician',
            '/portal',
            '/customer',
            '/login',
            '/register',
          ],
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@nail-couture/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
