import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface ContractData {
    id: string;
    amount_usdt: number;
    platform_fee_usdt: number;
    status: string;
    network: string;
    created_at: string;
    seller_wallet: string; // Añadido para referencia
}

export default function AdminDashboard() {
    const [contracts, setContracts] = useState<ContractData[]>([]);
    
    // 📊 ESTADOS SEPARADOS PARA EVM Y TON
    const [evmStats, setEvmStats] = useState({ volume: 0, fees: 0, withdrawn: 0 });
    const [tonStats, setTonStats] = useState({ volume: 0, fees: 0, withdrawn: 0 });
    const [activeDisputes, setActiveDisputes] = useState(0);

    const fetchAdminData = async () => {
        const { data } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
        
        if (data) {
            const typedData = data as ContractData[];
            setContracts(typedData);
            
            let tempEvmVol = 0, tempEvmFees = 0;
            let tempTonVol = 0, tempTonFees = 0;
            let disputes = 0;

            typedData.forEach(c => {
                const amount = Number(c.amount_usdt) || 0;
                const fee = Number(c.platform_fee_usdt) || 0;

                if (c.status === 'DISPUTED') disputes++;

                if (c.network === 'TON') {
                    tempTonVol += amount;
                    tempTonFees += fee;
                } else {
                    tempEvmVol += amount;
                    tempEvmFees += fee;
                }
            });

            setEvmStats({ volume: tempEvmVol, fees: tempEvmFees, withdrawn: 0 });
            setTonStats({ volume: tempTonVol, fees: tempTonFees, withdrawn: 0 });
            setActiveDisputes(disputes);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // ⚖️ RESOLUCIÓN DE DISPUTA CON DOBLE INTERACCIÓN
    const resolveDispute = async (contract: ContractData, winner: 'COMPLETED' | 'REFUNDED') => {
        const actionName = winner === 'COMPLETED' ? "RELEASE FUNDS TO SELLER" : "REFUND FUNDS TO BUYER";
        
        // 1. PRIMERA INTERACCIÓN: Confirmación Visual
        const confirm = window.confirm(
            `🚨 MASTER JUDGE DECISION\n\n` +
            `Contract: ${contract.id.slice(0, 8)}...\n` +
            `Network: ${contract.network || 'TON'}\n` +
            `Action: ${actionName}\n\n` +
            `¿Are you sure? This will update the status in the database.`
        );

        if (!confirm) return;

        try {
            // 2. SEGUNDA INTERACCIÓN: Instrucción de Blockchain
            const blockchainMsg = contract.network === 'TON' 
                ? `💎 TON NETWORK DETECTED:\n\nPlease open your Tonkeeper and execute the 'Refund' or 'Release' function for ID: ${contract.id.replace(/-/g, '')}`
                : `🦊 EVM NETWORK DETECTED (${contract.network}):\n\nPlease open MetaMask and execute the 'reembolsar' or 'liberarPago' function in the contract.`;

            alert(blockchainMsg);

            // 3. Actualizar Base de Datos
            const { error } = await supabase
                .from('contracts')
                .update({ status: winner })
                .eq('id', contract.id);

            if (error) throw error;

            alert(`✅ Database updated to ${winner}. Dashboard will refresh.`);
            fetchAdminData(); // Recargar datos sin refrescar toda la página

        } catch (err) {
            console.error(err);
            alert("Error updating database.");
        }
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#FFD700', margin: 0 }}>⚖️ Gem Nova Master Judge</h1>
                <div style={{ backgroundColor: activeDisputes > 0 ? '#e74c3c' : '#222', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', transition: '0.3s' }}>
                    🚨 Active Disputes: {activeDisputes}
                </div>
            </div>
            
            {/* 🌐 PANEL EVM */}
            <h2 style={{ color: '#3498db', borderBottom: '1px solid #333', paddingBottom: '10px' }}>🦊 EVM Ecosystem</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                <div style={statCard}>
                    <h3 style={{ color: '#888' }}>Total Volume</h3>
                    <p style={{ fontSize: '1.8rem', margin: '10px 0', fontWeight: 'bold' }}>${evmStats.volume.toFixed(2)}</p>
                </div>
                <div style={{...statCard, border: '1px solid #2ecc71'}}>
                    <h3 style={{color: '#2ecc71'}}>Total Earned (Fees)</h3>
                    <p style={{ fontSize: '1.8rem', margin: '10px 0', fontWeight: 'bold' }}>${evmStats.fees.toFixed(2)}</p>
                </div>
                <div style={statCard}>
                    <h3 style={{ color: '#888' }}>Total Withdrawn</h3>
                    <p style={{ fontSize: '1.8rem', margin: '10px 0', fontWeight: 'bold' }}>${evmStats.withdrawn.toFixed(2)}</p>
                    <button style={btnSmall}>Withdraw EVM</button>
                </div>
            </div>

            {/* 💎 PANEL TON */}
            <h2 style={{ color: '#0088cc', borderBottom: '1px solid #333', paddingBottom: '10px' }}>💎 TON Ecosystem</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                <div style={statCard}>
                    <h3 style={{ color: '#888' }}>Total Volume</h3>
                    <p style={{ fontSize: '1.8rem', margin: '10px 0', fontWeight: 'bold' }}>${tonStats.volume.toFixed(2)}</p>
                </div>
                <div style={{...statCard, border: '1px solid #2ecc71'}}>
                    <h3 style={{color: '#2ecc71'}}>Total Earned (Fees)</h3>
                    <p style={{ fontSize: '1.8rem', margin: '10px 0', fontWeight: 'bold' }}>${tonStats.fees.toFixed(2)}</p>
                </div>
                <div style={statCard}>
                    <h3 style={{ color: '#888' }}>Total Withdrawn</h3>
                    <p style={{ fontSize: '1.8rem', margin: '10px 0', fontWeight: 'bold' }}>${tonStats.withdrawn.toFixed(2)}</p>
                    <button style={btnSmall}>Withdraw TON</button>
                </div>
            </div>

            {/* LISTA GLOBAL DE CONTRATOS */}
            <h2 style={{ color: '#FFD700', borderBottom: '1px solid #333', paddingBottom: '10px' }}>📋 All Vaults History</h2>
            <div style={{ backgroundColor: '#111', borderRadius: '15px', border: '1px solid #222', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#1a1a1a', color: '#888' }}>
                        <tr>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Network</th>
                            <th style={thStyle}>Amount</th>
                            <th style={thStyle}>Platform Fee</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
                                <td style={tdStyle}>{c.id.slice(0, 8)}...</td>
                                <td style={tdStyle}>
                                    <span style={{ backgroundColor: c.network === 'TON' ? '#0088cc22' : '#3498db22', color: c.network === 'TON' ? '#0088cc' : '#3498db', padding: '5px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {c.network || 'TON'}
                                    </span>
                                </td>
                                <td style={tdStyle}>${Number(c.amount_usdt).toFixed(2)}</td>
                                <td style={tdStyle}>${Number(c.platform_fee_usdt).toFixed(2)}</td>
                                <td style={tdStyle}>
                                    <span style={{ 
                                        color: c.status === 'DISPUTED' ? '#f39c12' : (c.status === 'COMPLETED' ? '#2ecc71' : (c.status === 'REFUNDED' ? '#e74c3c' : '#888')), 
                                        fontWeight: 'bold',
                                        backgroundColor: c.status === 'DISPUTED' ? 'rgba(243, 156, 18, 0.1)' : 'transparent',
                                        padding: '4px 8px',
                                        borderRadius: '5px'
                                    }}>
                                        {c.status}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    {c.status === 'DISPUTED' && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => resolveDispute(c, 'COMPLETED')} style={btnSuccess}>Release</button>
                                            <button onClick={() => resolveDispute(c, 'REFUNDED')} style={btnDanger}>Refund</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Estilos
const statCard = { backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '15px', border: '1px solid #222', textAlign: 'center' as const };
const thStyle = { padding: '15px', fontSize: '0.85rem', textTransform: 'uppercase' as const, letterSpacing: '1px' };
const tdStyle = { padding: '15px', fontSize: '0.95rem' };
const btnSuccess = { padding: '8px 15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const btnDanger = { padding: '8px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const btnSmall = { padding: '8px 15px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '10px' };