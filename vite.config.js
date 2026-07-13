import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw-custom.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Force new SW when these files change
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      // Bust cache on new builds by including timestamp
      buildTimestamp: Date.now(),
      manifest: {
        name: 'Turnitos LR - Gestión',
        short_name: 'TurnitosLR',
        description: 'Gestión de reservas en tiempo real',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // For GitHub Pages, set base to '/<repo-name>/'
  // For local dev and custom domain, leave as '/'
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: true, // Exposes server in local network
    port: 5174
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize for production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'maps': ['leaflet', 'react-leaflet']
        }
      }
    }
  }
})
