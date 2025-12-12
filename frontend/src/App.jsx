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

// --- ESTILOS MODERNOS (Patrón CSS-in-JS simple) ---
const styles = {
  // Global & Layout
  container: { display: "flex", height: "100vh", fontFamily: "Roboto, sans-serif", backgroundColor: "#f4f7f9" },
  sidebar: { width: 380, padding: 20, overflowY: "auto", borderRight: "1px solid #e0e0e0", background: "white", boxShadow: "2px 0 5px rgba(0,0,0,0.05)" },
  mapContainer: { flex: 1 },
  // Headers
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '15px' },
  h2: { margin: 0, color: '#333' },
  h3: { marginTop: 25, marginBottom: 10, color: '#007bff' },
  // Forms & Inputs
  configBox: { background: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #b3d9ff' },
  label: { fontSize: '13px', fontWeight: '600', display: 'block', margin: '5px 0' },
  input: { width: '95%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', transition: 'border-color 0.2s' },
  
  // Buttons (Actualizado para incluir hover y active/pressed)
  button: (color, isPressed = false, disabled = false, isHovering = false) => {
    let finalColor = color;
    if (disabled) {
        finalColor = '#ccc';
    } else if (isHovering) {
        // Oscurecer ligeramente el color base al hacer hover
        if (color === '#28a745') finalColor = '#218838'; // green
        else if (color === '#007bff') finalColor = '#0069d9'; // blue
        else if (color === '#17a2b8') finalColor = '#138496'; // cyan
    }

    return {
      width: "100%",
      padding: "10px",
      marginTop: "10px",
      background: finalColor,
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: isPressed ? 0.8 : 1,
      transition: 'all 0.15s ease',
      transform: isPressed ? 'scale(0.99)' : 'scale(1)', // Pequeño efecto de clic
    };
  },
  
  // Botón de Salir (Compacto)
  logoutButton: {
      padding: '5px 10px',
      fontSize: '12px',
      background: '#354bdccf',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'background-color 0.2s',
      marginLeft: '10px',
      // No necesita hover/active con JS, el estilo nativo del navegador es suficiente para este botón pequeño.
  },
  
  // File Upload Button (Se mantiene la lógica con isFileButtonPressed que ya simula hover/active)
  fileButton: (isPressed = false, isLoading = false) => ({
    display: 'block',
    width: '100%',
    padding: '12px',
    background: isLoading 
      ? '#6c757d'
      : isPressed 
        ? 'linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%)' 
        : 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
    color: 'white',
    border: '1px solid #0b5ed7',
    borderRadius: '10px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    boxShadow: isPressed 
      ? '0 2px 5px rgba(13,202,240,0.4)' 
      : '0 4px 10px rgba(13,110,253,0.35)',
    opacity: isLoading ? 0.6 : 1,
    textAlign: 'center',
    fontWeight: 'bold',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease',
    transform: isPressed ? 'scale(0.98)' : 'scale(1)'
  }),
  // Messages & Indicators
  message: (bgColor, borderColor, textColor) => ({
    marginTop: "15px",
    padding: "12px",
    background: bgColor,
    borderRadius: "4px",
    textAlign: "center",
    fontWeight: "bold",
    color: textColor,
    border: `1px solid ${borderColor}`,
    fontSize: '14px'
  }),
  // Draggable List
  orderList: { maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '5px', background: '#fafafa' },
  orderItem: (isDragging) => ({
    padding: '10px',
    margin: '6px 0',
    background: isDragging ? '#e3f2fd' : 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'grab',
    boxShadow: isDragging ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    display: 'flex',
    alignItems: 'center'
  }),
  // Separator
  hr: { border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }
};

// --- COMPONENTE 1: EL DASHBOARD DEL ADMIN ---
function AdminDashboard({ onLogout }) {
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  
  // Estados para configuración de ruta
  const [origin, setOrigin] = useState("Centro de Distribución Namiki");
  const [destination, setDestination] = useState("Centro de Distribución Namiki");
  
  // Estados para manejo de archivos
  const [pendingFile, setPendingFile] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // Estados para generación de link
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);
  
  // Estado para efecto visual del botón de archivo
  const [isFileButtonPressed, setIsFileButtonPressed] = useState(false);
  
  // ESTADOS DE HOVER (NUEVO)
  const [hoverState, setHoverState] = useState({});
  
  const fileRef = useRef();

  // Cálculo de paradas válidas (performance optimizada con useMemo)
  const validLocations = useMemo(() => locations.filter(loc => loc.isValid), [locations]);
  const waypointCount = validLocations.length;
  const isLimitExceeded = waypointCount > 23;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    // Reiniciar estados al seleccionar un nuevo archivo
    setRoutes([]);
    setLinkGenerated(false);
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
        
        // Solo intentar geocodificar si la dirección base no está vacía y la validación pasa
        if (rawAddress && validation.isValid) {
          try {
            // NOTA: La URL del API debe ser configurada para producción
            const geo = await axios.post("http://localhost:4000/api/geocode", { address: fullAddress });
            geoData = { lat: geo.data.lat, lng: geo.data.lng };
          } catch (err) {
            // Fallback: Si falla la geocodificación, se acepta lat/lng del Excel si existen
            if (r.lat && r.lng) {
              geoData = { lat: parseFloat(r.lat), lng: parseFloat(r.lng) };
            } else {
                // Si el geocoding y el fallback fallan, el pedido se marca como inválido para no usar [0,0]
                validation.isValid = false;
                validation.errores = [...validation.errores, "Error de Geocodificación o falta de coordenadas."];
            }
          }
        } else if (!rawAddress) {
            // Marcar como inválido si la dirección es nula
            validation.isValid = false;
            validation.errores = [...validation.errores, "Dirección vacía."];
        }

        output.push({ 
          ...tempOrder, 
          ...geoData, 
          demand: parseInt(r.demand || 0, 10), 
          isValid: validation.isValid, 
          errors: validation.errores, 
          address: fullAddress 
        });
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
    try {
      // NOTA: La URL del API debe ser configurada para producción
      const res = await axios.post("http://localhost:4000/api/vrp", { locations: validLocations });
      setRoutes(res.data.routes || []);
    } catch (err) { 
        alert("Error al intentar optimizar la ruta con el backend."); 
    }
  };

  const handleGenerateGoogleLink = () => {
    if (waypointCount === 0) return;

    setIsGeneratingLink(true);
    
    // Solo se usan los pedidos válidos para generar la URL
    const waypoints = validLocations.map(loc => loc.address);
    
    setTimeout(() => {
      try {
        const url = RouteGenerator.generateUrl(origin, destination, waypoints);
        window.open(url, '_blank');
        setLinkGenerated(true);
      } catch (error) { 
        alert(`Error al generar enlace: ${error.message}`); 
      } finally {
        setIsGeneratingLink(false);
      }
    }, 500);
  };

  const handleCopyUrl = () => {
    if (waypointCount === 0) return;
    
    const waypoints = validLocations.map(loc => loc.address);
    try {
      const url = RouteGenerator.generateUrl(origin, destination, waypoints);
      navigator.clipboard.writeText(url)
        .then(() => alert("✅ ¡Enlace copiado al portapapeles!\n\nYa puedes pegarlo en WhatsApp o enviarlo al conductor."))
        .catch(() => alert("Error al copiar. Asegúrate de que el navegador lo permita."));
    } catch (error) { 
        alert(`Error al construir la URL: ${error.message}`); 
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    const items = Array.from(validLocations);
    
    if (locations.length === waypointCount) {
        // Si no hay inválidas, reemplazamos directamente
        const fullItems = Array.from(locations);
        const [reorderedFullItem] = fullItems.splice(result.source.index, 1);
        fullItems.splice(result.destination.index, 0, reorderedFullItem);
        setLocations(fullItems);
    } else {
        // 1. Separar válidos e inválidos
        const invalidItems = locations.filter(l => !l.isValid);
        
        // 2. Reordenar solo los válidos
        const [reorderedItem] = items.splice(sourceIndex, 1);
        items.splice(destIndex, 0, reorderedItem);

        // 3. Unir: válidos reordenados + inválidos (al final)
        setLocations([...items, ...invalidItems]);
    }

    setRoutes([]);
    setLinkGenerated(false);
  };
  
  // Función para generar el estilo CSS del ícono del mapa
  const getCustomIcon = (loc) => {
      const isLocValid = loc.isValid;
      let stopIndex = null;
      let iconContent = '❌'; 
      let bgColor = '#dc3545'; // Rojo por defecto para inválidos
      
      if (isLocValid) {
          // Obtiene el índice de la ubicación en la lista ordenada de paradas válidas
          stopIndex = validLocations.findIndex(vLoc => vLoc.id === loc.id);
          iconContent = stopIndex !== -1 ? (stopIndex + 1) : '';
          bgColor = '#007bff'; // Azul para válidos
      }
      
      const iconStyle = `
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${bgColor};
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
          border: 2px solid white;
          font-size: ${isLocValid ? '14px' : '12px'};
      `;

      const iconHtml = `<div style="${iconStyle.replace(/\s+/g, ' ').trim()}">${iconContent}</div>`;

      return L.divIcon({
          className: 'custom-div-icon',
          html: iconHtml,
          iconSize: [30, 30],
          iconAnchor: [15, 30], // Centra el círculo en el punto de coordenada
      });
  };

  // Manejadores genéricos de Hover
  const handleHover = (buttonName, isHovering) => {
      setHoverState(prev => ({ ...prev, [buttonName]: isHovering }));
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h2 style={styles.h2}>Crear Ruta</h2>
          {/* Botón de Salir */}
          <button onClick={onLogout} style={styles.logoutButton}>
            Salir
          </button>
        </div>
        
        <hr style={styles.hr} />
        
        {/* CONFIGURACIÓN DE RUTA */}
        <div style={styles.configBox}>
          <label style={styles.label}>Punto de Origen:</label>
          <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} style={styles.input} />
          <label style={styles.label}>Punto de Destino:</label>
          <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} style={styles.input} />
        </div>

        <h3 style={styles.h3}>Cargar Pedidos</h3>
        
        {/* Botón de Carga de Archivo - Se mantiene su propia lógica de pressed */}
        <label 
          htmlFor="fileUpload"
          onMouseDown={() => !isLoadingFile && setIsFileButtonPressed(true)}
          onMouseUp={() => setIsFileButtonPressed(false)}
          onMouseLeave={() => setIsFileButtonPressed(false)}
          style={styles.fileButton(isFileButtonPressed, isLoadingFile)}
        >
          {isLoadingFile ? "⏳ Procesando..." : "Cargar Archivo"}
        </label>
        <input 
          id="fileUpload"
          type="file" 
          ref={fileRef} 
          accept=".xlsx" 
          onChange={handleFileSelect} 
          disabled={isLoadingFile}
          style={{ display: 'none' }}
        />
        
        {/* BOTÓN ACEPTAR */}
        {pendingFile && !isLoadingFile && (
          <button 
            onClick={handleAcceptFile} 
            onMouseEnter={() => handleHover('accept', true)}
            onMouseLeave={() => handleHover('accept', false)}
            style={styles.button("#28a745", false, false, hoverState.accept)}
          >
            ✅ Aceptar y Procesar Archivo
          </button>
        )}
        
        {/* Mensaje de Pedidos Cargados */}
        {locations.length > 0 && (
            <div style={styles.message("#d1ecf1", "#bee5eb", "#0c5460")}>
                Pedidos cargados: <strong>{locations.length}</strong> 
                (Válidos: <strong>{waypointCount}</strong>, Inválidos: <strong>{locations.length - waypointCount}</strong>)
            </div>
        )}

        {/* REQ-9.1.5 & REQ-2.7: CONTADOR DE PARADAS Y ADVERTENCIA DE LÍMITE */}
        {waypointCount > 0 && (
          <>
            <div style={styles.message(isLimitExceeded ? '#f8d7da' : '#fff3cd', isLimitExceeded ? '#f5c6cb' : '#ffc107', isLimitExceeded ? '#721c24' : '#856404')}>
              📍 Paradas Válidas: **{waypointCount}** / 23
              {isLimitExceeded && (
                <span style={{ display: 'block', marginTop: '5px'}}>
                  ⚠️ LÍMITE EXCEDIDO
                </span>
              )}
            </div>
            
            {/* REQ-2.7: MENSAJE DE ADVERTENCIA DETALLADO */}
            {isLimitExceeded && (
              <div style={styles.message('#fff3cd', '#ffc107', '#856404')}>
                <strong>⚠️ Advertencia de Google Maps:</strong><br/>
                Solo se pueden usar 23 paradas (incluyendo origen/destino). Por favor, **seleccione un máximo de 23 pedidos** para esta ruta.
              </div>
            )}
          </>
        )}

        {/* REQ-9.1.4: LISTA ORDENABLE CON DRAG-AND-DROP */}
        {waypointCount > 0 && (
          <>
            <h3 style={styles.h3}>Orden de Entrega Actual:</h3>
            <p style={{fontSize: '12px', color: '#666', margin: '5px 0'}}>
              💡 Arrastra con el mouse para cambiar el orden de la ruta.
            </p>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="orders">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={styles.orderList}>
                    {validLocations.map((loc, index) => (
                      <Draggable key={loc.id} draggableId={String(loc.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...styles.orderItem(snapshot.isDragging),
                              ...provided.draggableProps.style
                            }}
                          >
                            <span style={{marginRight: '10px', fontWeight: 'bold', color: '#007bff'}}>#{index + 1}</span> 
                            {loc.cliente} ({loc.id}) - {loc.address}
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
        {!isLimitExceeded && waypointCount > 0 && (
          <>
            <button 
              onClick={optimizeRoutes} 
              onMouseEnter={() => handleHover('optimize', true)}
              onMouseLeave={() => handleHover('optimize', false)}
              style={styles.button("#28a745", false, false, hoverState.optimize)}
            >
              Optimizar Ruta
            </button>
            
            <button 
              onClick={handleGenerateGoogleLink} 
              disabled={isGeneratingLink} 
              onMouseEnter={() => handleHover('generate', true)}
              onMouseLeave={() => handleHover('generate', false)}
              // isGeneratingLink actúa como isPressed y deshabilitado si está activo
              style={styles.button("#007bff", isGeneratingLink, isGeneratingLink, hoverState.generate && !isGeneratingLink)} 
            >
              {isGeneratingLink ? "⏳ Generando link..." : "Generar Link de Mapa (Abre en nueva ventana)"}
            </button>
          </>
        )}
        
        {isLimitExceeded && (
            <button 
              disabled 
              style={styles.button("#ccc", false, true)}
            >
               🔒 Botones deshabilitados (Límite de 23 paradas)
            </button>
        )}
        
        {/* BOTÓN COPIAR - SOLO APARECE DESPUÉS DE GENERAR */}
        {linkGenerated && !isGeneratingLink && (
          <button 
              onClick={handleCopyUrl} 
              onMouseEnter={() => handleHover('copy', true)}
              onMouseLeave={() => handleHover('copy', false)}
              style={styles.button("#17a2b8", false, false, hoverState.copy)}
          >
              Copiar Enlace
          </button>
        )}

      </div>
      
      {/* MAPA */}
      <div style={styles.mapContainer}>
        <MapContainer 
            center={[-33.45, -70.66]} 
            zoom={12} 
            style={{ height: "100%", width: "100%" }}
            key={waypointCount} 
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* Marcadores de Ubicación (con círculos numerados) */}
          {locations.filter(loc => loc.lat !== 0 && loc.lng !== 0).map((loc) => {
              const customIcon = getCustomIcon(loc);
              const stopIndex = loc.isValid ? validLocations.findIndex(vLoc => vLoc.id === loc.id) : -1;
              const popupText = loc.isValid 
                ? `✅ Parada #${stopIndex + 1}` 
                : "❌ Error: " + loc.errors?.join(", ");

              return (
                <Marker 
                  key={loc.id} 
                  position={[loc.lat, loc.lng]} 
                  icon={customIcon}
                >
                  <Popup>
                    <strong>{loc.cliente}</strong>
                    <br/>{loc.address}
                    <br/>{popupText}
                  </Popup>
                </Marker>
              );
          })}
          
          {/* Polilíneas de la Ruta (VRP) */}
          {routes.map((route, rIndex) => (
            <Polyline key={rIndex} positions={route.path.map(p => [p.lat, p.lng])} color="blue" weight={4} />
          ))}
          
        </MapContainer>
      </div>
    </div>
  );
}

// --- PANTALLA DE INICIO DE SESIÓN ---
function LoginScreen({ onLogin }) {
    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5', fontFamily: 'Roboto, sans-serif' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                <h1 style={{ color: '#060606ff', borderBottom: '3px solid #000000ff', paddingBottom: '10px', marginBottom: '30px' }}>Namiki Route📦</h1>
                <p style={{color: '#555', fontSize: '18px'}}>Selecciona tu perfil para ingresar:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
                    <button onClick={() => onLogin('admin')} style={{ padding: '15px 35px', fontSize: '16px', cursor: 'pointer', background: '#012d5bff', color: 'white', border: 'none', borderRadius: '5px', transition: 'background-color 0.2s' }}>👨‍💻 Soy Gestor Logístico</button>
                    <button onClick={() => onLogin('driver')} style={{ padding: '15px 35px', fontSize: '16px', cursor: 'pointer', background: '#4a24a9ff', color: 'white', border: 'none', borderRadius: '5px', transition: 'background-color 0.2s' }}>🚚 SoyDriver</button>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL (APP) ---
export default function App() {
    const [view, setView] = useState('login');
    const handleLogin = (userType) => { setView(userType); };
    const handleLogout = () => { setView('login'); };
    
    if (view === 'login') return <LoginScreen onLogin={handleLogin} />;
    if (view === 'admin') return <AdminDashboard onLogout={handleLogout} />;
    if (view === 'driver') return <DriverView onLogout={handleLogout} />;
    
    return null;
}