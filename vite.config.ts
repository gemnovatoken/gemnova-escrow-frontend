import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // 🔥 EL SECRETO: Le prohibimos al polyfill que sobrescriba 'process'
      globals: {
        Buffer: true,
        global: true,
        process: false, 
      },
    }),
  ],
  define: {
    // Ahora nuestra variable está blindada y nadie la va a borrar
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' })
  }
})