import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  define: {
    // Definimos explícitamente el entorno de producción para las librerías de Node/Web3
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})