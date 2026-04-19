// src/hooks/useEscrowEVM.ts
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { ESCROW_ADDRESSES, ESCROW_ABI } from '../contractConfig'; // Asegúrate de que la ruta sea correcta
import { supabase } from '../supabaseClient'; // Asegúrate de que la ruta sea correcta

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)"
];

// Creamos la interfaz de las variables que el Hook necesita recibir de App.tsx
interface EVMProps {
  supabaseId: string | null;
  isConnected: boolean;
  walletProvider: any;
  chainId: number | undefined;
  contractAmount: string;
  sellerWallet: string;
  userTONAddress: string | null;
  address: string | undefined;
  setTxStatus: (status: 'idle' | 'approving' | 'creating' | 'releasing' | 'refunding' | 'success') => void;
  setDbStatus: (status: string) => void;
}

export const useEscrowEVM = ({
  supabaseId,
  isConnected,
  walletProvider,
  chainId,
  contractAmount,
  sellerWallet,
  userTONAddress,
  address,
  setTxStatus,
  setDbStatus
}: EVMProps) => {

  // Utilidad interna para formatear el ID
  const formatearIdParaBlockchain = (uuid: string) => {
    const clean = uuid.replace(/-/g, ''); 
    return "0x" + clean.padEnd(64, '0'); 
  }

  // ==========================================
  // 🛡️ FUNCTION 1: SECURE FUNDS (CREATE)
  // ==========================================
  const handleCreateEscrow = async () => {
    if (!supabaseId) return;
    if (!isConnected || !walletProvider || !chainId) return alert("Please connect your Ethereum/Polygon wallet.");
    if (sellerWallet && !sellerWallet.startsWith('0x')) return alert("🚨 Multichain Error: The seller used a TON wallet. Please disconnect MetaMask and connect Tonkeeper.");
    if (!sellerWallet || contractAmount === '0') return alert("Error: Could not load contract data.");

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    if (!contractAddressForCurrentChain) return alert("🚧 Vault under construction on this network.");

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);
      const usdtAddress = await escrowContract.usdt();
      
      const tokenDecimals = 6; // Polygon USDT usa 6
      const idParaContrato = formatearIdParaBlockchain(supabaseId);
      
      const amountNum = parseFloat(contractAmount);
      const totalNeededNum = amountNum * 1.0095; 

      const amountWei = parseUnits(amountNum.toFixed(6), tokenDecimals); 
      const totalNeededWei = parseUnits(totalNeededNum.toFixed(6), tokenDecimals); 
      
      const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);
      
      setTxStatus('approving');
      const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, totalNeededWei); 
      await txApprove.wait();

      setTxStatus('creating');
      const txCreate = await escrowContract.crearEscrow(idParaContrato, sellerWallet, amountWei);
      await txCreate.wait();
      
      setTxStatus('success');
    } catch (error) {
      console.error("Protocol Error:", error);
      setTxStatus('idle');
      alert("Transaction cancelled or failed. Please check your balance.");
    }
  }

  // ==========================================
  // 💸 FUNCTION 2: TOP-UP (ADD FUNDS)
  // ==========================================
  const handleTopUp = async () => {
    if (!supabaseId || !isConnected || !walletProvider || !chainId) return alert("Please connect your wallet first.");

    const extraAmountStr = prompt("💰 TOP-UP ESCROW:\nEnter the additional amount in USDT you want to add to this contract:");
    if (!extraAmountStr || isNaN(Number(extraAmountStr)) || Number(extraAmountStr) <= 0) return;

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    if (!contractAddressForCurrentChain) return;

    try {
      setTxStatus('creating'); 
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);
      const usdtAddress = await escrowContract.usdt();
      const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);

      const amountNum = parseFloat(extraAmountStr);
      const feeNum = amountNum * 0.0025; 
      const totalNeededNum = amountNum + feeNum;

      const amountWei = parseUnits(amountNum.toFixed(6), 6);
      const totalNeededWei = parseUnits(totalNeededNum.toFixed(6), 6);

      const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, totalNeededWei);
      await txApprove.wait();

      const idParaContrato = formatearIdParaBlockchain(supabaseId);
      const txTopUp = await escrowContract.inyectarCapital(idParaContrato, amountWei);
      await txTopUp.wait();

      alert("✅ Top-Up Successful! The extra funds have been securely added to the vault.");
      setTxStatus('idle');
      window.location.reload(); 
    } catch (error) {
      console.error("TopUp Error:", error);
      setTxStatus('idle');
      alert("Error adding funds. Please check your balance.");
    }
  };

  // ==========================================
  // ⏳ FUNCTION 3: EXTEND TIME
  // ==========================================
  const handleExtendTime = async () => {
    if (!supabaseId || !isConnected || !walletProvider || !chainId) return alert("Please connect your wallet first.");

    const tierStr = prompt("⏳ EXTEND DEADLINE:\nSelect a package to extend the contract time:\n\n1 = +24 Hours\n3 = +3 Days\n7 = +7 Days\n14 = +14 Days\n\nEnter 1, 3, 7, or 14:");
    if (!['1', '3', '7', '14'].includes(tierStr || '')) return alert("Invalid selection.");

    const optionDays = parseInt(tierStr as string);
    const currentAmount = parseFloat(contractAmount); 

    let feeNum = 0;
    if (optionDays === 1) feeNum = Math.max(currentAmount * 0.0025, 0.50);
    else if (optionDays === 3) feeNum = Math.max(currentAmount * 0.0030, 0.75);
    else if (optionDays === 7) feeNum = Math.max(currentAmount * 0.0035, 1.00);
    else if (optionDays === 14) feeNum = Math.max(currentAmount * 0.0040, 1.50);

    const confirmation = window.confirm(`This extension will cost a fee of $${feeNum.toFixed(2)} USDT.\nDo you want to proceed?`);
    if (!confirmation) return;

    const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
    if (!contractAddressForCurrentChain) return;

    try {
      setTxStatus('creating');
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);
      const usdtAddress = await escrowContract.usdt();
      const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);
      
      const feeWei = parseUnits(feeNum.toFixed(6), 6); 

      const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, feeWei);
      await txApprove.wait();

      const idParaContrato = formatearIdParaBlockchain(supabaseId);
      const txExtend = await escrowContract.extenderTiempo(idParaContrato, optionDays);
      await txExtend.wait();

      alert(`✅ Time Extended securely by ${optionDays} days!`);
      setTxStatus('idle');
    } catch (error) {
      console.error("Extend Time Error:", error);
      setTxStatus('idle');
      alert("Error extending time. Check your USDT balance.");
    }
  };

  // ==========================================
  // ⚖️ FUNCTION 4: OPEN DISPUTE
  // ==========================================
  const handleOpenDispute = async () => {
    const reason = prompt("🚨 DISPUTE REASON:\nWhat exactly happened with this trade?");
    if (!reason) return; 
    const reporterID = prompt("🙋‍♂️ YOUR IDENTITY:\nEnter your Telegram @Username or ID so the Judge can contact you:");
    if (!reporterID) return alert("Dispute cancelled. Contact information is required.");
    const targetID = prompt("👤 COUNTERPARTY IDENTITY:\nEnter the other person's Telegram @Username (Leave empty if unknown):") || "Unknown";
    
    if (!supabaseId) return;

    setTxStatus('refunding'); 

    try {
      if (!userTONAddress && isConnected && walletProvider && chainId) {
          const contractAddressForCurrentChain = ESCROW_ADDRESSES[chainId];
          const provider = new BrowserProvider(walletProvider);
          const signer = await provider.getSigner();
          const escrowContract = new Contract(contractAddressForCurrentChain, ESCROW_ABI, signer);
          const usdtAddress = await escrowContract.usdt();
          const usdtWithSigner = new Contract(usdtAddress, ERC20_ABI, signer);

          const disputeFeeWei = parseUnits("1.0", 6);
          const txApprove = await usdtWithSigner.approve(contractAddressForCurrentChain, disputeFeeWei);
          await txApprove.wait();

          const idParaContrato = formatearIdParaBlockchain(supabaseId);
          const txDispute = await escrowContract.abrirDisputa(idParaContrato);
          await txDispute.wait();
      }

      await supabase.from('contracts').update({ status: 'DISPUTED' }).eq('id', supabaseId);
      const currentWallet = userTONAddress || address || 'Unknown';
      const dossierMessage = 
        `⚠️ --- OFFICIAL DISPUTE OPENED --- ⚠️\n\n📝 REASON: ${reason}\n🙋‍♂️ REPORTER (You): ${reporterID}\n👥 COUNTERPARTY: ${targetID}\n🔗 WALLET IN USE: ${currentWallet}\n\n⚖️ A Gem Nova Judge has been notified. The funds are locked in the Vault. Please do not close this chat.`;

      await supabase.from('messages').insert([{ contract_id: supabaseId, sender_wallet: currentWallet, message: dossierMessage }]);

      alert("✅ Dispute Registered & Vault Locked!\n\nYour info has been sent to the Judge.");
      setDbStatus('DISPUTED'); 
      setTxStatus('idle');
    } catch (error) {
      console.error("Dispute Error:", error);
      setTxStatus('idle');
      alert("Error opening dispute. Make sure you have at least $1.00 USDT.");
    }
  };

  // El Hook devuelve las funciones para que App.tsx las pueda usar
  return {
    handleCreateEscrow,
    handleTopUp,
    handleExtendTime,
    handleOpenDispute
  };
};