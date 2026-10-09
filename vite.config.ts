// Fix tsx quirk where globalThis.__dirname and __filename are set to '.' in ESM, breaking createRequire in Node 22
if ((globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}
if ((globalThis as any).__filename === '.') {
  delete (globalThis as any).__filename;
}

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'script',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Kapi-Studio By Piotr new',
          short_name: 'Kapi-Studio',
          description: 'Zaawansowany profesjonalny edytor wideo SaaS z akceleracją GPU WebCodecs 4K, wielościeżkową osią czasu oraz chmurą Firestore.',
          theme_color: '#121214',
          background_color: '#121214',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'pl',
          dir: 'ltr',
          categories: ['multimedia', 'video', 'productivity', 'utilities'],
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Nowy Projekt',
              short_name: 'Projekt',
              url: '/?action=new',
              description: 'Otwórz nowy projekt montażu wideo',
            },
            {
              name: 'Eksport Wideo 4K',
              short_name: 'Eksport',
              url: '/?tab=export',
              description: 'Eksportuj zmontowane wideo w jakości 4K',
            },
            {
              name: 'Dysk Google',
              short_name: 'Dysk',
              url: '/?tab=drive',
              description: 'Importuj klipy z Dysku Google',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5000000,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/__/],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/.*$/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/.*firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /.*ffmpeg-core.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ffmpeg-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('googleapis') || id.includes('google-auth-library') || id.includes('gtoken') || id.includes('google-pki')) {
                return 'vendor-google';
              }
              if (id.includes('@ffmpeg')) {
                return 'vendor-ffmpeg';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'vendor-pdf';
              }
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react-core';
              }
              return 'vendor-others';
            }
          }
        }
      }
    },
    server: {
      hmr: false,
      ws: false,
      watch: null,
    },
  };
});
