import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  define: {
    // 🔥 La forma CORRECTA y estricta de inyectarlo para Vercel
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    global: 'globalThis',
  }
})