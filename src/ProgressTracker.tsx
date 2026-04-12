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

  // --- NUEVO: Estilo de pulso de radar (Inyectado directamente para que no falle) ---
  const radarPulseStyle = `
    @keyframes radar-pulse-animation {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7);
      }
      70% {
        box-shadow: 0 0 0 15px rgba(255, 215, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 215, 0, 0);
      }
    }
    .radar-active {
      animation: radar-pulse-animation 2s infinite;
      border-color: #FFD700 !important;
      color: #000 !important;
      background-color: #FFD700 !important;
    }
  `;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '30px', padding: '0 10px', position: 'relative' }}>
      
      {/* Inyectamos la animación CSS */}
      <style>{radarPulseStyle}</style>

      {/* PASO 1: Creado */}
      <div style={stepWrapper}>
        <div style={{...circleStyle, borderColor: getCircleColor(1), color: stepIndex > 1 ? '#000' : (stepIndex === 1 ? '#000' : '#666'), backgroundColor: stepIndex > 1 ? '#2ecc71' : (stepIndex === 1 ? '#FFD700' : '#111'), boxShadow: stepIndex === 1 ? '0 0 10px #FFD700' : 'none'}}>
          {stepIndex > 1 ? '✓' : '1'}
        </div>
        <span style={{...labelStyle, color: stepIndex >= 1 ? '#fff' : '#666'}}>Deal Created</span>
      </div>

      <div style={{...lineStyle, backgroundColor: getLineColor(1)}} />

      {/* PASO 2: Asegurado (AQUÍ ESTÁ LA SOLUCIÓN DEL RADAR) */}
      <div style={stepWrapper}>
        <div 
          className={stepIndex === 2 ? 'radar-active' : ''}
          style={{
            ...circleStyle, 
            borderColor: getCircleColor(2),
            color: stepIndex > 2 ? '#000' : (stepIndex === 2 ? '#000' : '#666'),
            backgroundColor: stepIndex > 2 ? '#2ecc71' : (stepIndex === 2 ? '#FFD700' : '#111'),
            boxShadow: 'none', // Quitamos el box-shadow viejo, la animación se encarga
          }}
        >
          {stepIndex > 2 ? '✓' : '2'}
        </div>
        <span style={{...labelStyle, color: stepIndex >= 2 ? '#fff' : '#666'}}>Vault Secured</span>
      </div>

      <div style={{...lineStyle, backgroundColor: getLineColor(2)}} />

      {/* PASO 3: Finalizado / Reembolsado */}
      <div style={stepWrapper}>
        <div style={{...circleStyle, borderColor: getCircleColor(3), color: stepIndex === 3 ? '#000' : '#666', backgroundColor: stepIndex === 3 ? (isRefunded ? '#ff4444' : '#2ecc71') : '#111', boxShadow: stepIndex === 3 ? `0 0 10px ${isRefunded ? '#ff4444' : '#2ecc71'}` : 'none'}}>
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
const stepWrapper: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px', position: 'relative', zIndex: 2 };
const circleStyle: CSSProperties = { width: '35px', height: '35px', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.4s ease', position: 'relative', zIndex: 3 };
const lineStyle: CSSProperties = { flex: 1, height: '3px', margin: '0 -20px 25px -20px', zIndex: 1, transition: 'all 0.4s ease', position: 'relative' };
const labelStyle: CSSProperties = { fontSize: '0.75rem', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' };