import { createWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import { BrowserProvider, Contract, parseUnits, MaxUint256 } from 'ethers' 
import { useState, useEffect } from 'react' 
import { ESCROW_ADDRESSES, ESCROW_ABI } from './contractConfig'

// 🔗 IMPORTAMOS LA CONEXIÓN CENTRALIZADA (Y EL CHAT)
import { VaultChat } from './VaultChat';
import { supabase } from './supabaseClient';
import AdminDashboard from './AdminDashboard'; // 👈 IMPORTACIÓN DEL PANEL DE JUEZ
import Terms from './Terms'; // 👈 🔥 IMPORTAMOS TU ARCHIVO DE TÉRMINOS AQUÍ

// 🎨 IMPORTAMOS NUESTROS COMPONENTES VISUALES
import { HeroStats } from './HeroStats';
import { ProgressTracker } from './ProgressTracker'; 
import { SellerStats } from './SellerStats'; 

// 🟢 HOOKS DE TONCONNECT Y @TON/CORE
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Address, toNano, beginCell } from '@ton/core';
import { storeCreateEscrow, storeReleaseFunds, storeRefund } from './tact_GemNovaEscrow';


// 🌐 1. EL ARSENAL DE REDES (TESTNETS)
const ethereumMainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/TU_LLAVE_ALCHEMY' // O el RPC público
}

const bscMainnet = {
  chainId: 56,
  name: 'BNB Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org' // El RPC oficial de Binance
}

const arbitrumMainnet = {
  chainId: 42161, // 👈 El ID oficial de Arbitrum One
  name: 'Arbitrum One',
  currency: 'ETH',
  explorerUrl: 'https://arbiscan.io',
  rpcUrl: 'https://arb1.arbitrum.io/rpc' 
}

const polygonMainnet = {
  chainId: 137, // 👈 El ID oficial de Polygon Mainnet
  name: 'Polygon',
  currency: 'POL',
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: 'https://polygon-rpc.com' 
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
  chains: [bscMainnet, ethereumMainnet, arbitrumMainnet, polygonMainnet],  projectId: 'cd2c2be00e014edbbf0b286967b34923',
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

  // 🔥 1. VARIABLE DE ESTADO PARA LOS TÉRMINOS
  const [showTerms, setShowTerms] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Web3Button = 'w3m-button' as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Web3NetworkButton = 'w3m-network-button' as any;

  // ESTADOS DE EVM (MetaMask)
  const { isConnected, chainId, address } = useWeb3ModalAccount() 
  const { walletProvider } = useWeb3ModalProvider()

  // ESTADOS DE TON (Tonkeeper)
  const [tonConnectUI] = useTonConnectUI();
  const userTONAddress = useTonAddress();

  // 🕵️‍♂️ CAPTURAMOS EL ID Y LA ACCIÓN
  const [supabaseId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });

  // 🚪 PUERTA TRASERA DEL SUPER ADMIN
  const isSuperAdmin = window.location.search.includes('boss=gemnova');

  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'creating' | 'releasing' | 'refunding' | 'success'>('idle');
  
  const [dbStatus, setDbStatus] = useState<string>('PENDING');
  const [contractAmount, setContractAmount] = useState<string>('0');
  const [sellerWallet, setSellerWallet] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('0');
  const [totalAmount, setTotalAmount] = useState<string>('0');

  // 🌟 NUEVOS ESTADOS PARA PERFIL KAWAI/PREMIUM
 const [contractNetwork, setContractNetwork] = useState<string>('TON');
 const [receiverName, setReceiverName] = useState<string>('External Wallet');


  // 🎨 ESTADOS PARA LAS ESTADÍSTICAS REALES (Conectadas a Supabase)
  const [heroStats, setHeroStats] = useState({ volume: 0, count: 0, active: 0 });
  const [sellerStatsData, setSellerStatsData] = useState({
    completionRate: 100, totalTrades: 0, disputeRatio: 0, disputesWon: 0, disputesLost: 0, avgTime: '< 24 hrs'
  });


  
  // ==========================================
  // 🟢 EL OÍDO DEL FRONTEND (CON LECTURA INICIAL)
  // ==========================================
  useEffect(() => {
    if (!supabaseId && !isSuperAdmin) return; 

    console.log("📡 Frontend conectando para el contrato:", supabaseId);

    const fetchInitialStatus = async () => {
      if (!supabaseId) return; 
      const { data, error } = await supabase
        .from('contracts')
        .select('status, amount_usdt, seller_wallet, recipient_wallet, network, creator_id') // 👈 Pedimos el creator_id 
        .eq('id', supabaseId)
        .single(); 

      if (data && !error) {
        console.log("Estado y datos iniciales encontrados:", data);
        setDbStatus(data.status); 
        setContractNetwork(data.network || 'TON'); 
        
        const montoBase = data.amount_usdt ? data.amount_usdt : 0;
        setContractAmount(montoBase.toString()); 
        
        const billeteraReal = data.recipient_wallet ? data.recipient_wallet : (data.seller_wallet ? data.seller_wallet : '0x000000000000000000000000000000000000dEaD');
        setSellerWallet(billeteraReal);

        const { data: userData } = await supabase
            .from('users')
            .select('username') // 👈 ESTO ES OBLIGATORIO ANTES DEL .eq()
            .eq('telegram_id', data.creator_id) // 👈 USAMOS EL TELEGRAM ID, NO LA WALLET            .eq('wallet_address', billeteraReal)
            .single();
            
        if (userData && userData.username) {
            setReceiverName(userData.username);
        }

        if (montoBase > 0) {
          const fee = montoBase * 0.0095; 
          const total = montoBase + fee;
          setFeeAmount(fee.toFixed(2)); 
          setTotalAmount(total.toFixed(2));
        }
      }
    };

    fetchInitialStatus();

    if (supabaseId) {
      const subscription = supabase
        .channel('contratos-channel')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contracts', filter: `id=eq.${supabaseId}` },
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
    }
  }, [supabaseId, isSuperAdmin]);

  // ==========================================
  // 📊 CEREBRO MATEMÁTICO: OBTENER ESTADÍSTICAS REALES
  // ==========================================
  useEffect(() => {
    const fetchRealStats = async () => {
      if (sellerWallet && sellerWallet !== '0x000000000000000000000000000000000000dEaD') {
// 👈 AQUÍ CORREGIMOS EL BUG: Buscamos por recipient_wallet
        const { data: sData } = await supabase.from('contracts').select('status').eq('recipient_wallet', sellerWallet);        if (sData) {
          const total = sData.length;
          const completed = sData.filter(c => c.status === 'COMPLETED').length;
          const refunded = sData.filter(c => c.status === 'REFUNDED').length; 
          
          setSellerStatsData({
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 100,
            totalTrades: total,
            disputeRatio: total > 0 ? Math.round((refunded / total) * 100) : 0,
            disputesWon: 0, 
            disputesLost: 0, 
            avgTime: '< 24 hrs'
          });
        }
      }

      const myWallet = userTONAddress || address;
      if (myWallet) {
        const { data: hData } = await supabase.from('contracts').select('status, amount_usdt').eq('seller_wallet', myWallet);
        if (hData) {
          setHeroStats({
            volume: hData.reduce((acc, curr) => acc + (Number(curr.amount_usdt) || 0), 0),
            count: hData.length,
            active: hData.filter(c => c.status === 'ACTIVE').length
          });
        }
      }
    };

    fetchRealStats();
  }, [sellerWallet, userTONAddress, address]);

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
      
      // 🧠 LÓGICA V2.2: Matemática Aditiva
      const amountNum = parseFloat(contractAmount);
      const totalNeededNum = amountNum * 1.0095; // Monto + 0.95% Fee

      // Convertimos a Wei (6 decimales para Polygon)
      const amountWei = parseUnits(amountNum.toFixed(6), tokenDecimals); 
      const totalNeededWei = parseUnits(totalNeededNum.toFixed(6), tokenDecimals); 
      
      const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);
      
      // 1. Aprobamos el Monto + Fee exacto
      setTxStatus('approving');
      const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, totalNeededWei); 
      await txApprove.wait();

      // 2. Ejecutamos enviando solo el 'amountWei' original (El contrato toma el total)
      setTxStatus('creating');
      const txCreate = await escrowContract.crearEscrow(idParaContrato, contraparteReal, amountWei);
      await txCreate.wait();
      
      setTxStatus('success');
    } catch (error) {
      console.error("Error en el protocolo:", error);
      setTxStatus('idle');
      alert("La transacción fue cancelada o falló. Revisa tu saldo.");
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

    try {
      setTxStatus('creating');

      const idBigInt = BigInt("0x" + supabaseId.replace(/-/g, ''));
      let counterpartyAddress;
      try {
          counterpartyAddress = Address.parse(sellerWallet);
      } catch { 
          counterpartyAddress = Address.parse("EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd");
      }
      
      const msg = {
          $$type: 'CreateEscrow' as const,
          id: idBigInt,
          counterparty: counterpartyAddress 
      };
      
      const body = beginCell();
      storeCreateEscrow(msg)(body);
      const payloadBoc = body.endCell().toBoc().toString('base64');

      const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: [
              {
                  address: "EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd", 
                  amount: toNano(totalAmount).toString(), 
                  payload: payloadBoc
              }
          ]
      };

      await tonConnectUI.sendTransaction(transaction);
      
      // 🚀 LA CURA EXCLUSIVA PARA TON: Forzamos el estado a ACTIVE
      await supabase.from('contracts').update({ status: 'ACTIVE' }).eq('id', supabaseId);
      setDbStatus('ACTIVE');
      
      setTxStatus('success');

    } catch (error) {
      console.error("Error TON:", error);
      setTxStatus('idle');
      alert("La transacción fue cancelada o falló.");
    }
  }

 // ==========================================
  // 🔓 FUNCIÓN 2: LIBERAR FONDOS (SOLO BUYER)
  // ==========================================
  const handleReleaseFunds = async () => {
    if (!supabaseId) return;
    
    // 👇 ESTE ES EL BLOQUE DE TON QUE DEBES REEMPLAZAR 👇
    if (userTONAddress) {
      try {
        setTxStatus('releasing');
        const idBigInt = BigInt("0x" + supabaseId.replace(/-/g, ''));
        
        const msg = { $$type: 'ReleaseFunds' as const, id: idBigInt };
        const body = beginCell();
        storeReleaseFunds(msg)(body);
        const payloadBoc = body.endCell().toBoc().toString('base64');

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: "EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd", 
                amount: toNano('0.02').toString(), 
                payload: payloadBoc
            }]
        };

        await tonConnectUI.sendTransaction(transaction);
        
        // 🚀 LA CURA EXCLUSIVA PARA TON: Forzamos el estado a COMPLETED
        await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', supabaseId);
        setDbStatus('COMPLETED');
        
        setTxStatus('success');
      } catch (error) {
        console.error("Error TON Release:", error);
        setTxStatus('idle');
      }
      return; 
    }
    // 👆 HASTA AQUÍ EL BLOQUE DE TON 👆

    // ... (Deja el resto del código de EVM exactamente como está) ...
    if (!isConnected || !walletProvider || !chainId) return alert("Por favor conecta tu billetera.");

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    if (!contractAddressForCurrentChain || contractAddressForCurrentChain === "") return alert("🚧 Bóveda en construcción en esta red.");

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
  // 🚨 FUNCIÓN 3: SISTEMA DE REEMBOLSOS (SOLO SELLER / JUEZ)
  // ==========================================
  const handleRefundFunds = async () => {
    // Nota: El botón de Refund voluntario no pide razón. 
    // Esta función asume que el vendedor (o juez) está devolviendo el dinero legítimamente.
    if (!supabaseId || (!userTONAddress && (!isConnected || !walletProvider || !chainId))) return alert("Please connect your wallet first.");

    // 👇 ESTE ES EL BLOQUE DE TON QUE DEBES REEMPLAZAR 👇
    if (userTONAddress) {
      try {
        setTxStatus('refunding');
        const idBigInt = BigInt("0x" + supabaseId.replace(/-/g, ''));
        const msg = { $$type: 'Refund' as const, id: idBigInt };
        const body = beginCell();
        storeRefund(msg)(body);
        const payloadBoc = body.endCell().toBoc().toString('base64');

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{ address: "EQCsagpCK6aagQFs4owb-7AewXsNHwOeMdhzg4Cwo9MhCCAd", amount: toNano('0.02').toString(), payload: payloadBoc }]
        };
        
        await tonConnectUI.sendTransaction(transaction);
        
        // 🚀 LA CURA EXCLUSIVA PARA TON: Forzamos el estado a REFUNDED
        await supabase.from('contracts').update({ status: 'REFUNDED' }).eq('id', supabaseId);
        setDbStatus('REFUNDED');
        
        setTxStatus('success');
      } catch (error) {
        console.error("Error TON Refund:", error);
        setTxStatus('idle');
      }
      return; 
    }
    // 👆 HASTA AQUÍ EL BLOQUE DE TON 👆

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId!];
    if (!contractAddressForCurrentChain || contractAddressForCurrentChain === "") return;

    try {
      const provider = new BrowserProvider(walletProvider!);
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
      alert("Error: " + (err.reason || err.message));
    }
  }

  // ==========================================
  // ⚖️ FUNCIÓN 4: ABRIR DISPUTA (MODO DETECTIVE)
  // ==========================================
  const handleOpenDispute = async () => {
    // 1. Recolectamos la información mediante prompts
    const reason = prompt("🚨 DISPUTE REASON:\nWhat exactly happened with this trade?");
    if (!reason) return; // Si el usuario cancela, detenemos el proceso

    const reporterID = prompt("🙋‍♂️ YOUR IDENTITY:\nEnter your Telegram @Username or ID so the Judge can contact you:");
    if (!reporterID) return alert("Dispute cancelled. Contact information is required.");

    const targetID = prompt("👤 COUNTERPARTY IDENTITY:\nEnter the other person's Telegram @Username (Leave empty if unknown):") || "Unknown";

    if (!supabaseId) return;

    setTxStatus('refunding'); // Usamos el estado de carga visual
    try {
      // 2. Bloqueamos el contrato en la Base de Datos (Estado DISPUTED)
      await supabase.from('contracts').update({ status: 'DISPUTED' }).eq('id', supabaseId);

      // 3. CREAMOS EL "DOSSIER" PARA EL CHAT (Sin tocar tablas extra en Supabase)
      const currentWallet = userTONAddress || address || 'Unknown';
      const dossierMessage = 
        `⚠️ --- OFFICIAL DISPUTE OPENED --- ⚠️\n\n` +
        `📝 REASON: ${reason}\n` +
        `🙋‍♂️ REPORTER (You): ${reporterID}\n` +
        `👥 COUNTERPARTY: ${targetID}\n` +
        `🔗 WALLET IN USE: ${currentWallet}\n\n` +
        `⚖️ A Gem Nova Judge has been notified. The funds are locked in the Vault. Please do not close this chat.`;

      // 4. Enviamos el mensaje al chat
      await supabase.from('messages').insert([{
        contract_id: supabaseId,
        sender_wallet: currentWallet, // Lo mandamos desde la wallet del usuario para que quede registrado quién abrió la disputa
        message: dossierMessage
      }]);

      alert("✅ Dispute Registered!\n\nYour contact info and reason have been sent to the Judge via the secure chat. Please keep this tab open or check the bot for updates.");
      
      // 5. Actualizamos la pantalla al instante para mostrar el estado "Under Review"
      setDbStatus('DISPUTED'); 
      setTxStatus('idle');
    } catch (error) {
      console.error("Error opening dispute:", error);
      setTxStatus('idle');
      alert("Error opening dispute. Please try again.");
    }
  };

  useEffect(() => {
    if (txStatus === 'success' && dbStatus !== 'PENDING') {
      const timer = setTimeout(() => setTxStatus('idle'), 1500);
      return () => clearTimeout(timer);
    }
  }, [txStatus, dbStatus]);

  // Si estamos en la URL del jefe, mostramos el Admin Dashboard inmediatamente
  if (isSuperAdmin) {
    return <AdminDashboard />;
  }

  const isSeller = (userTONAddress || address || '').toLowerCase() === sellerWallet.toLowerCase();

  // 🔥 2. SI EL USUARIO HIZO CLIC EN TÉRMINOS, MOSTRAMOS LA PANTALLA COMPLETA LEGAL
  if (showTerms) {
    return (
      <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: '20px', position: 'relative' }}>
        <button 
          onClick={() => setShowTerms(false)}
          style={{ position: 'fixed', top: '20px', right: '20px', padding: '10px 20px', backgroundColor: '#333', color: '#FFF', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', zIndex: 50 }}
        >
          ❌ Close Terms
        </button>
        <Terms />
      </div>
    );
  }

  // 🛡️ 3. SI NO, MOSTRAMOS LA BÓVEDA NORMAL
  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: '#FFD700', fontSize: '3rem', margin: '0 0 20px 0' }}>🛡️ Escrow Multichain</h1>
      
      <HeroStats totalVolume={heroStats.volume} tradeCount={heroStats.count} activeVaults={heroStats.active} />

      {supabaseId ? (
         <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
           <h3 style={{ margin: 0, color: '#00ffcc', backgroundColor: '#003322', padding: '10px 15px', borderRadius: '10px', display: 'inline-block', border: '1px solid #00ffcc' }}>
             ✅ Linked to Escrow: {supabaseId.slice(0,8)}...
           </h3>
           <button 
             onClick={() => {
               navigator.clipboard.writeText(window.location.href);
               alert("🔗 Secure Link Copied! Send this to your counterparty.");
             }}
             style={{ padding: '8px 20px', backgroundColor: '#0088cc', color: 'white', border: '1px solid #00aaff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0, 136, 204, 0.3)' }}
           >
             📋 Copy Secure Link
           </button>
         </div>
      ) : (
         <h3 style={{ color: '#ff4444', backgroundColor: '#330000', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>❌ Test Mode: No ID provided</h3>
      )}

      {/* 🌐 SELECTORES DE BILLETERA (Siempre visibles para poder conectar) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', margin: '0 0 40px 0' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', padding: '10px', backgroundColor: '#222', borderRadius: '15px', border: isConnected ? '1px solid #FFD700' : '1px solid transparent' }}>
                <span style={{color: '#888', alignSelf: 'center', fontSize: '0.9rem', marginRight: '5px'}}>EVM:</span>
                <Web3NetworkButton /> 
                <Web3Button />
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '10px', backgroundColor: '#0088cc22', borderRadius: '15px', border: userTONAddress ? '1px solid #0088cc' : '1px solid #0088cc55' }}>
                <span style={{color: '#0088cc', alignSelf: 'center', fontSize: '0.9rem', marginRight: '5px'}}>TON:</span>
                <TonConnectButton />
            </div>
        </div>

        {/* 🆘 LOS BOTONES SALVAVIDAS PARA TELEGRAM (MOBILE FIX) */}
        {!isConnected && !userTONAddress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                <p style={{ color: '#888', fontSize: '0.8rem', margin: '0' }}>Stuck in Telegram? Open in your wallet:</p>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {/* Botón de MetaMask */}
                    <button 
                        onClick={() => {
                            const currentUrl = window.location.href.replace(/^https?:\/\//, '');
                            window.location.href = `https://metamask.app.link/dapp/${currentUrl}`;
                        }}
                        style={{ padding: '8px 15px', backgroundColor: '#F6851B', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        🦊 MetaMask
                    </button>

                    {/* Botón de Trust Wallet */}
                    <button 
                        onClick={() => {
                            const encodedUrl = encodeURIComponent(window.location.href);
                            window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodedUrl}`;
                        }}
                        style={{ padding: '8px 15px', backgroundColor: '#3375BB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        🛡️ Trust Wallet
                    </button>

                    {/* El Comodín Universal */}
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("🔗 Link copied! Open Chrome, Safari or your Wallet's browser and paste it to connect.");
                        }}
                        style={{ padding: '8px 15px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        🌐 Copy Link
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* SOLO MUESTRA LA BÓVEDA SI HAY WALLET CONECTADA */}
      {(isConnected || userTONAddress) && (
        <div style={{ backgroundColor: '#2a2a2a', padding: '30px', borderRadius: '15px', maxWidth: '600px', margin: '0 auto', border: '1px solid #FFD700' }}>
          
          <ProgressTracker status={dbStatus} />

          {/* 💬 BÓVEDA DE CHAT */}
          <VaultChat contractId={supabaseId!} currentUserWallet={userTONAddress || address || ''} status={dbStatus} />
  
          {/* ======================================================== */}
          {/* LÓGICA DE INTERFAZ ESTRICTA: SELLER VS BUYER             */}
          {/* ======================================================== */}

          {isSeller ? (
            // 👨‍💻 VISTA DEL CREADOR (SELLER/MERCHANT)
            <div style={{ marginTop: '20px' }}>
              
              {/* PANGO DEL CREADOR SEGÚN EL ESTATUS */}
              {dbStatus === 'PENDING' && (
                <div style={{ padding: '20px', backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333' }}>
                  <h3 style={{ color: '#FFD700', margin: '0 0 10px 0' }}>⏳ Awaiting Deposit</h3>
                  <p style={{ margin: 0, color: '#aaa' }}>The client has not locked the funds yet. Please wait.</p>
                </div>
              )}

              {dbStatus === 'ACTIVE' && (
                <div style={{ padding: '20px', backgroundColor: '#001a33', borderRadius: '10px', border: '2px solid #3498db' }}>
                  <h3 style={{ color: '#3498db', marginTop: 0 }}>👨‍💻 Merchant Control Panel</h3>
                  <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '20px' }}>Funds are secured. Deliver your work. If requested, you can refund or dispute.</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleRefundFunds} style={{ flex: 1, padding: '12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                      🛑 Refund Buyer
                    </button>
                    {/* 👇 CAMBIADO A handleOpenDispute */}
                    <button onClick={handleOpenDispute} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#f39c12', border: '1px solid #f39c12', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                      ⚠️ Open Dispute
                    </button>
                  </div>
                </div>
              )}

              {dbStatus === 'COMPLETED' && (
                <div style={{ padding: '20px', backgroundColor: '#004422', borderRadius: '10px', border: '2px dashed #00ffcc' }}>
                  <h3 style={{ color: '#9b59b6', margin: '0 0 10px 0' }}>🎉 Payment Released</h3>
                  <p style={{ margin: 0, color: '#ccc' }}>The client approved your work. The funds have been sent to your wallet!</p>
                </div>
              )}

              {dbStatus === 'REFUNDED' && (
                <div style={{ padding: '20px', backgroundColor: '#330000', borderRadius: '10px', border: '2px dashed #ff4444' }}>
                  <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>🛑 Deal Cancelled</h3>
                  <p style={{ margin: 0, color: '#ccc' }}>The buyer has requested a refund and the escrow is now closed.</p>
                </div>
              )}
              {/* ESTADO DE DISPUTA ABIERTA */}
              {dbStatus === 'DISPUTED' && (
                <div style={{ padding: '20px', backgroundColor: '#331a00', borderRadius: '10px', border: '2px dashed #f39c12', marginTop: '20px' }}>
                  <h2 style={{ color: '#f39c12', margin: '0 0 10px 0' }}>⚖️ Under Review</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem', color: '#ccc' }}>This contract is currently locked. A Gem Nova Judge is reviewing the chat history to resolve the dispute.</p>
                </div>
              )}
            </div>

          ) : (

            // 👤 VISTA DEL CLIENTE (BUYER)
            <div style={{ marginTop: '20px' }}>
              
              {/* 🌟 PASAMOS LOS NUEVOS DATOS A LA TARJETA DEL RECEPTOR */}
              {sellerWallet && <SellerStats sellerAddress={sellerWallet} stats={sellerStatsData} network={contractNetwork} name={receiverName} />}

              {/* PANEL DEL CLIENTE SEGÚN EL ESTATUS */}
              {dbStatus === 'PENDING' && (
                <div>
                  <h2 style={{ color: '#FFD700', margin: '15px 0' }}>Secure your Payment</h2>
                  {contractAmount !== '0' && (
                    <div style={{ backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '12px', border: '1px solid #2ecc71', boxShadow: '0 0 20px rgba(46, 204, 113, 0.15)', marginBottom: '25px', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #FFD700, #2ecc71, #0088cc)' }} />
                      <h4 style={{ margin: '0 0 20px 0', color: '#fff', borderBottom: '1px dashed #333', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Order Summary</span>
                        <span style={{ fontSize: '0.8rem', color: '#2ecc71', backgroundColor: '#003311', padding: '2px 8px', borderRadius: '10px' }}>Secure Connection</span>
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#888' }}>Escrow Amount:</span><span style={{ color: '#fff', fontWeight: 'bold' }}>${contractAmount} USDT</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><span style={{ color: '#888' }}>Platform Fee (0.95%):</span><span style={{ color: '#FFD700' }}>+ ${feeAmount}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1px dashed #444', marginBottom: '20px' }}><span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>Total to Lock:</span><span style={{ color: '#2ecc71', fontSize: '1.4rem', fontWeight: 'bold' }}>${totalAmount}</span></div>
                    </div>
                  )}
                  {userTONAddress && !isConnected ? (
                    <button onClick={handleCreateTonEscrow} disabled={!supabaseId || txStatus !== 'idle' || contractAmount === '0'} style={{ padding: '18px 30px', fontSize: '1.2rem', background: 'linear-gradient(90deg, #0088cc, #005580)', color: 'white', border: '1px solid #00aaff', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}>
                      {txStatus === 'idle' ? `💎 Lock $${totalAmount} via TON` : '⏳ Encrypting & Sending...'}
                    </button>
                  ) : (
                    <button onClick={handleCreateEscrow} disabled={!supabaseId || txStatus !== 'idle' || contractAmount === '0'} style={{ padding: '18px 30px', fontSize: '1.2rem', background: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? '#333' : 'linear-gradient(90deg, #FFD700, #D4AF37)', color: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? '#666' : '#000', border: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? '1px solid #444' : '1px solid #FFF', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle' || contractAmount === '0') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}>
                      {contractAmount === '0' && '⏳ Loading Secure Data...'}
                      {txStatus === 'idle' && contractAmount !== '0' && `🦊 Lock $${totalAmount} via EVM`}
                      {txStatus === 'approving' && '⏳ 1/2 Verifying Funds...'}
                      {txStatus === 'creating' && '🔐 2/2 Securing in Vault...'}
                      {txStatus === 'success' && '✅ Success! Radar Scanning...'}
                    </button>
                  )}
                </div>
              )}

              {dbStatus === 'ACTIVE' && (
                <div style={{ border: '1px solid #2ecc71', padding: '20px', borderRadius: '10px', backgroundColor: '#002211', marginTop: '20px' }}>
                  <h2 style={{ color: '#2ecc71', margin: '0 0 10px 0' }}>✅ Vault Secured!</h2>
                  <p style={{ marginBottom: '20px', fontSize: '1.05rem' }}>Your funds are safely locked. Once you receive your product or service, release the payment.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button onClick={handleReleaseFunds} disabled={!supabaseId || txStatus !== 'idle'} style={{ padding: '15px 30px', fontSize: '1.2rem', backgroundColor: (!supabaseId || txStatus !== 'idle') ? '#555' : '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}>
                      {txStatus === 'idle' && '🔓 Confirm Delivery & Release'}
                      {txStatus === 'releasing' && '⌛ Processing Release...'}
                      {txStatus === 'success' && '✅ Done! Waiting for Radar...'}
                    </button>
                    {/* 👇 CAMBIADO A handleOpenDispute */}
                    <button onClick={handleOpenDispute} disabled={!supabaseId || txStatus !== 'idle'} style={{ padding: '10px 20px', fontSize: '1rem', backgroundColor: 'transparent', color: (!supabaseId || txStatus !== 'idle') ? '#777' : '#e74c3c', border: (!supabaseId || txStatus !== 'idle') ? '1px solid #777' : '1px solid #e74c3c', borderRadius: '8px', cursor: (!supabaseId || txStatus !== 'idle') ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}>
                      {txStatus === 'idle' && '🚨 Dispute Order'}
                      {txStatus === 'refunding' && '⌛ Processing Dispute...'}
                    </button>
                  </div>
                </div>
              )}

              {dbStatus === 'COMPLETED' && (
                <div style={{ padding: '20px', backgroundColor: '#004422', borderRadius: '10px', border: '2px dashed #00ffcc', marginTop: '20px' }}>
                  <h2 style={{ color: '#00ffcc', margin: '0 0 10px 0' }}>🎉 Funds Released!</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem' }}>The deal is finished and the seller has been paid.</p>
                </div>
              )}

              {dbStatus === 'REFUNDED' && (
                <div style={{ padding: '20px', backgroundColor: '#330000', borderRadius: '10px', border: '2px dashed #ff4444', marginTop: '20px' }}>
                  <h2 style={{ color: '#ff4444', margin: '0 0 10px 0' }}>🛑 Refund Complete</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem' }}>The contract was cancelled and your funds have been returned to your wallet.</p>
                </div>
              )}
              {/* ESTADO DE DISPUTA ABIERTA */}
              {dbStatus === 'DISPUTED' && (
                <div style={{ padding: '20px', backgroundColor: '#331a00', borderRadius: '10px', border: '2px dashed #f39c12', marginTop: '20px' }}>
                  <h2 style={{ color: '#f39c12', margin: '0 0 10px 0' }}>⚖️ Under Review</h2>
                  <p style={{ margin: '0', fontSize: '1.1rem', color: '#ccc' }}>This contract is currently locked. A Gem Nova Judge is reviewing the chat history to resolve the dispute.</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* 🔥 4. AQUÍ ESTÁ EL BOTÓN QUE ABRE LOS TÉRMINOS */}
      <div style={{ marginTop: '50px', paddingBottom: '20px' }}>
        <button 
          onClick={() => setShowTerms(true)}
          style={{ background: 'none', border: 'none', color: '#aaa', textDecoration: 'none', fontSize: '0.9rem', borderBottom: '1px dashed #555', paddingBottom: '2px', cursor: 'pointer' }}
        >
          Terms of Service & Privacy
        </button>
      </div>

    </div>
  )
}