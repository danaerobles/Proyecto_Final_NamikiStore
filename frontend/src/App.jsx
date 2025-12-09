import React, { useState, useRef } from "react"
import axios from "axios"
import * as XLSX from "xlsx"
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"

// Importamos tus módulos
import { mockOrders } from './utils/mockOrders';
import OrderValidator from './utils/OrderValidator';
import RouteGenerator from './utils/RouteGenerator';
import DriverView from './DriverView';

// --- COMPONENTE 1: EL DASHBOARD DEL ADMIN (CON ORIGEN/DESTINO) ---
function AdminDashboard({ onLogout }) {
  const [locations, setLocations] = useState([])
  const [routes, setRoutes] = useState([])
  const [backendLog, setBackendLog] = useState([])
  
  // --- NUEVOS ESTADOS PARA REQ-2.1 y REQ-2.2 ---
  const [origin, setOrigin] = useState("Centro de Distribución Nakimi");
  const [destination, setDestination] = useState("Centro de Distribución Nakimi");
  
  const fileRef = useRef()

  const log = (msg, data = null) => {
    setBackendLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, data }])
  }

  const handleLoadMockData = () => {
    log("Cargando Mock Data...");
    const processedMock = mockOrders.map(order => {
      const validation = OrderValidator.validate(order);
      return {
        ...order,
        lat: -33.45 + (Math.random() * 0.05 - 0.025),
        lng: -70.66 + (Math.random() * 0.05 - 0.025),
        isValid: validation.isValid,
        errors: validation.errores,
        address: order.direccion
      };
    });
    setLocations(processedMock);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const output = [];

    for (const r of rows) {
      const rawAddress = r["dirección"] || r["address"] || "";
      const fullAddress = `${rawAddress}, ${r["departamento"] || ""}, ${r["comuna"] || ""}`;
      const tempOrder = {
        id: r["id"] || r["order_number"] || "Excel",
        cliente: r["cliente"] || "Cliente",
        telefono: r["telefono"] || "999999999",
        direccion: fullAddress
      };
      const validation = OrderValidator.validate(tempOrder);
      let geoData = { lat: 0, lng: 0 };
      
      if (rawAddress) {
        try {
          const geo = await axios.post("http://localhost:4000/api/geocode", { address: fullAddress });
          geoData = { lat: geo.data.lat, lng: geo.data.lng };
        } catch (err) {
          if (r.lat && r.lng) geoData = { lat: parseFloat(r.lat), lng: parseFloat(r.lng) };
          else geoData = { lat: -33.45 + Math.random()*0.02, lng: -70.66 + Math.random()*0.02 };
        }
      }
      output.push({ ...tempOrder, ...geoData, demand: parseInt(r.demand || 0, 10), isValid: validation.isValid, errors: validation.errores, address: fullAddress });
    }
    setLocations(output);
  }

  const optimizeRoutes = async () => {
    if (locations.length === 0) { alert("⚠ Primero carga direcciones."); return; }
    try {
      const res = await axios.post("http://localhost:4000/api/vrp", { locations });
      setRoutes(res.data.routes || []);
    } catch (err) { alert("Error backend 4000"); }
  }

  // --- FUNCIÓN ACTUALIZADA PARA USAR LOS INPUTS ---
  const handleGenerateGoogleLink = () => {
    const validOrders = locations.filter(loc => loc.isValid);
    const waypoints = validOrders.map(loc => loc.address);
    try {
      // Ahora usamos las variables de estado 'origin' y 'destination'
      const url = RouteGenerator.generateUrl(origin, destination, waypoints);
      window.open(url, '_blank');
    } catch (error) { alert(error.message); }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ width: 380, padding: 12, overflow: "auto", borderRight: "1px solid #ccc" }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h2>Panel Admin</h2>
            <button onClick={onLogout} style={{fontSize:'12px', padding:'4px'}}>Salir</button>
        </div>
        
        <hr />
        
        {/* --- SECCIÓN NUEVA: CONFIGURACIÓN DE RUTA (REQ-2.1 y 2.2) --- */}
        <div style={{background: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px'}}>
            <h4 style={{margin: '0 0 10px 0'}}>📍 Configuración de Ruta</h4>
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>Punto de Origen:</label>
            <input 
                type="text" 
                value={origin} 
                onChange={(e) => setOrigin(e.target.value)}
                style={{width: '93%', padding: '5px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc'}}
            />
            
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>Punto de Destino:</label>
            <input 
                type="text" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                style={{width: '93%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}
            />
        </div>

        <button onClick={handleLoadMockData} style={{ width: "100%", padding: "8px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", marginBottom: "15px" }}>🧪 Cargar Mock Data</button>
        <h3>Cargar XLSX</h3>
        <input type="file" ref={fileRef} accept=".xlsx" onChange={handleFile} />
        <button onClick={optimizeRoutes} style={{ marginTop: 20, width: '100%', padding: "10px", background: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>⚙️ Optimizar (Backend)</button>
        
        {/* BOTÓN AZUL AHORA USA LOS INPUTS DE ARRIBA */}
        <button onClick={handleGenerateGoogleLink} disabled={locations.filter(l => l.isValid).length === 0} style={{ marginTop: 10, width: '100%', padding: "10px", background: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>🗺️ Generar Link (Req 3)</button>
        
        <hr />
        <h3>Logs</h3>
        <div style={{ fontSize: 11, background: '#f8f9fa', padding: '5px', maxHeight: '150px', overflow: 'auto' }}>
            {backendLog.map((l, i) => <div key={i}>{l.time} - {l.msg}</div>)}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <MapContainer center={[-33.45, -70.66]} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {locations.map((loc, i) => (
            <Marker key={i} position={[loc.lat || 0, loc.lng || 0]}>
               <Popup><b>{loc.cliente}</b><br/>{loc.address}<br/>{loc.isValid ? "✅ Válido" : "❌ " + loc.errors?.join(", ")}</Popup>
            </Marker>
          ))}
          {routes.map((route, rIndex) => <Polyline key={rIndex} positions={route.path.map(p => [p.lat, p.lng])} color="blue" />)}
        </MapContainer>
      </div>
    </div>
  )
}

// --- COMPONENTE 2: PANTALLA DE LOGIN (SIMULADO) ---
function LoginScreen({ onLogin }) {
    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5', fontFamily: 'sans-serif' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <h1 style={{ color: '#333' }}>Namiki Store 📦</h1>
                <p>Selecciona tu perfil para ingresar:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    <button onClick={() => onLogin('admin')} style={{ padding: '15px 30px', fontSize: '16px', cursor: 'pointer', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px' }}>👨‍💻 Soy Despachador (Admin)</button>
                    <button onClick={() => onLogin('driver')} style={{ padding: '15px 30px', fontSize: '16px', cursor: 'pointer', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px' }}>🚚 Soy Repartidor (Driver)</button>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function App() {
    const [view, setView] = useState('login');

    const handleLogin = (userType) => { setView(userType); };
    const handleLogout = () => { setView('login'); };

    if (view === 'login') return <LoginScreen onLogin={handleLogin} />;
    if (view === 'admin') return <AdminDashboard onLogout={handleLogout} />;
    if (view === 'driver') return <DriverView onLogout={handleLogout} />;

    return null;
}