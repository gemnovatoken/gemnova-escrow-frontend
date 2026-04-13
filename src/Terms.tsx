import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-gray-900 p-8 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
        <h1 className="text-3xl font-bold text-yellow-500 mb-6 border-b border-yellow-500/30 pb-4">
          Terms of Service - Gem Nova Vault
        </h1>
        <p className="text-sm text-gray-400 mb-6">Last Updated: April 13, 2026</p>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using Gem Nova Vault ("the Platform", "we", "our"), you ("the User", "Buyer", "Seller") agree to be bound by these Terms of Service. If you do not agree to any part of these terms, you must not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Nature of the Service (Non-Custodial)</h2>
            <p>Gem Nova Vault provides a software interface and smart contracts to facilitate multi-chain P2P (Peer-to-Peer) transactions.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>We are not a financial institution:</strong> The Platform does not have custody, control, or access to your funds at any time. Funds are locked directly on the blockchain via automated, non-custodial smart contracts.</li>
              <li><strong>Nature of agreements:</strong> We are not a party to any commercial agreement, contract, or exchange of goods/services between users. We solely provide the technological infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Blockchain Technology Risks</h2>
            <p>The use of cryptocurrencies and smart contracts carries inherent risks. The User acknowledges and agrees that:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The Platform is not responsible for network congestion, variations in transaction costs (gas fees), or failures in the underlying blockchains (TON, BSC, Polygon, etc.).</li>
              <li>Blockchain transactions are irreversible. Once funds are released by the smart contract, the Platform cannot reverse the transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Dispute Resolution and Arbitration</h2>
            <p>In the event of a disagreement between the Buyer and the Seller, either party may initiate a dispute through our integrated vault chat system.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>By using the Escrow service, users agree that the Platform's administration team will act as the final arbitrator.</li>
              <li>The arbitrator's decision will be based on the evidence provided within the vault chat and shall be final and binding.</li>
              <li>The Platform reserves the right to charge an administrative fee or a percentage of the transaction for the dispute resolution service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. User Responsibilities</h2>
            <p>The User agrees to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Not use the Platform to facilitate the exchange of illegal or fraudulent goods or services, or anything that violates the laws of their jurisdiction.</li>
              <li>Provide truthful information and evidence in the event of a dispute.</li>
              <li>Maintain the security and confidentiality of their private keys and seed phrases. Loss of access to your wallet will result in the permanent loss of locked funds.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Gem Nova Vault, its developers, founders, and future acquirers shall not be liable for any direct, indirect, incidental, or consequential damages, including loss of profits, data, or funds, resulting from:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The use or inability to use the Platform.</li>
              <li>Unauthorized access to your wallet.</li>
              <li>Errors, unforeseen vulnerabilities (hacks) in blockchain networks, or critical failures beyond our control.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Modifications to the Platform</h2>
            <p>We reserve the right to modify, suspend, or discontinue any aspect of the Platform at any time, including compatibility with certain blockchain networks, without prior notice.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;