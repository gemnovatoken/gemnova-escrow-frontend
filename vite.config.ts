import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true, 
        global: true,
        process: false, // 🔥 APAGAMOS EL POLYFILL FALSO QUE CAUSA EL CRASH
      },
    }),
  ],
  define: {
    // 🔥 INYECTAMOS LA VARIABLE DE FORMA NATIVA Y BLINDADA
    'process.env': JSON.stringify({ NODE_ENV: 'production' })
  }
})