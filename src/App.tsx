import { createWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import { BrowserProvider, Contract, parseUnits, MaxUint256 } from 'ethers' 
import { useState, useEffect } from 'react' 
import { createClient } from '@supabase/supabase-js' 
import { ESCROW_ADDRESSES, ESCROW_ABI } from './contractConfig'

// ==========================================
// 🟢 INICIALIZAMOS SUPABASE FRONTEND
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Pega_aqui_tu_URL_de_Supabase';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'Pega_aqui_tu_Anon_Key';
const supabase = createClient(supabaseUrl, supabaseKey);

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

  // 🕵️‍♂️ CAPTURAMOS EL ID Y LA ACCIÓN
  const [supabaseId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });

  // 🟢 CAPTURAMOS EL ROL DEL USUARIO
  const [role] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('role'); 
  });

  // 🟢 Agregamos 'refunding' a los estados posibles de la transacción
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'creating' | 'releasing' | 'refunding' | 'success'>('idle');
  
  // 🟢 ESTADO PARA ESCUCHAR AL RADAR
  const [dbStatus, setDbStatus] = useState<string>('PENDING');

  // ==========================================
  // 🟢 EL OÍDO DEL FRONTEND (CON LECTURA INICIAL)
  // ==========================================
  useEffect(() => {
    if (!supabaseId) return; 

    console.log("📡 Frontend conectando para el contrato:", supabaseId);

    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('status')
        .eq('id', supabaseId)
        .single(); 

      if (data && !error) {
        console.log("Estado inicial encontrado:", data.status);
        setDbStatus(data.status); 
      }
    };

    fetchInitialStatus();

    const subscription = supabase
      .channel('contratos-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
          filter: `id=eq.${supabaseId}` 
        },
        (payload) => {
          console.log('⚡ ¡El Radar actualizó la BD!', payload);
          setDbStatus(payload.new.status); 
          
          // 🟢 ESTA ES LA LÍNEA MÁGICA QUE DEBES AGREGAR:
          setTxStatus('idle'); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabaseId]);

  const formatearIdParaBlockchain = (uuid: string) => {
    const clean = uuid.replace(/-/g, ''); 
    return "0x" + clean.padEnd(64, '0'); 
  }

  // ==========================================
  // 🛡️ FUNCIÓN 1: METER EL DINERO 
  // ==========================================
  const handleCreateEscrow = async () => {
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
  // 🔓 FUNCIÓN 2: NUEVA FUNCIÓN PARA SACAR EL DINERO
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
      
      const txRelease = await escrowContract.liberarPago(idParaContrato);
      await txRelease.wait();
      
      setTxStatus('success');
    } catch (error: unknown) {
      console.error("Error al liberar:", error);
      setTxStatus('idle');
      
      const err = error as { reason?: string; message?: string };
      alert("Error: " + (err.reason || err.message || "Revisa tu billetera o consúltalo con soporte."));
    }
  }

  // ==========================================
  // 🚨 FUNCIÓN 3: NUEVA FUNCIÓN DE REEMBOLSO
  // ==========================================
  const handleRefundFunds = async () => {
    if (!supabaseId || !isConnected || !walletProvider || !chainId) {
      alert("Por favor conecta tu billetera.");
      return;
    }

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    if (!contractAddressForCurrentChain || contractAddressForCurrentChain === "") return;

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);

      const idParaContrato = formatearIdParaBlockchain(supabaseId);

      setTxStatus('refunding');
      
      // Llamamos exactamente a la función "reembolsar" de tu Smart Contract
      const txRefund = await escrowContract.reembolsar(idParaContrato);
      await txRefund.wait();
      
      setTxStatus('success');
    } catch (error: unknown) {
      console.error("Error al reembolsar:", error);
      setTxStatus('idle');
      
      const err = error as { reason?: string; message?: string, code?: string };
      // Mostramos un error amigable si alguien que no es el Juez intenta presionarlo
      if (err.reason?.includes("Solo el Juez") || err.message?.includes("Solo el Juez")) {
        alert("🔒 Acceso Denegado: Según las reglas del contrato, solo un Árbitro/Juez de Gem Nova puede forzar este reembolso.");
      } else {
        alert("Error: No se pudo procesar el reembolso. " + (err.reason || err.message));
      }
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: '#FFD700', fontSize: '3rem', margin: '0' }}>🛡️ Escrow Multichain</h1>
      
      {supabaseId ? (
         <h3 style={{ color: '#00ffcc', backgroundColor: '#003322', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
           ✅ Linked to Escrow: {supabaseId.slice(0,8)}...
         </h3>
      ) : (
         <h3 style={{ color: '#ff4444', backgroundColor: '#330000', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
           ❌ Test Mode: No ID provided
         </h3>
      )}

      {/* 🌐 SELECTOR DE REDES */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '40px 0' }}>
        <Web3NetworkButton /> 
        <Web3Button />
      </div>

      {isConnected && (
        <div style={{ backgroundColor: '#2a2a2a', padding: '30px', borderRadius: '15px', maxWidth: '600px', margin: '0 auto', border: '1px solid #FFD700' }}>
          
          {role === 'seller' ? (
            
            // ==========================================
            // 👨‍💻 VISTA DEL VENDEDOR (SELLER DASHBOARD)
            // ==========================================
            <div style={{ padding: '20px', backgroundColor: '#001a33', borderRadius: '10px', border: '2px solid #3498db' }}>
              <h2 style={{ color: '#3498db', margin: '0 0 15px 0' }}>👨‍💻 Seller Dashboard</h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                Monitor the status of your payment here. Do not start working until the funds are secured.
              </p>

              <div style={{ padding: '15px', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #333' }}>
                {dbStatus === 'PENDING' && (
                  <div>
                    <h3 style={{ color: '#FFD700', margin: '0 0 10px 0' }}>⏳ Awaiting Deposit</h3>
                    <p style={{ margin: 0, color: '#aaa' }}>The client has not locked the funds yet. Please wait.</p>
                  </div>
                )}
                
                {dbStatus === 'ACTIVE' && (
                  <div>
                    <h3 style={{ color: '#2ecc71', margin: '0 0 10px 0' }}>✅ Funds Secured!</h3>
                    <p style={{ margin: 0, color: '#ccc' }}>The smart contract has verified the deposit. <strong>You are safe to deliver your work.</strong></p>
                  </div>
                )}

                {dbStatus === 'COMPLETED' && (
                  <div>
                    <h3 style={{ color: '#9b59b6', margin: '0 0 10px 0' }}>🎉 Payment Released</h3>
                    <p style={{ margin: 0, color: '#ccc' }}>The client approved your work. The funds have been sent to your wallet!</p>
                  </div>
                )}

                {/* 🟢 NUEVA PANTALLA: REEMBOLSO CANCELADO PARA EL VENDEDOR */}
                {dbStatus === 'REFUNDED' && (
                  <div>
                    <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>🛑 Deal Cancelled</h3>
                    <p style={{ margin: 0, color: '#ccc' }}>The buyer has requested a refund and the escrow is now closed. Do not proceed with the work.</p>
                  </div>
                )}
              </div>
            </div>

          ) : (
            
            // ==========================================
            // 👤 VISTA DEL COMPRADOR (BUYER DASHBOARD REACTIVO)
            // ==========================================
            <>
              {dbStatus === 'COMPLETED' ? (
                
                // PANTALLA 3: YA SE LIBERÓ EL DINERO
                <div style={{ padding: '20px', backgroundColor: '#004422', borderRadius: '10px', border: '2px dashed #00ffcc' }}>
                  <h2 style={{ color: '#00ffcc', margin: '0 0 10px 0' }}>🎉 Funds Released!</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem' }}>The deal is finished and the seller has been paid.</p>
                </div>

              ) : dbStatus === 'REFUNDED' ? (

                // 🟢 NUEVA PANTALLA 4: SE HIZO EL REEMBOLSO
                <div style={{ padding: '20px', backgroundColor: '#330000', borderRadius: '10px', border: '2px dashed #ff4444' }}>
                  <h2 style={{ color: '#ff4444', margin: '0 0 10px 0' }}>🛑 Refund Complete</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem' }}>The contract was cancelled and your funds have been returned to your wallet.</p>
                </div>

              ) : dbStatus === 'ACTIVE' ? (

                // PANTALLA 2: EL DINERO ESTÁ ASEGURADO, TOCA LIBERARLO O REEMBOLSAR
                <div style={{ border: '1px solid #2ecc71', padding: '20px', borderRadius: '10px', backgroundColor: '#002211' }}>
                  <h2 style={{ color: '#2ecc71', margin: '0 0 10px 0' }}>✅ Vault Secured!</h2>
                  <p style={{ marginBottom: '20px', fontSize: '1.05rem' }}>Your funds are safely locked. Once you receive your product or service, click below to release the payment to the seller.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* BOTÓN VERDE PRINCIPAL: LIBERAR */}
                    <button 
                      onClick={handleReleaseFunds} 
                      disabled={!supabaseId || txStatus !== 'idle'}
                      style={{ 
                        padding: '15px 30px', fontSize: '1.2rem', backgroundColor: (!supabaseId || txStatus !== 'idle') ? '#555' : '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%'
                      }}>
                      {txStatus === 'idle' && '🔓 Confirm Delivery & Release'}
                      {txStatus === 'releasing' && '⌛ Processing Release...'}
                      {txStatus === 'success' && '✅ Done! Waiting for Radar...'}
                    </button>

                    {/* 🟢 NUEVO BOTÓN ROJO SECUNDARIO: REEMBOLSO */}
                    <button 
                      onClick={handleRefundFunds} 
                      disabled={!supabaseId || txStatus !== 'idle'}
                      style={{ 
                        padding: '10px 20px', fontSize: '1rem', backgroundColor: 'transparent', color: (!supabaseId || txStatus !== 'idle') ? '#777' : '#ff4444', border: (!supabaseId || txStatus !== 'idle') ? '1px solid #777' : '1px solid #ff4444', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%'
                      }}>
                      {txStatus === 'idle' && '🚨 Request Refund / Dispute'}
                      {txStatus === 'refunding' && '⌛ Processing Refund...'}
                    </button>
                  </div>
                </div>

              ) : (

                // PANTALLA 1: EL INICIO (PENDIENTE POR PAGAR)
                <div style={{ padding: '10px' }}>
                  <h2 style={{ color: '#FFD700', margin: '0 0 15px 0' }}>Secure your Payment</h2>
                  <button 
                    onClick={handleCreateEscrow} 
                    disabled={!supabaseId || txStatus !== 'idle'}
                    style={{ 
                      padding: '15px 30px', fontSize: '1.2rem', backgroundColor: (!supabaseId || txStatus !== 'idle') ? '#555' : '#FFD700', color: (!supabaseId || txStatus !== 'idle') ? '#aaa' : 'black', border: 'none', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%'
                    }}>
                    {txStatus === 'idle' && '+ Execute Escrow Payment'}
                    {txStatus === 'approving' && '⏳ 1/2 Approving USDT...'}
                    {txStatus === 'creating' && '🔐 2/2 Securing in Vault...'}
                    {txStatus === 'success' && '✅ Success! Waiting for Radar...'}
                  </button>
                </div>

              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}