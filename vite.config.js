import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
