import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// HTTPS + host: the phone on the LAN needs a secure context for the microphone and the
// service worker. `--mode http` serves plain HTTP for local tools that reject the
// self-signed cert (localhost counts as a secure context anyway).
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    ...(mode === 'http' ? [] : [basicSsl()]),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Speed-Mathe',
        short_name: 'Speed-Mathe',
        description: 'Rechnen auf Zeit: Verliebte Zahlen, Plus und Minus bis 20',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        background_color: '#f0f0f0',
        theme_color: '#fbff00',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Fonts come from Google; cache them on first use so the game looks the same offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      input: { main: page('./index.html'), sprachtest: page('./sprachtest.html') },
    },
  },
  // Empty inline config stops Vite from searching up for a parent postcss.config.js.
  css: { postcss: {} },
  server: { host: true, port: Number(process.env.PORT) || 5173 },
}));
