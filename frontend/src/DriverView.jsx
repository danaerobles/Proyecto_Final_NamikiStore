import React, { useState } from 'react';
import RouteGenerator from './utils/RouteGenerator';
// Reutilizamos tus validaciones
import { mockOrders } from './utils/mockOrders';
import OrderValidator from './utils/OrderValidator';

export default function DriverView({ onLogout }) {
  // 1. INICIALIZAMOS EL ESTADO
  // Filtramos los válidos Y les agregamos una propiedad 'entregado: false'
  const [orders, setOrders] = useState(() => {
    return mockOrders
      .filter(order => OrderValidator.validate(order).isValid)
      .map(order => ({ ...order, delivered: false })); // Agregamos estado inicial
  });

  // 2. FUNCIÓN PARA MARCAR COMO ENTREGADO
  const toggleDelivery = (id) => {
    setOrders(prevOrders => prevOrders.map(order => 
      order.id === id ? { ...order, delivered: !order.delivered } : order
    ));
  };

  const handleOpenRoute = () => {
    try {
      // Usamos 'orders' del estado
      const waypoints = orders.map(o => o.direccion);
      const url = RouteGenerator.generateUrl(
        "Centro Logístico", 
        "Centro Logístico", 
        waypoints
      );
      window.open(url, '_blank');
    } catch (error) {
      alert(error.message);
    }
  };

  // Calculamos cuántos faltan para el resumen
  const pendingCount = orders.filter(o => !o.delivered).length;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🚛 Modo Conductor</h2>
        <button onClick={onLogout} style={{ padding: '5px 10px', background: '#ccc', border: 'none', borderRadius: '4px' }}>
          Salir
        </button>
      </div>

      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #90caf9' }}>
        <strong>Resumen de Ruta:</strong>
        <p style={{ margin: '5px 0' }}>📦 {pendingCount} Paquetes pendientes de {orders.length}</p>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {orders.map((order, index) => (
          <div 
            key={order.id} 
            style={{ 
                border: order.delivered ? '1px solid #28a745' : '1px solid #ddd', // Borde verde si está listo
                padding: '15px', 
                borderRadius: '8px', 
                background: order.delivered ? '#f0fff4' : 'white', // Fondo verdecito si está listo
                opacity: order.delivered ? 0.7 : 1, // Un poco transparente si ya se entregó
                transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: '#555' }}>Parada #{index + 1}</span>
              <span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{order.id}</span>
            </div>
            
            <h4 style={{ margin: '5px 0' }}>{order.cliente}</h4>
            <p style={{ margin: '0', color: '#666' }}>📍 {order.direccion}</p>
            <p style={{ margin: '5px 0 10px 0', color: '#28a745' }}>
                📞 <a href={`tel:${order.telefono}`} style={{color: '#28a745', textDecoration: 'none'}}>{order.telefono}</a>
            </p>

            {/* --- NUEVO BOTÓN DE ENTREGA --- */}
            <button 
                onClick={() => toggleDelivery(order.id)}
                style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    // Cambia de color según el estado
                    background: order.delivered ? '#ffc107' : '#28a745', 
                    color: order.delivered ? '#333' : 'white'
                }}
            >
                {order.delivered ? "↩️ Deshacer / Marcar Pendiente" : "✅ Marcar como Entregado"}
            </button>

          </div>
        ))}
      </div>
    </div>
  );
}