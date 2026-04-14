import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  define: {
    // Cubrimos todas las formas en las que Web3Modal busca la variable
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    global: 'globalThis'
  },
  optimizeDeps: {
    // 🔥 ESTE ES EL SECRETO: Obliga a Vercel a destruir la caché oculta (.vite) 
    // y recompilar las librerías desde cero con las variables correctas.
    force: true 
  }
})