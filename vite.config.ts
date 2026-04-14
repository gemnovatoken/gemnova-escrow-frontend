import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // 1. SOLO cargamos Buffer para TonConnect. Prohibimos que toque el entorno.
      include: ['buffer'],
    }),
  ],
  define: {
    // 2. Definimos la variable globalmente para que React y Web3Modal 
    // no se estrellen buscando "process" en el navegador.
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    global: 'window'
  }
})