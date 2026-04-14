import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Dejamos que cargue Buffer para TON, pero le prohibimos arruinar 'process'
      include: ['buffer'] 
    }),
  ],
  resolve: {
    alias: {
      // 🔥 EL GOLPE FINAL: Toda librería que busque 'process' leerá nuestro archivo blindado
      process: '/src/process-shim.js'
    }
  },
  define: {
    global: 'globalThis'
  }
})