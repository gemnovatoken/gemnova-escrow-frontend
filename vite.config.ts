import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // 🔥 EL SECRETO: Obligamos al polyfill a solo cargar Buffer para TON.
      // Así, Vite maneja 'process' naturalmente y Web3Modal no choca.
      include: ['buffer'], 
    }),
  ],
  define: {
    // Definimos globalThis por si alguna librería Web3 antigua lo busca
    global: 'globalThis',
  }
})