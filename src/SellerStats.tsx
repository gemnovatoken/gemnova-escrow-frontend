// Archivo: src/SellerStats.tsx
import type { CSSProperties } from 'react';

// 1. Ahora le decimos que recibirá todas estas estadísticas reales
interface SellerStatsProps {
  sellerAddress: string;
  stats: {
    completionRate: number;
    totalTrades: number;
    disputeRatio: number;
    disputesWon: number;
    disputesLost: number;
    avgTime: string;
  };
}

export const SellerStats = ({ sellerAddress, stats }: SellerStatsProps) => {
  const shortAddress = sellerAddress ? `${sellerAddress.slice(0,6)}...${sellerAddress.slice(-4)}` : 'Unknown';

  return (
    <div style={containerStyle}>
      {/* Encabezado del Vendedor */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={avatarStyle}>👨‍💻</div>
          <div>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Seller: <span style={{ color: '#00ffcc', fontFamily: 'monospace' }}>{shortAddress}</span></h4>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>Gem Nova Merchant</span>
          </div>
        </div>
        <div style={badgeStyle}>
          ⭐ Verified
        </div>
      </div>

      {/* Cuadrícula de Estadísticas */}
      <div style={gridStyle}>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Completion Rate</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={valueStyle}>{stats.completionRate}%</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>({stats.totalTrades} trades)</span>
          </div>
        </div>

        <div style={statBoxStyle}>
          <span style={labelStyle}>Avg. Release Time</span>
          <span style={valueStyle}>{stats.avgTime}</span>
        </div>

        <div style={{...statBoxStyle, gridColumn: '1 / -1', borderTop: '1px dashed #333', marginTop: '5px', paddingTop: '15px'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={labelStyle}>Dispute Ratio</span>
              <span style={{...valueStyle, color: '#FFD700'}}>{stats.disputeRatio}%</span>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#0a0a0a', padding: '8px 15px', borderRadius: '8px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.1rem' }}>{stats.disputesWon}%</span>
                <span style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase' }}>Won</span>
              </div>
              <div style={{ width: '1px', backgroundColor: '#333' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '1.1rem' }}>{stats.disputesLost}%</span>
                <span style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase' }}>Lost</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Estilos ---
const containerStyle: CSSProperties = { backgroundColor: '#111', borderRadius: '12px', padding: '20px', marginBottom: '25px', border: '1px solid #333', textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '15px' };
const avatarStyle: CSSProperties = { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid #444' };
const badgeStyle: CSSProperties = { backgroundColor: '#332200', color: '#FFD700', padding: '5px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #664400' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const statBoxStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const labelStyle: CSSProperties = { color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' };
const valueStyle: CSSProperties = { color: '#fff', fontSize: '1.3rem', fontWeight: 'bold' };