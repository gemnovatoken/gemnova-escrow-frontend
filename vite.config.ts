import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // Dejamos que el polyfill haga su trabajo completo sin restricciones
    nodePolyfills(), 
  ],
  define: {
    // Definimos la variable de producción estrictamente para Web3Modal
    'process.env.NODE_ENV': '"production"',
    global: 'globalThis'
  },
  optimizeDeps: {
    // 🔥 LA ORDEN NUCLEAR: Fuerza a Vite a destruir la caché corrupta
    force: true 
  }
})