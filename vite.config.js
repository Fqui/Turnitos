import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TurnitosLR',
        short_name: 'TurnitosLR',
        description: 'Reserva tu cancha al instante',
        theme_color: '#ffffff',
        icons: [
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
