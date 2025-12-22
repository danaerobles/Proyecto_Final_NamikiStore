import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import L from 'leaflet'; 
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "leaflet/dist/leaflet.css";

// Importamos tus módulos
import OrderValidator from './utils/OrderValidator';
import RouteGenerator from './utils/RouteGenerator';
import DriverView from './DriverView';

// --- ESTILOS ---
const styles = {
  container: { display: "flex", height: "100vh", fontFamily: "Roboto, sans-serif", backgroundColor: "#f4f7f9" },
  sidebar: { width: 380, padding: 20, overflowY: "auto", borderRight: "1px solid #e0e0e0", background: "white", boxShadow: "2px 0 5px rgba(0,0,0,0.05)" },
  mapContainer: { flex: 1 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '15px' },
  h2: { margin: 0, color: '#333' },
  h3: { marginTop: 25, marginBottom: 10, color: '#007bff' },
  configBox: { background: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #b3d9ff' },
  label: { fontSize: '13px', fontWeight: '600', display: 'block', margin: '5px 0' },
  input: { width: '95%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', transition: 'border-color 0.2s' },
  
  // --- NUEVO ESTILO PARA EL TOOLTIP ---
  tooltip: { 
      fontSize: '12px', 
      color: '#055160', 
      backgroundColor: '#cff4fc',
      padding: '8px',
      borderRadius: '4px',
      marginTop: '-5px', 
      marginBottom: '15px', 
      border: '1px solid #b6effb',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
  },

  button: (color, isPressed = false, disabled = false, isHovering = false) => {
    let finalColor = color;
    if (disabled) finalColor = '#ccc';
    else if (isHovering) {
        if (color === '#28a745') finalColor = '#218838';
        else if (color === '#007bff') finalColor = '#0069d9';
        else if (color === '#17a2b8') finalColor = '#138496';
    }
    return {
      width: "100%", padding: "10px", marginTop: "10px", background: finalColor, color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: disabled ? 'not-allowed' : 'pointer', opacity: isPressed ? 0.8 : 1, transition: 'all 0.15s ease', transform: isPressed ? 'scale(0.99)' : 'scale(1)',
    };
  },
  logoutButton: { padding: '5px 10px', fontSize: '12px', background: '#354bdccf', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' },
  fileButton: (isPressed = false, isLoading = false) => ({ display: 'block', width: '100%', padding: '12px', background: isLoading ? '#6c757d' : isPressed ? 'linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%)' : 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)', color: 'white', border: '1px solid #0b5ed7', borderRadius: '10px', cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: isPressed ? '0 2px 5px rgba(13,202,240,0.4)' : '0 4px 10px rgba(13,110,253,0.35)', opacity: isLoading ? 0.6 : 1, textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box', transition: 'all 0.15s ease', transform: isPressed ? 'scale(0.98)' : 'scale(1)' }),
  message: (bgColor, borderColor, textColor) => ({ marginTop: "15px", padding: "12px", background: bgColor, borderRadius: "4px", textAlign: "center", fontWeight: "bold", color: textColor, border: `1px solid ${borderColor}`, fontSize: '14px' }),
  orderList: { maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '5px', background: '#fafafa' },
  orderItem: (isDragging) => ({ padding: '10px', margin: '6px 0', background: isDragging ? '#e3f2fd' : 'white', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', cursor: 'grab', boxShadow: isDragging ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center' }),
  hr: { border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }
};

// --- COMPONENTE 1: EL DASHBOARD DEL ADMIN ---
function AdminDashboard({ onLogout }) {
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  
  // Inputs de Texto
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  // --- Estados para mostrar/ocultar Tooltips ---
  const [focusOrigin, setFocusOrigin] = useState(false);
  const [focusDest, setFocusDest] = useState(false);

  // --- Coordenadas específicas para pintar los marcadores Verde y Rojo ---
  const [startPoint, setStartPoint] = useState(null); // Para el marcador Verde
  const [endPoint, setEndPoint] = useState(null);     // Para el marcador Rojo
  
  const [pendingFile, setPendingFile] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [isFileButtonPressed, setIsFileButtonPressed] = useState(false);
  const [hoverState, setHoverState] = useState({});
  const fileRef = useRef();

  const validLocations = useMemo(() => locations.filter(loc => loc.isValid), [locations]);
  const waypointCount = validLocations.length;
  const isLimitExceeded = waypointCount > 23;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setRoutes([]);
    setLinkGenerated(false);
    setStartPoint(null);
    setEndPoint(null);
  };

  const handleAcceptFile = async () => {
    if (!pendingFile) return;
    setIsLoadingFile(true);
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
          cliente: r["cliente"] || "Cliente Desconocido",
          telefono: r["telefono"] || "N/A",
          direccion: fullAddress
        };
        const validation = OrderValidator.validate(tempOrder);
        let geoData = { lat: 0, lng: 0 };
        
        if (rawAddress && validation.isValid) {
          try {
            const geo = await axios.post("https://namiki-backend.onrender.com/api/geocode", { address: fullAddress });
            geoData = { lat: geo.data.lat, lng: geo.data.lng };
          } catch (err) {
            if (r.lat && r.lng) {
              geoData = { lat: parseFloat(r.lat), lng: parseFloat(r.lng) };
            } else {
                validation.isValid = false;
                validation.errores = [...validation.errores, "Error Geocodificación."];
            }
          }
        } else if (!rawAddress) {
            validation.isValid = false;
            validation.errores = [...validation.errores, "Dirección vacía."];
        }

        output.push({ ...tempOrder, ...geoData, demand: parseInt(r.demand || 0, 10), isValid: validation.isValid, errors: validation.errores, address: fullAddress });
      }
      setLocations(output);
      setRoutes([]);
      setPendingFile(null);
      setLinkGenerated(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      alert(`❌ Error al procesar archivo: ${error.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const optimizeRoutes = async () => {
    if (waypointCount === 0) { alert("⚠ Primero carga direcciones."); return; }
    
    const getGeo = async (txt) => {
        if (!txt) return null;
        try {
            const res = await axios.post("https://namiki-backend.onrender.com/api/geocode", { address: txt });
            return res.data;
        } catch (e) { return null; }
    };

    try {
      // 1. Obtenemos coordenadas de los inputs
      const originCoord = await getGeo(origin);
      const destCoord = await getGeo(destination);

      // --- Guardamos estas coordenadas para pintarlas en el mapa ---
      if (originCoord) setStartPoint(originCoord);
      if (destCoord) setEndPoint(destCoord);

      // 2. Enviamos todo al backend
      const res = await axios.post("https://namiki-backend.onrender.com/api/vrp", { 
          locations: validLocations,
          origin: originCoord,
          destination: destCoord
      });
      
      setRoutes(res.data.routes || []);

      if (res.data.optimizedLocations) {
          const invalidLocs = locations.filter(l => !l.isValid);
          const newOrder = [...res.data.optimizedLocations, ...invalidLocs];
          setLocations(newOrder);
      }
    } catch (err) { alert("Error al optimizar: " + err.message); }
  };

  const handleGenerateGoogleLink = () => {
    if (waypointCount === 0) return;
    setIsGeneratingLink(true);
    const waypoints = validLocations.map(loc => loc.address);
    setTimeout(() => {
      try {
        const url = RouteGenerator.generateUrl(origin, destination, waypoints);
        window.open(url, '_blank');
        setLinkGenerated(true);
      } catch (error) { alert(`Error al generar enlace: ${error.message}`); } 
      finally { setIsGeneratingLink(false); }
    }, 500);
  };

  const handleCopyUrl = () => {
    if (waypointCount === 0) return;
    const waypoints = validLocations.map(loc => loc.address);
    try {
      const url = RouteGenerator.generateUrl(origin, destination, waypoints);
      navigator.clipboard.writeText(url)
        .then(() => alert("✅ ¡Copiado!"))
        .catch(() => alert("Error al copiar."));
    } catch (error) { alert(`Error: ${error.message}`); }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(validLocations);
    if (locations.length === waypointCount) {
        const fullItems = Array.from(locations);
        const [reorderedFullItem] = fullItems.splice(result.source.index, 1);
        fullItems.splice(result.destination.index, 0, reorderedFullItem);
        setLocations(fullItems);
    } else {
        const invalidItems = locations.filter(l => !l.isValid);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setLocations([...items, ...invalidItems]);
    }
    setRoutes([]);
    setLinkGenerated(false);
  };
  
  // --- Función para generar Iconos de Colores (Verde, Rojo, Azul) ---
  const getCustomIcon = (type, label) => {
      let bgColor = '#007bff'; // Azul (Default: Cliente)
      
      if (type === 'start') bgColor = '#28a745'; // Verde (Inicio)
      if (type === 'end') bgColor = '#dc3545';   // Rojo (Fin)
      if (type === 'error') bgColor = '#6c757d'; // Gris (Error)

      const iconStyle = `
          width: 30px; height: 30px; border-radius: 50%;
          background-color: ${bgColor}; color: white;
          display: flex; justify-content: center; align-items: center;
          font-weight: bold; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);
          font-size: 14px;
      `;

      return L.divIcon({
          className: 'custom-icon',
          html: `<div style="${iconStyle.replace(/\s+/g, ' ').trim()}">${label}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
      });
  };

  const handleHover = (buttonName, isHovering) => {
      setHoverState(prev => ({ ...prev, [buttonName]: isHovering }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h2 style={styles.h2}>Crear Ruta</h2>
          <button onClick={onLogout} style={styles.logoutButton}>Salir</button>
        </div>
        <hr style={styles.hr} />
        
        {/* CONFIGURACIÓN DE ORIGEN Y DESTINO CON TOOLTIPS */}
        <div style={styles.configBox}>
          <label style={styles.label}>Punto de Origen:</label>
          <input 
            type="text" 
            value={origin} 
            onChange={(e) => setOrigin(e.target.value)} 
            onFocus={() => setFocusOrigin(true)}
            onBlur={() => setFocusOrigin(false)}
            placeholder="Ej: Plaza de la Ciudadanía 26, Santiago."
            style={styles.input} 
          />
          {focusOrigin && (
              <div style={styles.tooltip}>
                  💡 <strong>Tip:</strong> Incluye calle, número y comuna. Tal y como se muestra en el ejemplo.
              </div>
          )}

          <label style={styles.label}>Punto de Destino:</label>
          <input 
            type="text" 
            value={destination} 
            onChange={(e) => setDestination(e.target.value)} 
            onFocus={() => setFocusDest(true)}
            onBlur={() => setFocusDest(false)}
            placeholder="Ej: Av. Grecia 2001, Ñuñoa."
            style={styles.input} 
          />
           {focusDest && (
              <div style={styles.tooltip}>
                  🏁 <strong>Tip:</strong> Indica dónde finaliza la ruta. Tal y como se muestra en el ejemplo.
              </div>
          )}
        </div>

        <h3 style={styles.h3}>Cargar Pedidos</h3>
        <label htmlFor="fileUpload" onMouseDown={() => !isLoadingFile && setIsFileButtonPressed(true)} onMouseUp={() => setIsFileButtonPressed(false)} onMouseLeave={() => setIsFileButtonPressed(false)} style={styles.fileButton(isFileButtonPressed, isLoadingFile)}>{isLoadingFile ? "⏳ Procesando..." : "📥 Seleccionar Archivo"}</label>
        <input id="fileUpload" type="file" ref={fileRef} accept=".xlsx" onChange={handleFileSelect} disabled={isLoadingFile} style={{ display: 'none' }} />
        {pendingFile && !isLoadingFile && (<button onClick={handleAcceptFile} onMouseEnter={() => handleHover('accept', true)} onMouseLeave={() => handleHover('accept', false)} style={styles.button("#28a745", false, false, hoverState.accept)}>✅ Aceptar y Procesar</button>)}
        
        {locations.length > 0 && (<div style={styles.message("#d1ecf1", "#bee5eb", "#0c5460")}>Pedidos: <strong>{locations.length}</strong> (Válidos: <strong>{waypointCount}</strong>)</div>)}
        {waypointCount > 0 && (<div style={styles.message(isLimitExceeded ? '#f8d7da' : '#fff3cd', isLimitExceeded ? '#f5c6cb' : '#ffc107', isLimitExceeded ? '#721c24' : '#856404')}>📍 Paradas Válidas: <strong>{waypointCount}</strong> / 23 {isLimitExceeded && <div>⚠️ LÍMITE EXCEDIDO</div>}</div>)}

        {waypointCount > 0 && (
          <>
            <h3 style={styles.h3}>Orden de Entrega:</h3>
            <p style={{fontSize: '12px', color: '#666'}}>💡 Arrastra para reordenar</p>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="orders">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={styles.orderList}>
                    {validLocations.map((loc, index) => (
                      <Draggable key={loc.id} draggableId={String(loc.id)} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...styles.orderItem(snapshot.isDragging), ...provided.draggableProps.style}}>
                            <span style={{marginRight: '10px', fontWeight: 'bold', color: '#007bff'}}>#{index + 1}</span> {loc.cliente} ({loc.id}) - {loc.address}
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
        
        {!isLimitExceeded && waypointCount > 0 && (
          <>
            <button onClick={optimizeRoutes} onMouseEnter={() => handleHover('optimize', true)} onMouseLeave={() => handleHover('optimize', false)} style={styles.button("#28a745", false, false, hoverState.optimize)}>⚙️ Optimizar Ruta (Backend)</button>
            <button onClick={handleGenerateGoogleLink} disabled={isGeneratingLink} onMouseEnter={() => handleHover('generate', true)} onMouseLeave={() => handleHover('generate', false)} style={styles.button("#007bff", isGeneratingLink, isGeneratingLink, hoverState.generate && !isGeneratingLink)}>{isGeneratingLink ? "⏳ Generando..." : "🗺️ Generar Link (Req 3)"}</button>
          </>
        )}
        
        {linkGenerated && !isGeneratingLink && (<button onClick={handleCopyUrl} onMouseEnter={() => handleHover('copy', true)} onMouseLeave={() => handleHover('copy', false)} style={styles.button("#17a2b8", false, false, hoverState.copy)}>📋 Copiar Enlace</button>)}
      </div>
      
      {/* MAPA */}
      <div style={styles.mapContainer}>
        <MapContainer center={[-33.45, -70.66]} zoom={12} style={{ height: "100%", width: "100%" }} key={waypointCount}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* MARCADOR ORIGEN (VERDE) - Solo aparece después de optimizar */}
          {startPoint && (
              <Marker position={[startPoint.lat, startPoint.lng]} icon={getCustomIcon('start', '🏠')}>
                  <Popup><strong>Inicio de Ruta</strong><br/>{origin}</Popup>
              </Marker>
          )}

          {/* MARCADORES DE PEDIDOS (AZULES) */}
          {locations.filter(loc => loc.lat !== 0 && loc.lng !== 0).map((loc) => {
              const stopIndex = loc.isValid ? validLocations.findIndex(vLoc => vLoc.id === loc.id) : -1;
              const popupText = loc.isValid ? `✅ Parada #${stopIndex + 1}` : "❌ Error: " + loc.errors?.join(", ");
              // Si es válido usa azul, si no gris/error
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={getCustomIcon(loc.isValid ? 'client' : 'error', loc.isValid ? (stopIndex + 1) : '❌')}>
                  <Popup><strong>{loc.cliente}</strong><br/>{loc.address}<br/>{popupText}</Popup>
                </Marker>
              );
          })}

          {/* MARCADOR DESTINO (ROJO) - Solo aparece después de optimizar */}
          {endPoint && (
              <Marker position={[endPoint.lat, endPoint.lng]} icon={getCustomIcon('end', '🏁')}>
                  <Popup><strong>Fin de Ruta</strong><br/>{destination}</Popup>
              </Marker>
          )}
          
          {/* LÍNEA DE RUTA */}
          {routes.map((route, rIndex) => (
            <Polyline key={rIndex} positions={route.path.map(p => [p.lat, p.lng])} color="blue" weight={4} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5', fontFamily: 'Roboto, sans-serif' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                <h1 style={{ color: '#060606ff', borderBottom: '3px solid #000000ff', paddingBottom: '10px', marginBottom: '30px' }}>Namiki Route📦</h1>
                <p style={{color: '#555', fontSize: '18px'}}>Selecciona tu perfil para ingresar:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
                    <button onClick={() => onLogin('admin')} style={{ padding: '15px 35px', fontSize: '16px', cursor: 'pointer', background: '#012d5bff', color: 'white', border: 'none', borderRadius: '5px', transition: 'background-color 0.2s' }}>👨‍💻 Soy Gestor Logístico</button>
                    <button onClick={() => onLogin('driver')} style={{ padding: '15px 35px', fontSize: '16px', cursor: 'pointer', background: '#4a24a9ff', color: 'white', border: 'none', borderRadius: '5px', transition: 'background-color 0.2s' }}>🚚 Soy Driver</button>
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