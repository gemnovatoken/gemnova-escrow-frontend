import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// 1. SOLUCIÓN AL "ANY": Le decimos a TypeScript exactamente qué esperar
interface ContractData {
    id: string;
    amount_usdt: number;
    platform_fee_usdt: number;
    status: string;
    network: string;
    created_at: string;
}

export default function AdminDashboard() {
    // Usamos nuestra nueva interface en lugar de "any"
    const [contracts, setContracts] = useState<ContractData[]>([]);
    const [stats, setStats] = useState({ volume: 0, fees: 0, disputes: 0 });

    useEffect(() => {
        // 2. SOLUCIÓN AL EFECTO: Definimos la función DENTRO del useEffect
        const fetchAdminData = async () => {
            const { data } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
            if (data) {
                // Forzamos a TypeScript a entender que la data es de tipo ContractData[]
                const typedData = data as ContractData[];
                setContracts(typedData);
                
                const totalVol = typedData.reduce((acc, c) => acc + (c.amount_usdt || 0), 0);
                const totalFees = typedData.reduce((acc, c) => acc + (c.platform_fee_usdt || 0), 0);
                const totalDisputes = typedData.filter(c => c.status === 'DISPUTED').length;
                
                setStats({ volume: totalVol, fees: totalFees, disputes: totalDisputes });
            }
        };

        fetchAdminData();
    }, []); // Al poner la función adentro, el linter de React se queda tranquilo

    const resolveDispute = async (id: string, winner: 'COMPLETED' | 'REFUNDED') => {
        const confirm = window.confirm(`Are you sure you want to resolve this dispute as ${winner}? This action is irreversible on the blockchain.`);
        if (!confirm) return;
        
        // Aquí llamarías a tu Smart Contract para forzar la transacción
        alert("Action sent to Smart Contract. The Judge has spoken.");
        
        await supabase.from('contracts').update({ status: winner }).eq('id', id);
        
        // Refrescamos la página para ver el cambio (más seguro y evita el warning de dependencias)
        window.location.reload(); 
    };

    return (
        <div style={{ padding: '30px', backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ color: '#FFD700' }}>⚖️ Gem Nova Judge Panel</h1>
            
            {/* ESTADÍSTICAS BANCARIAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                <div style={statCard}><h3>Volume</h3><p>${stats.volume.toFixed(2)}</p></div>
                <div style={statCard}><h3 style={{color: '#2ecc71'}}>Platform Fees</h3><p>${stats.fees.toFixed(2)}</p></div>
                <div style={statCard}><h3 style={{color: '#e74c3c'}}>Active Disputes</h3><p>{stats.disputes}</p></div>
            </div>

            {/* LISTA DE CONTRATOS */}
            <div style={{ backgroundColor: '#111', borderRadius: '15px', border: '1px solid #222', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#1a1a1a', color: '#888' }}>
                        <tr>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Amount</th>
                            <th style={thStyle}>Network</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
                                <td style={tdStyle}>{c.id.slice(0, 8)}...</td>
                                <td style={tdStyle}>${c.amount_usdt}</td>
                                <td style={tdStyle}>{c.network || 'TON'}</td>
                                <td style={tdStyle}><span style={{ color: c.status === 'DISPUTED' ? '#e74c3c' : '#888' }}>{c.status}</span></td>
                                <td style={tdStyle}>
                                    {c.status === 'DISPUTED' && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => resolveDispute(c.id, 'COMPLETED')} style={btnSuccess}>Release</button>
                                            <button onClick={() => resolveDispute(c.id, 'REFUNDED')} style={btnDanger}>Refund</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* BOTÓN DE RETIRO (TU DINERO) */}
            <div style={{ marginTop: '50px', textAlign: 'center' }}>
                <button style={{ padding: '20px 40px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer' }}>
                    💰 WITHDRAW PLATFORM PROFITS
                </button>
            </div>
        </div>
    );
}

// Estilos rápidos
const statCard = { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #222', textAlign: 'center' as const };
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px' };
const btnSuccess = { padding: '8px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const btnDanger = { padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };