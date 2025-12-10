import React from 'react';
import RouteGenerator from './utils/RouteGenerator';
// Reutilizamos tus validaciones para asegurarnos de mostrar solo lo bueno
import { mockOrders } from './utils/mockOrders';
import OrderValidator from './utils/OrderValidator';

export default function DriverView({ onLogout }) {
  // 1. Filtramos solo los pedidos válidos para el conductor
  // (Al conductor no le interesa ver errores de validación, solo lo que debe entregar)
  const validOrders = mockOrders
    .filter(order => OrderValidator.validate(order).isValid);

  const handleOpenRoute = () => {
    try {
      const waypoints = validOrders.map(o => o.direccion);
      const url = RouteGenerator.generateUrl(
        "Centro Logístico", // Origen
        "Centro Logístico", // Destino
        waypoints
      );
      window.open(url, '_blank');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🚛 Modo Conductor</h2>
        <button onClick={onLogout} style={{ padding: '5px 10px', background: '#ccc', border: 'none', borderRadius: '4px' }}>
          Salir
        </button>
      </div>

      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <strong>Resumen de Ruta:</strong>
        <p style={{ margin: '5px 0' }}>📦 {validOrders.length} Paquetes a entregar</p>
      </div>

      <button 
        onClick={handleOpenRoute}
        style={{ 
          width: '100%', padding: '15px', background: '#007bff', color: 'white', 
          border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
          marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        🗺️ INICIAR RUTA (Maps)
      </button>

      <h3>Lista de Entregas:</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {validOrders.map((order, index) => (
          <div key={order.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: '#555' }}>Parada #{index + 1}</span>
              <span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{order.id}</span>
            </div>
            <h4 style={{ margin: '5px 0' }}>{order.cliente}</h4>
            <p style={{ margin: '0', color: '#666' }}>📍 {order.direccion}</p>
            <p style={{ margin: '5px 0 0 0', color: '#28a745' }}>📞 <a href={`tel:${order.telefono}`} style={{color: '#28a745', textDecoration: 'none'}}>{order.telefono}</a></p>
          </div>
        ))}
      </div>
    </div>
  );
}