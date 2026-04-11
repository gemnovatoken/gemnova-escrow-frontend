// Archivo: src/HeroStats.tsx
import { CSSProperties } from 'react';

// 1. Le decimos a TypeScript exactamente qué datos esperar (cero "any")
interface HeroStatsProps {
  totalVolume: number | string;
  tradeCount: number;
  activeVaults: number;
}

export const HeroStats = ({ totalVolume, tradeCount, activeVaults }: HeroStatsProps) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '20px', 
      marginBottom: '30px',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto 40px auto'
    }}>
      <div style={cardStyle}>
        <span style={iconStyle}>💰</span>
        <h4 style={labelStyle}>Volumen Asegurado</h4>
        <p style={valueStyle}>${totalVolume} <span style={{fontSize: '0.8rem', color: '#888'}}>USDT</span></p>
      </div>

      <div style={cardStyle}>
        <span style={iconStyle}>🏆</span>
        <h4 style={labelStyle}>Tratos Exitosos</h4>
        <p style={valueStyle}>{tradeCount}</p>
      </div>

      <div style={{
        ...cardStyle, 
        border: activeVaults > 0 ? '1px solid #00ffcc' : '1px solid #333', 
        boxShadow: activeVaults > 0 ? '0 0 15px rgba(0, 255, 204, 0.2)' : 'none'
      }}>
        <span style={iconStyle}>🛡️</span>
        <h4 style={labelStyle}>Bóvedas Activas</h4>
        <p style={{...valueStyle, color: activeVaults > 0 ? '#00ffcc' : '#fff'}}>{activeVaults}</p>
      </div>
    </div>
  );
};

// 2. Usamos CSSProperties en lugar de "any" para los estilos
const cardStyle: CSSProperties = {
  backgroundColor: '#111',
  padding: '20px',
  borderRadius: '15px',
  border: '1px solid #333',
  textAlign: 'center',
  transition: 'transform 0.3s ease'
};

const labelStyle: CSSProperties = { 
  color: '#888', 
  fontSize: '0.9rem', 
  margin: '10px 0 5px 0', 
  textTransform: 'uppercase', 
  letterSpacing: '1px' 
};

const valueStyle: CSSProperties = { 
  fontSize: '1.8rem', 
  fontWeight: 'bold', 
  margin: '0' 
};

const iconStyle: CSSProperties = { 
  fontSize: '2rem' 
};