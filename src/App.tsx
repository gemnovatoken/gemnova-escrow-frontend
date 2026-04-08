import { createWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import { BrowserProvider, Contract, parseUnits, MaxUint256 } from 'ethers' 
import { useState } from 'react' 
import { ESCROW_ADDRESSES, ESCROW_ABI } from './contractConfig'

// 🌐 1. EL ARSENAL DE REDES (TESTNETS)
const sepolia = {
  chainId: 11155111,
  name: 'Ethereum Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://sepolia.drpc.org' 
}

const bscTestnet = {
  chainId: 97,
  name: 'BSC Testnet',
  currency: 'tBNB',
  explorerUrl: 'https://testnet.bscscan.com',
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545' 
}

const arbitrumSepolia = {
  chainId: 421614,
  name: 'Arbitrum Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.arbiscan.io',
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc' 
}

const polygonAmoy = {
  chainId: 80002,
  name: 'Polygon Amoy',
  currency: 'POL',
  explorerUrl: 'https://amoy.polygonscan.com',
  rpcUrl: 'https://rpc-amoy.polygon.technology' 
}

const metadata = {
  name: 'Gem Nova Escrow',
  description: 'Trade + AI = Peace of mind',
  url: 'https://gemnova.com', 
  icons: ['https://avatars.mywebsite.com/']
}

const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: true,
})

// 🔥 Encendemos el motor con las 4 redes EVM
createWeb3Modal({
  ethersConfig,
  chains: [sepolia, bscTestnet, arbitrumSepolia, polygonAmoy], 
  projectId: 'cd2c2be00e014edbbf0b286967b34923',
  enableAnalytics: true,
  themeVariables: {
    '--w3m-accent': '#FFD700', 
  }
})

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)"
];

export default function App() {
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Web3Button = 'w3m-button' as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Web3NetworkButton = 'w3m-network-button' as any;

  const { isConnected, chainId } = useWeb3ModalAccount() 
  const { walletProvider } = useWeb3ModalProvider()

  // 🕵️‍♂️ CAMBIO 1: CAPTURAMOS EL ID Y LA ACCIÓN
  const [supabaseId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });

  const [action] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('action'); // Esto detecta el "release"
  });

  // 🚦 CAMBIO 2: AGREGAMOS 'releasing' A LOS ESTADOS
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'creating' | 'releasing' | 'success'>('idle');

  const formatearIdParaBlockchain = (uuid: string) => {
    const clean = uuid.replace(/-/g, ''); 
    return "0x" + clean.padEnd(64, '0'); 
  }

  // ==========================================
  // 🛡️ FUNCIÓN 1: METER EL DINERO (LO QUE YA TENÍAS)
  // ==========================================
  const handleCreateEscrow = async () => {
    if (!supabaseId) return;
    if (!isConnected || !walletProvider || !chainId) {
      alert("Por favor conecta tu billetera.");
      return;
    }

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    
    if (!contractAddressForCurrentChain || contractAddressForCurrentChain === "") {
      alert("🚧 Bóveda en construcción en esta red. Por favor, selecciona otra red en el menú.");
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);
      const usdtAddress = await escrowContract.usdt();
      const usdtContract = new Contract(usdtAddress, ERC20_ABI, provider);

      const tokenDecimals = await usdtContract.decimals();
      const idParaContrato = formatearIdParaBlockchain(supabaseId);
      const contraparteDePrueba = "0x000000000000000000000000000000000000dEaD"; 
      const cantidadDePrueba = parseUnits("100", tokenDecimals); 
      const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);
      
      setTxStatus('approving');
      const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, MaxUint256); 
      await txApprove.wait();

      setTxStatus('creating');
      const txCreate = await escrowContract.crearEscrow(idParaContrato, contraparteDePrueba, cantidadDePrueba);
      await txCreate.wait();
      
      setTxStatus('success');

    } catch (error) {
      console.error("Error en el protocolo:", error);
      setTxStatus('idle');
      alert("Transaction cancelled or failed. Please try again.");
    }
  }

  // ==========================================
  // 🔓 CAMBIO 3: NUEVA FUNCIÓN PARA SACAR EL DINERO
  // ==========================================
  const handleReleaseFunds = async () => {
    if (!supabaseId) return;
    if (!isConnected || !walletProvider || !chainId) {
      alert("Por favor conecta tu billetera.");
      return;
    }

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    if (!contractAddressForCurrentChain || contractAddressForCurrentChain === "") {
      alert("🚧 Bóveda en construcción en esta red.");
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);

      const idParaContrato = formatearIdParaBlockchain(supabaseId);

      setTxStatus('releasing');
      
      // ⚠️ IMPORTANTE: Uso 'liberarPago' asumiendo que así se llama tu función en Solidity
      // Si se llama diferente, cámbialo aquí abajo:
      const txRelease = await escrowContract.liberarPago(idParaContrato);
      await txRelease.wait();
      
      setTxStatus('success');
    } catch (error: unknown) {
      console.error("Error al liberar:", error);
      setTxStatus('idle');
      
      // Convertimos el error a un tipo seguro para poder leer su mensaje
      const err = error as { reason?: string; message?: string };
      alert("Error: " + (err.reason || err.message || "Revisa tu billetera o consúltalo con soporte."));
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: '#FFD700', fontSize: '3rem', margin: '0' }}>🛡️ Escrow Multichain</h1>
      
      {supabaseId ? (
         <h3 style={{ color: '#00ffcc', backgroundColor: '#003322', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
           ✅ Vinculado a Escrow: {supabaseId.slice(0,8)}...
         </h3>
      ) : (
         <h3 style={{ color: '#ff4444', backgroundColor: '#330000', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
           ❌ Modo Prueba: No hay ID en la URL
         </h3>
      )}

      {/* 🌐 SELECTOR DE REDES */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '40px 0' }}>
        <Web3NetworkButton /> 
        <Web3Button />
      </div>

      {isConnected && (
        <div style={{ backgroundColor: '#2a2a2a', padding: '30px', borderRadius: '15px', maxWidth: '600px', margin: '0 auto', border: '1px solid #FFD700' }}>
          
          {txStatus === 'success' ? (
            // Mensaje de éxito dinámico (sirve para pagar y para liberar)
            <div style={{ padding: '20px', backgroundColor: '#004422', borderRadius: '10px', border: '2px dashed #00ffcc' }}>
              <h2 style={{ color: '#00ffcc', margin: '0 0 10px 0' }}>
                {action === 'release' ? '🎉 Funds Released!' : '🎉 Vault Secured!'}
              </h2>
              <p style={{ margin: '0', fontSize: '1.1rem' }}>
                {action === 'release' ? 'The deal is finished and the seller has been paid.' : 'Your funds are safely locked in the smart contract.'}
              </p>
            </div>
          ) : (
            <>
              {/* CAMBIO 4: EL INTERRUPTOR VISUAL */}
              {action === 'release' ? (
                // 🟢 BOTÓN DE LIBERAR FONDOS
                <div style={{ border: '1px solid #2ecc71', padding: '15px', borderRadius: '10px' }}>
                  <h3 style={{ color: '#2ecc71', marginTop: 0 }}>Final Step</h3>
                  <button 
                    onClick={handleReleaseFunds} 
                    disabled={!supabaseId || txStatus !== 'idle'}
                    style={{ 
                      padding: '15px 30px', fontSize: '1.2rem', backgroundColor: (!supabaseId || txStatus !== 'idle') ? '#555' : '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%'
                    }}>
                    {txStatus === 'idle' && '🔓 Confirm Delivery & Release'}
                    {txStatus === 'releasing' && '⌛ Processing Release...'}
                  </button>
                </div>
              ) : (
                // 🟡 BOTÓN DE PAGAR (Original)
                <button 
                  onClick={handleCreateEscrow} 
                  disabled={!supabaseId || txStatus !== 'idle'}
                  style={{ 
                    padding: '15px 30px', fontSize: '1.2rem', backgroundColor: (!supabaseId || txStatus !== 'idle') ? '#555' : '#FFD700', color: (!supabaseId || txStatus !== 'idle') ? '#aaa' : 'black', border: 'none', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%'
                  }}>
                  {txStatus === 'idle' && '+ Execute Escrow Payment'}
                  {txStatus === 'approving' && '⏳ 1/2 Approving USDT...'}
                  {txStatus === 'creating' && '🔐 2/2 Securing in Vault...'}
                </button>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}