// Archivo: src/ProgressTracker.tsx
import type { CSSProperties } from 'react';

interface ProgressTrackerProps {
  status: string; // 'PENDING', 'ACTIVE', 'COMPLETED', 'REFUNDED'
}

export const ProgressTracker = ({ status }: ProgressTrackerProps) => {
  // Definimos en qué paso numérico estamos
  const stepIndex = 
    status === 'PENDING' ? 1 :
    status === 'ACTIVE' ? 2 : 
    (status === 'COMPLETED' || status === 'REFUNDED') ? 3 : 1;

  const isRefunded = status === 'REFUNDED';

  // Lógica de colores dinámica
  const getCircleColor = (step: number) => {
    if (step < stepIndex) return '#2ecc71'; // Paso superado (Verde)
    if (step === stepIndex && isRefunded) return '#ff4444'; // Cancelado (Rojo)
    if (step === stepIndex) return '#FFD700'; // Paso actual (Dorado)
    return '#333'; // Aún no llega (Gris oscuro)
  };

  const getLineColor = (step: number) => {
    if (step < stepIndex) return '#2ecc71'; // Línea conectada (Verde)
    if (step === stepIndex && isRefunded) return '#ff4444'; // Línea cortada (Rojo)
    return '#333'; // Aún no conectada
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '30px', padding: '0 10px' }}>
      
      {/* PASO 1: Creado */}
      <div style={stepWrapper}>
        <div style={{...circleStyle, borderColor: getCircleColor(1), boxShadow: stepIndex === 1 ? '0 0 10px #FFD700' : 'none'}}>
          {stepIndex > 1 ? '✓' : '1'}
        </div>
        <span style={{...labelStyle, color: stepIndex >= 1 ? '#fff' : '#666'}}>Deal Created</span>
      </div>

      <div style={{...lineStyle, backgroundColor: getLineColor(1)}} />

      {/* PASO 2: Asegurado */}
      <div style={stepWrapper}>
        <div style={{...circleStyle, borderColor: getCircleColor(2), boxShadow: stepIndex === 2 ? '0 0 10px #FFD700' : 'none'}}>
          {stepIndex > 2 ? '✓' : '2'}
        </div>
        <span style={{...labelStyle, color: stepIndex >= 2 ? '#fff' : '#666'}}>Vault Secured</span>
      </div>

      <div style={{...lineStyle, backgroundColor: getLineColor(2)}} />

      {/* PASO 3: Finalizado / Reembolsado */}
      <div style={stepWrapper}>
        <div style={{...circleStyle, borderColor: getCircleColor(3), boxShadow: stepIndex === 3 ? `0 0 10px ${isRefunded ? '#ff4444' : '#2ecc71'}` : 'none'}}>
          {isRefunded ? '✕' : (stepIndex === 3 ? '✓' : '3')}
        </div>
        <span style={{...labelStyle, color: stepIndex === 3 ? (isRefunded ? '#ff4444' : '#2ecc71') : '#666'}}>
          {isRefunded ? 'Refunded' : 'Released'}
        </span>
      </div>

    </div>
  );
};

// --- Estilos ---
const stepWrapper: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px' };
const circleStyle: CSSProperties = { width: '35px', height: '35px', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', fontWeight: 'bold', fontSize: '1.1rem', zIndex: 2, transition: 'all 0.4s ease' };
const lineStyle: CSSProperties = { flex: 1, height: '3px', margin: '0 -20px 25px -20px', zIndex: 1, transition: 'all 0.4s ease' };
const labelStyle: CSSProperties = { fontSize: '0.75rem', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' };