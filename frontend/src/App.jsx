import React, { useState, useRef } from "react"
import axios from "axios"
import * as XLSX from "xlsx"
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import "leaflet/dist/leaflet.css"

// Importamos tus módulos
import { mockOrders } from './utils/mockOrders';
import OrderValidator from './utils/OrderValidator';
import RouteGenerator from './utils/RouteGenerator';
import DriverView from './DriverView';

// --- COMPONENTE 1: EL DASHBOARD DEL ADMIN (CON COPIAR URL) ---
function AdminDashboard({ onLogout }) {
  const [locations, setLocations] = useState([])
  const [routes, setRoutes] = useState([])
  const [backendLog, setBackendLog] = useState([])
  
  // Estados para configuración de ruta
  const [origin, setOrigin] = useState("Centro de Distribución Nakimi");
  const [destination, setDestination] = useState("Centro de Distribución Nakimi");
  
  // Estados para manejo de archivos
  const [pendingFile, setPendingFile] = useState(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    log(`Archivo seleccionado: ${file.name}`);
  }

  const handleAcceptFile = async () => {
    if (!pendingFile) return;
    
    setIsLoadingFile(true);
    log("🔄 Cargando archivo...");
    
    try {
      const data = await pendingFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const output = [];

      for (const r of rows) {
        const rawAddress = r["dirección"] || r["address"] || "";
        const fullAddress = `${rawAddress}, ${r["departamento"] || ""}, ${r["comuna"] || ""}`;
        const tempOrder = {
          id: r["id"] || r["order_number"] || `Excel-${Math.random()}`,
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
      log(`✅ ${output.length} pedidos cargados correctamente`);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      log(`❌ Error al procesar archivo: ${error.message}`);
      alert("Error al procesar el archivo");
    } finally {
      setIsLoadingFile(false);
    }
  }

  const optimizeRoutes = async () => {
    if (locations.length === 0) { alert("⚠ Primero carga direcciones."); return; }
    try {
      const res = await axios.post("http://localhost:4000/api/vrp", { locations });
      setRoutes(res.data.routes || []);
    } catch (err) { alert("Error backend 4000"); }
  }

  const handleGenerateGoogleLink = () => {
    const validOrders = locations.filter(loc => loc.isValid);
    const waypoints = validOrders.map(loc => loc.address);
    try {
      const url = RouteGenerator.generateUrl(origin, destination, waypoints);
      window.open(url, '_blank');
    } catch (error) { alert(error.message); }
  };

  // --- NUEVA FUNCIÓN: COPIAR AL PORTAPAPELES (REQ-9.1.3) ---
  const handleCopyUrl = () => {
    const validOrders = locations.filter(loc => loc.isValid);
    if (validOrders.length === 0) return;
    
    const waypoints = validOrders.map(loc => loc.address);
    try {
      const url = RouteGenerator.generateUrl(origin, destination, waypoints);
      // Usamos la API del navegador para copiar
      navigator.clipboard.writeText(url)
        .then(() => alert("✅ ¡Enlace copiado al portapapeles!\n\nYa puedes pegarlo en WhatsApp o enviarlo al conductor."))
        .catch(err => alert("Error al copiar: " + err));
    } catch (error) { alert(error.message); }
  };

  // --- REQ-2.5: DRAG AND DROP PARA ORDENAR RUTA ---
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(locations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setLocations(items);
    log(`Pedido "${reorderedItem.cliente}" movido a posición ${result.destination.index + 1}`);
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ width: 380, padding: 12, overflow: "auto", borderRight: "1px solid #ccc" }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h2>Panel Admin</h2>
            <button onClick={onLogout} style={{fontSize:'12px', padding:'4px'}}>Salir</button>
        </div>
        
        <hr />
        
        {/* CONFIGURACIÓN DE RUTA */}
        <div style={{background: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px'}}>
            <h4 style={{margin: '0 0 10px 0'}}>📍 Configuración de Ruta</h4>
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>Punto de Origen:</label>
            <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} style={{width: '93%', padding: '5px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc'}} />
            <label style={{fontSize: '12px', fontWeight: 'bold'}}>Punto de Destino:</label>
            <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} style={{width: '93%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}} />
        </div>

        <button onClick={handleLoadMockData} style={{ width: "100%", padding: "8px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", marginBottom: "15px" }}>🧪 Cargar Mock Data</button>
        
        <h3>Cargar Archivos</h3>
        <input 
          type="file" 
          ref={fileRef} 
          accept=".xlsx" 
          onChange={handleFileSelect} 
          disabled={isLoadingFile}
        />
        
        {/* BOTÓN ACEPTAR */}
        {pendingFile && !isLoadingFile && (
          <button 
            onClick={handleAcceptFile} 
            style={{ 
              width: "100%", 
              marginTop: "10px", 
              padding: "10px", 
              background: "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            ✅ Aceptar y Procesar Archivo
          </button>
        )}
        
        {/* INDICADOR DE CARGA */}
        {isLoadingFile && (
          <div style={{
            marginTop: "10px",
            padding: "10px",
            background: "#fff3cd",
            borderRadius: "4px",
            textAlign: "center",
            fontWeight: "bold"
          }}>
            ⏳ Cargando archivo...
          </div>
        )}
        
        {/* REQ-9.1.5: CONTADOR DE PARADAS */}
        {locations.filter(l => l.isValid).length > 0 && (
          <div style={{marginTop: '10px', padding: '8px', background: '#fff3cd', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center'}}>
            📍 Paradas: {locations.filter(l => l.isValid).length} / 23
            {locations.filter(l => l.isValid).length > 23 && <span style={{color: 'red'}}> ⚠️ Excede límite</span>}
          </div>
        )}

        {/* REQ-9.1.4: LISTA ORDENABLE CON DRAG-AND-DROP */}
        {/* Funciona tanto con Mock Data como con archivos Excel */}
        {locations.filter(l => l.isValid).length > 0 && (
          <>
            <h3 style={{marginTop: '15px'}}>Orden de Entrega:</h3>
            <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
              💡 Arrastra con el mouse para cambiar el orden
            </p>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="orders">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '5px'}}>
                    {locations.filter(l => l.isValid).map((loc, index) => (
                      <Draggable key={loc.id} draggableId={String(loc.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              padding: '8px',
                              margin: '4px 0',
                              background: snapshot.isDragging ? '#e3f2fd' : 'white',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'grab',
                              ...provided.draggableProps.style
                            }}
                          >
                            <strong>#{index + 1}</strong> {loc.cliente} - {loc.address}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
        
        {/* BOTONES DE ACCIÓN */}
        <button onClick={optimizeRoutes} style={{ marginTop: 20, width: '100%', padding: "10px", background: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>⚙️ Optimizar (Backend)</button>
        <button onClick={handleGenerateGoogleLink} disabled={locations.filter(l => l.isValid).length === 0} style={{ marginTop: 10, width: '100%', padding: "10px", background: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>🗺️ Generar Link (Req 3)</button>
        
        {/* --- NUEVO BOTÓN: COPIAR --- */}
        <button 
            onClick={handleCopyUrl} 
            disabled={locations.filter(l => l.isValid).length === 0} 
            style={{ marginTop: 10, width: '100%', padding: "10px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: 'pointer' }}
        >
            📋 Copiar Enlace
        </button>
        
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

export default function App() {
    const [view, setView] = useState('login');
    const handleLogin = (userType) => { setView(userType); };
    const handleLogout = () => { setView('login'); };
    if (view === 'login') return <LoginScreen onLogin={handleLogin} />;
    if (view === 'admin') return <AdminDashboard onLogout={handleLogout} />;
    if (view === 'driver') return <DriverView onLogout={handleLogout} />;
    return null;
}