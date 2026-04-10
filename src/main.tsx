import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// 🟢 1. Importamos el proveedor de TON
import { TonConnectUIProvider } from '@tonconnect/ui-react'

// 🟢 2. Definimos la URL de tu manifiesto (apuntando a tu Vercel)
const manifestUrl = "https://gemnova-escrow-frontend.vercel.app/tonconnect-manifest.json";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 🟢 3. Envolvemos la App con el proveedor */}
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>,
)