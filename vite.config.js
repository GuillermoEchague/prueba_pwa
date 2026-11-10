import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1,5 MB; no es un problema
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  plugins: [
    VitePWA({
      // 'prompt': cuando publiques una versión nueva, el juego muestra un aviso para actualizar.
      registerType: 'prompt',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Combo en la Feria',
        short_name: 'Combo Feria',
        description: 'Juego de peleas 2D en pixel art, ambientado en una feria chilena.',
        lang: 'es-CL',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#141026',
        theme_color: '#141026',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Guarda todo el juego en el teléfono para que funcione sin internet.
        globPatterns: ['**/*.{js,css,html,png,webp,jpg,svg,json,woff,woff2,m4a,mp3,ogg}'],
        // El límite por defecto es 2 MB; Phaser y los atlas grandes lo superan.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
