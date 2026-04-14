import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // 🔥 Obligamos al plugin a cargar SOLO Buffer para TON.
      // Le prohibimos tocar 'process' para que no borre nuestro script.
      include: ['buffer'],
    }),
  ]
})