import type { CSSProperties } from 'react';

interface SellerStatsProps {
  sellerAddress: string;
  stats: {
    completionRate: number;
    totalTrades: number;
    disputeRatio: number;
    disputesWon?: number; 
    disputesLost?: number;
    avgTime: string;
  };
  network: string; 
  name: string;    
}

export const SellerStats = ({ sellerAddress, stats, network, name }: SellerStatsProps) => {
  const shortAddress = sellerAddress ? `${sellerAddress.slice(0,6)}...${sellerAddress.slice(-4)}` : 'Unknown';

  // 🎨 DICCIONARIO DE LOGOS
  const NETWORK_LOGOS: Record<string, string> = {
      'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      'BNB': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      'ARB': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
      'POLYGON': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
      'TON': 'https://cryptologos.cc/logos/toncoin-ton-logo.png'
  };

  const logoUrl = NETWORK_LOGOS[network] || NETWORK_LOGOS['TON'];

  return (
    <div style={containerStyle}>
      {/* Encabezado del Perfil */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* AVATAR + LOGO DE RED */}
          <div style={{ position: 'relative' }}>
            <div style={avatarStyle}>👤</div>
            <img 
                src={logoUrl} 
                alt={network} 
                style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '20px', height: '20px', backgroundColor: '#000', borderRadius: '50%', padding: '2px', objectFit: 'contain' }} 
            />
          </div>

          <div>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {name} <span style={{ color: '#FFD700', fontSize: '0.9rem' }}>✔️</span>
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#00ffcc', fontFamily: 'monospace' }}>Wallet: {shortAddress}</span>
          </div>
        </div>
        <div style={badgeStyle}>
          ⭐ Verified
        </div>
      </div>

      {/* Cuadrícula de Estadísticas Limpia */}
      <div style={gridStyle}>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Completion Rate</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={valueStyle}>{stats.completionRate}%</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>({stats.totalTrades} trades)</span>
          </div>
        </div>

        <div style={statBoxStyle}>
          <span style={labelStyle}>Avg. Time</span>
          <span style={valueStyle}>{stats.avgTime}</span>
        </div>

        <div style={{...statBoxStyle, gridColumn: '1 / -1', borderTop: '1px dashed #333', marginTop: '5px', paddingTop: '15px'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={labelStyle}>Dispute Ratio</span>
              <span style={{...valueStyle, color: stats.disputeRatio > 10 ? '#ff4444' : '#FFD700', marginLeft: '10px'}}>{stats.disputeRatio}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Estilos ---
const containerStyle: CSSProperties = { backgroundColor: '#0a0a0a', borderRadius: '15px', padding: '20px', marginBottom: '25px', border: '1px solid #222', textAlign: 'left', width: '100%', boxSizing: 'border-box' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '15px', marginBottom: '15px' };
const avatarStyle: CSSProperties = { width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' };
const badgeStyle: CSSProperties = { backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', padding: '5px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const statBoxStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const labelStyle: CSSProperties = { color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' };
const valueStyle: CSSProperties = { color: '#fff', fontSize: '1.3rem', fontWeight: 'bold' };