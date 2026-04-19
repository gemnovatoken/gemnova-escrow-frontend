// src/hooks/useEscrowFeatures.ts
import { BrowserProvider, Contract, parseUnits, type Eip1193Provider } from 'ethers';import { ESCROW_ADDRESSES, ESCROW_ABI } from '../contractConfig'; 

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)"
];

// Definimos qué datos necesita este archivo de tu App.tsx
interface FeaturesProps {
  supabaseId: string | null;
  isConnected: boolean;
  walletProvider: Eip1193Provider | undefined; // 👈 La solución profesional
  chainId: number | undefined;
  contractAmount: string;
  setTxStatus: (status: 'idle' | 'approving' | 'creating' | 'releasing' | 'refunding' | 'success') => void;
}

export const useEscrowFeatures = ({
  supabaseId,
  isConnected,
  walletProvider,
  chainId,
  contractAmount,
  setTxStatus
}: FeaturesProps) => {

  // Utilidad interna para formatear el ID
  const formatearIdParaBlockchain = (uuid: string) => {
    const clean = uuid.replace(/-/g, ''); 
    return "0x" + clean.padEnd(64, '0'); 
  }

  // ==========================================
  // 💸 FUNCTION: TOP-UP (ADD FUNDS)
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
      const feeNum = amountNum * 0.0025; // 0.25% Fee
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
      window.location.reload(); // Recarga para actualizar el monto en pantalla
    } catch (error) {
      console.error("TopUp Error:", error);
      setTxStatus('idle');
      alert("Error adding funds. Please check your balance and try again.");
    }
  };

  // ==========================================
  // ⏳ FUNCTION: EXTEND TIME
  // ==========================================
  const handleExtendTime = async () => {
    if (!supabaseId || !isConnected || !walletProvider || !chainId) return alert("Please connect your wallet first.");

    const tierStr = prompt("⏳ EXTEND DEADLINE:\nSelect a package to extend the contract time:\n\n1 = +24 Hours\n3 = +3 Days\n7 = +7 Days\n14 = +14 Days\n\nEnter 1, 3, 7, or 14:");
    if (!['1', '3', '7', '14'].includes(tierStr || '')) return alert("Invalid selection. Extension cancelled.");

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
      alert("Error extending time. Make sure you have enough USDT for the extension fee.");
    }
  };

  // Retornamos las funciones para usarlas en App.tsx
  return {
    handleTopUp,
    handleExtendTime
  };
};