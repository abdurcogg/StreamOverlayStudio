export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#e0e0e0',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 480,
        padding: 40,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>
          &#9888;
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          Under Maintenance
        </h1>
        <p style={{ fontSize: 14, color: '#999', lineHeight: 1.6, marginBottom: 24 }}>
          Website sedang dalam maintenance. Silakan kembali nanti.
        </p>
        <p style={{ fontSize: 12, color: '#555' }}>
          Stream Overlay Studio
        </p>
      </div>
    </div>
  );
}
