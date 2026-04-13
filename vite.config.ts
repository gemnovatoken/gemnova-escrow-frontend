import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  define: {
    // Le entregamos el objeto completo a las librerías Web3
    'process.env': {
      NODE_ENV: '"production"'
    }
  }
})