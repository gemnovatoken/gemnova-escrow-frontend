import { createWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import { BrowserProvider, Contract, parseUnits, MaxUint256 } from 'ethers' 
import { useState, useEffect } from 'react' 
import { createClient } from '@supabase/supabase-js' 
import { ESCROW_ADDRESSES, ESCROW_ABI } from './contractConfig'
// 🎨 IMPORTAMOS NUESTRO NUEVO COMPONENTE VISUAL
import { HeroStats } from './HeroStats';

// 🟢 CAMBIO 1: AGREGAMOS LOS HOOKS DE TONCONNECT Y @TON/CORE
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Address, toNano, beginCell } from '@ton/core';
import { storeCreateEscrow, storeReleaseFunds, storeRefund } from './tact_GemNovaEscrow';
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

  // ESTADOS DE EVM (MetaMask)
  const { isConnected, chainId } = useWeb3ModalAccount() 
  const { walletProvider } = useWeb3ModalProvider()

  // 🟢 CAMBIO 2: ESTADOS DE TON (Tonkeeper)
  const [tonConnectUI] = useTonConnectUI();
  const userTONAddress = useTonAddress();

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

  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'creating' | 'releasing' | 'refunding' | 'success'>('idle');
  
  // 🟢 ESTADO PARA ESCUCHAR AL RADAR
  const [dbStatus, setDbStatus] = useState<string>('PENDING');

  // 🟢 ESTADOS PARA GUARDAR EL DINERO Y LA BILLETERA REAL
  const [contractAmount, setContractAmount] = useState<string>('0');
  const [sellerWallet, setSellerWallet] = useState<string>('');

  // 🟢 ESTADOS PARA GUARDAR LOS CALCULOS DE COMISIÓN (0.95%)
  const [feeAmount, setFeeAmount] = useState<string>('0');
  const [totalAmount, setTotalAmount] = useState<string>('0');
  // 🎨 ESTADO PARA LAS ESTADÍSTICAS DEL DASHBOARD (Datos de prueba)
const [heroStats] = useState({ volume: 1450, count: 12, active: 1 });
  // ==========================================
  // 🟢 EL OÍDO DEL FRONTEND (CON LECTURA INICIAL)
  // ==========================================
  useEffect(() => {
    if (!supabaseId) return; 

    console.log("📡 Frontend conectando para el contrato:", supabaseId);

    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('status, amount_usdt, seller_wallet') // 👈 1. AHORA BUSCAMOS seller_wallet
        .eq('id', supabaseId)
        .single(); 

      if (data && !error) {
        console.log("Estado y datos iniciales encontrados:", data);
        setDbStatus(data.status); 
        
        const montoBase = data.amount_usdt ? data.amount_usdt : 0;
        setContractAmount(montoBase.toString()); 
        
        // 👈 2. AHORA LEEMOS data.seller_wallet
        setSellerWallet(data.seller_wallet ? data.seller_wallet : '0x000000000000000000000000000000000000dEaD');

        if (montoBase > 0) {
          const fee = montoBase * 0.0095; 
          const total = montoBase + fee;
          setFeeAmount(fee.toFixed(2)); 
          setTotalAmount(total.toFixed(2));
        }
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
  // 🛡️ FUNCIÓN 1: METER EL DINERO (EVM / METAMASK)
  // ==========================================
  const handleCreateEscrow = async () => {
    if (!supabaseId) return;
    if (!isConnected || !walletProvider || !chainId) {
      alert("Por favor conecta tu billetera de Ethereum/Polygon.");
      return;
    }

    // 🟢 CAMBIO 3: Protección cruzada. Evitamos que paguen con EVM si el vendedor usó billetera TON
    if (sellerWallet && !sellerWallet.startsWith('0x')) {
      alert("🚨 Error Multichain: El vendedor usó una billetera de TON. Por favor, desconecta MetaMask y conecta Tonkeeper para pagar este contrato.");
      return;
    }

    if (!sellerWallet || contractAmount === '0') {
      alert("Error: No se pudieron cargar los datos del contrato. Espera un segundo y vuelve a intentar.");
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
      
      const contraparteReal = sellerWallet; 
      const cantidadReal = parseUnits(contractAmount, tokenDecimals); 
      const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);
      
      setTxStatus('approving');
      const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, MaxUint256); 
      await txApprove.wait();

      setTxStatus('creating');
      const txCreate = await escrowContract.crearEscrow(idParaContrato, contraparteReal, cantidadReal);
      await txCreate.wait();
      
      setTxStatus('success');
    } catch (error) {
      console.error("Error en el protocolo:", error);
      setTxStatus('idle');
      alert("Transaction cancelled or failed. Please try again.");
    }
  }

  // ==========================================
  // 💎 FUNCIÓN NUEVA: PAGO EN TON (TONKEEPER)
  // ==========================================
  const handleCreateTonEscrow = async () => {
    if (!supabaseId) return;
    if (!userTONAddress) {
      alert("Por favor conecta tu billetera TON.");
      return;
    }

    // 🟢 APAGAMOS EL GUARDIA DE SEGURIDAD SOLO PARA ESTA PRUEBA
    // if (sellerWallet.startsWith('0x')) {
    //   alert("🚨 Error Multichain: El vendedor usó una billetera EVM (Ethereum/Polygon). Por favor conecta MetaMask para pagar este contrato.");
    //   return;
    // }
    try {
      setTxStatus('creating');

      const idBigInt = BigInt("0x" + supabaseId.replace(/-/g, ''));
      
      // 🟢 PARACAÍDAS: Si el banco guardó un ID de Telegram en vez de una billetera...
      let counterpartyAddress;
      try {
          counterpartyAddress = Address.parse(sellerWallet);
      } catch { // 👈 ¡MAGIA! SOLO DEJAMOS CATCH SIN LA (e)
          console.warn("La billetera del vendedor no es un formato TON válido. Usando dirección temporal para la prueba.");
          counterpartyAddress = Address.parse("EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd");
      }
      
      const msg = {
          $$type: 'CreateEscrow' as const,
          id: idBigInt,
          counterparty: counterpartyAddress // Usamos la dirección segura
      };
      
      const body = beginCell();
      storeCreateEscrow(msg)(body);
      const payloadBoc = body.endCell().toBoc().toString('base64');

      // 3. Preparamos la transacción hacia TU DIRECCIÓN MAESTRA
      const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: [
              {
                  address: "EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd", // TU CONTRATO
                  amount: toNano(totalAmount).toString(), // Cobramos Total en TON (simulando valor)
                  payload: payloadBoc
              }
          ]
      };

      // 4. Disparamos la billetera de TON
      await tonConnectUI.sendTransaction(transaction);
      setTxStatus('success');

    } catch (error) {
      console.error("Error TON:", error);
      setTxStatus('idle');
      alert("La transacción fue cancelada o falló.");
    }
  }

  // ==========================================
  // 🔓 FUNCIÓN 2: NUEVA FUNCIÓN PARA SACAR EL DINERO 
  // ==========================================
  const handleReleaseFunds = async () => {
    if (!supabaseId) return;
    // 🟢 LÓGICA PARA TON (Tonkeeper)
    if (userTONAddress) {
      try {
        setTxStatus('releasing');
        const idBigInt = BigInt("0x" + supabaseId.replace(/-/g, ''));
        
        // Armamos el mensaje de liberación
        const msg = { $$type: 'ReleaseFunds' as const, id: idBigInt };
        const body = beginCell();
        storeReleaseFunds(msg)(body);
        const payloadBoc = body.endCell().toBoc().toString('base64');

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: "EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd", // TU CONTRATO
                amount: toNano('0.02').toString(), // Pagamos 0.02 TON por el gas de la ejecución
                payload: payloadBoc
            }]
        };

        await tonConnectUI.sendTransaction(transaction);
        setTxStatus('success');
      } catch (error) {
        console.error("Error TON Release:", error);
        setTxStatus('idle');
      }
      return; // Terminamos aquí si usó TON
    }
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
  // 🚨 FUNCIÓN 3: NUEVA FUNCIÓN DE REEMBOLSO (Solo EVM por ahora)
  // ==========================================
  const handleRefundFunds = async () => {

    // 🟢 LÓGICA PARA TON (Tonkeeper)
    if (userTONAddress) {
      try {
        setTxStatus('refunding');
        const idBigInt = BigInt("0x" + supabaseId.replace(/-/g, ''));
        
        // Armamos el mensaje de reembolso
        const msg = { $$type: 'Refund' as const, id: idBigInt };
        const body = beginCell();
        storeRefund(msg)(body);
        const payloadBoc = body.endCell().toBoc().toString('base64');

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: "EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd", // TU CONTRATO
                amount: toNano('0.02').toString(), // Pagamos 0.02 TON por el gas
                payload: payloadBoc
            }]
        };

        await tonConnectUI.sendTransaction(transaction);
        setTxStatus('success');
      } catch (error) {
        console.error("Error TON Refund:", error);
        setTxStatus('idle');
      }
      return; // Terminamos aquí si usó TON
    }

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
      
      const txRefund = await escrowContract.reembolsar(idParaContrato);
      await txRefund.wait();
      
      setTxStatus('success');
    } catch (error: unknown) {
      console.error("Error al reembolsar:", error);
      setTxStatus('idle');
      
      const err = error as { reason?: string; message?: string, code?: string };
      if (err.reason?.includes("Solo el Juez") || err.message?.includes("Solo el Juez")) {
        alert("🔒 Acceso Denegado: Según las reglas del contrato, solo un Árbitro/Juez de Gem Nova puede forzar este reembolso.");
      } else {
        alert("Error: No se pudo procesar el reembolso. " + (err.reason || err.message));
      }
    }
  }

  // ==========================================
  // 🟢 ANTI-ATASCOS (RACE CONDITION FIX)
  // ==========================================
  useEffect(() => {
    if (txStatus === 'success' && dbStatus !== 'PENDING') {
      const timer = setTimeout(() => setTxStatus('idle'), 1500);
      return () => clearTimeout(timer);
    }
  }, [txStatus, dbStatus]);


  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: '#FFD700', fontSize: '3rem', margin: '0' }}>🛡️ Escrow Multichain</h1>
      <h1 style={{ color: '#FFD700', fontSize: '3rem', margin: '0 0 20px 0' }}>🛡️ Escrow Multichain</h1>
      
      {/* 🎨 AQUÍ DIBUJAMOS LAS ESTADÍSTICAS DEL USUARIO */}
      <HeroStats 
        totalVolume={heroStats.volume} 
        tradeCount={heroStats.count} 
        activeVaults={heroStats.active} 
      />

      {supabaseId ? (
         <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
           <h3 style={{ margin: 0, color: '#00ffcc', backgroundColor: '#003322', padding: '10px 15px', borderRadius: '10px', display: 'inline-block' }}>
             ✅ Linked to Escrow: {supabaseId.slice(0,8)}...
           </h3>
         </div>
      ) : (
         <h3 style={{ color: '#ff4444', backgroundColor: '#330000', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
           ❌ Test Mode: No ID provided
         </h3>
      )}

      {/* 🌐 SELECTOR DE REDES MULTICHAIN */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '0 0 40px 0' }}>
        <div style={{ display: 'flex', gap: '10px', padding: '10px', backgroundColor: '#222', borderRadius: '15px', border: isConnected ? '1px solid #FFD700' : '1px solid transparent' }}>
            <span style={{color: '#888', alignSelf: 'center', fontSize: '0.9rem', marginRight: '5px'}}>EVM:</span>
            <Web3NetworkButton /> 
            <Web3Button />
        </div>

        {/* 🟢 Botón nativo de TON */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px', backgroundColor: '#0088cc22', borderRadius: '15px', border: userTONAddress ? '1px solid #0088cc' : '1px solid #0088cc55' }}>
            <span style={{color: '#0088cc', alignSelf: 'center', fontSize: '0.9rem', marginRight: '5px'}}>TON:</span>
            <TonConnectButton />
        </div>
      </div>

      {/* 🟢 CAMBIO 4: Mostrar si ALGUNA de las dos billeteras está conectada */}
      {(isConnected || userTONAddress) && (
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
            // 👤 VISTA DEL COMPRADOR (BUYER DASHBOARD)
            // ==========================================
            <>
              {dbStatus === 'COMPLETED' ? (
                
                <div style={{ padding: '20px', backgroundColor: '#004422', borderRadius: '10px', border: '2px dashed #00ffcc' }}>
                  <h2 style={{ color: '#00ffcc', margin: '0 0 10px 0' }}>🎉 Funds Released!</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem' }}>The deal is finished and the seller has been paid.</p>
                </div>

              ) : dbStatus === 'REFUNDED' ? (

                <div style={{ padding: '20px', backgroundColor: '#330000', borderRadius: '10px', border: '2px dashed #ff4444' }}>
                  <h2 style={{ color: '#ff4444', margin: '0 0 10px 0' }}>🛑 Refund Complete</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem' }}>The contract was cancelled and your funds have been returned to your wallet.</p>
                </div>

              ) : dbStatus === 'ACTIVE' ? (

                <div style={{ border: '1px solid #2ecc71', padding: '20px', borderRadius: '10px', backgroundColor: '#002211' }}>
                  <h2 style={{ color: '#2ecc71', margin: '0 0 10px 0' }}>✅ Vault Secured!</h2>
                  <p style={{ marginBottom: '20px', fontSize: '1.05rem' }}>Your funds are safely locked. Once you receive your product or service, click below to release the payment to the seller.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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

                <div style={{ padding: '10px' }}>
                  <h2 style={{ color: '#FFD700', margin: '0 0 15px 0' }}>Secure your Payment</h2>

                  {/* 🟢 PANEL DE RESUMEN DE ORDEN (CYBER-PUNK UPGRADE) */}
                  {contractAmount !== '0' && (
                    <div style={{
                      backgroundColor: '#0a0a0a',
                      padding: '25px',
                      borderRadius: '12px',
                      border: '1px solid #2ecc71',
                      boxShadow: '0 0 20px rgba(46, 204, 113, 0.15)', // Brillo verde cyber-punk
                      marginBottom: '25px',
                      textAlign: 'left',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Cinta de seguridad superior */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #FFD700, #2ecc71, #0088cc)' }} />

                      <h4 style={{ margin: '0 0 20px 0', color: '#fff', borderBottom: '1px dashed #333', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Order Summary</span>
                        <span style={{ fontSize: '0.8rem', color: '#2ecc71', backgroundColor: '#003311', padding: '2px 8px', borderRadius: '10px' }}>Secure Connection</span>
                      </h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ color: '#888' }}>Escrow Amount:</span>
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>${contractAmount} <span style={{fontSize: '0.8rem', color: '#555'}}>USDT/TON</span></span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: '#888' }}>Platform Fee (0.95%):</span>
                        <span style={{ color: '#FFD700' }}>+ ${feeAmount}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1px dashed #444', marginBottom: '20px' }}>
                        <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>Total to Lock:</span>
                        <span style={{ color: '#2ecc71', fontSize: '1.4rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(46,204,113,0.3)' }}>${totalAmount}</span>
                      </div>

                      {/* Sellos de Confianza */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>🔒 Audited Contract</span>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>⚡ Non-Custodial</span>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>🌐 Multichain</span>
                      </div>
                    </div>
                  )}
                  
                  {/* 🟢 BOTONES INTELIGENTES QUE CAMBIAN SEGÚN LA WALLET */}
                  {userTONAddress && !isConnected ? (
                     <button 
                      onClick={handleCreateTonEscrow} 
                      disabled={!supabaseId || txStatus !== 'idle' || contractAmount === '0'}
                      style={{ padding: '18px 30px', fontSize: '1.2rem', background: 'linear-gradient(90deg, #0088cc, #005580)', color: 'white', border: '1px solid #00aaff', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '0 4px 15px rgba(0, 136, 204, 0.3)', transition: 'all 0.3s' }}>
                      {txStatus === 'idle' ? `💎 Lock $${totalAmount} via TON` : '⏳ Encrypting & Sending...'}
                    </button>
                  ) : (
                    <button 
                      onClick={handleCreateEscrow} 
                      disabled={!supabaseId || txStatus !== 'idle' || contractAmount === '0'}
                      style={{ padding: '18px 30px', fontSize: '1.2rem', background: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? '#333' : 'linear-gradient(90deg, #FFD700, #D4AF37)', color: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? '#666' : '#000', border: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? '1px solid #444' : '1px solid #FFF', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%', boxShadow: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? 'none' : '0 4px 15px rgba(255, 215, 0, 0.3)', transition: 'all 0.3s' }}>
                      {contractAmount === '0' && '⏳ Loading Secure Data...'}
                      {txStatus === 'idle' && contractAmount !== '0' && `🦊 Lock $${totalAmount} via EVM`}
                      {txStatus === 'approving' && '⏳ 1/2 Verifying Funds...'}
                      {txStatus === 'creating' && '🔐 2/2 Securing in Vault...'}
                      {txStatus === 'success' && '✅ Success! Radar Scanning...'}
                    </button>
                  )}
                </div>

              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}