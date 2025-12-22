const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// --- FÓRMULA MATEMÁTICA: DISTANCIA (Haversine) ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; 
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

// ===========================
//   /api/geocode
// ===========================
app.post("/api/geocode", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: "Falta address" });

    const config = { headers: { 'User-Agent': 'NamikiRouteProject/1.0' } };
    const url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(address);
    const geo = await axios.get(url, config);

    if (geo.data.length === 0) return res.json({ lat: -33.45, lng: -70.6667 });

    res.json({ lat: parseFloat(geo.data[0].lat), lng: parseFloat(geo.data[0].lon) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================
//   /api/vrp (OPTIMIZADOR CON ORIGEN Y DESTINO)
// ===========================
app.post("/api/vrp", (req, res) => {
  const { locations, origin, destination } = req.body;

  if (!locations || locations.length === 0)
    return res.json({ status: "error", msg: "No locations" });

  let pending = [...locations];
  let optimizedOrders = [];
  let path = []; // Esta será la línea azul completa

  // 1. PUNTO DE INICIO (ORIGEN)
  let current;
  if (origin && origin.lat) {
      current = origin;
      path.push(current); // Dibujamos el origen en el mapa
  } else {
      // Si no hay origen, partimos del primer pedido
      current = pending.shift(); 
      optimizedOrders.push(current);
      path.push(current);
  }

  // 2. BUCLE: VECINO MÁS CERCANO
  while (pending.length > 0) {
    let nearestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < pending.length; i++) {
      const dist = getDistanceFromLatLonInKm(current.lat, current.lng, pending[i].lat, pending[i].lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    // Moverse al siguiente
    current = pending[nearestIndex];
    optimizedOrders.push(current); // Lo agregamos a la lista ordenada
    path.push(current);            // Lo agregamos a la línea azul
    pending.splice(nearestIndex, 1);
  }

  // 3. PUNTO FINAL (DESTINO)
  if (destination && destination.lat) {
      path.push(destination); // Cerramos la línea azul en el destino
  }

  return res.json({
    status: "ok",
    optimizedLocations: optimizedOrders, // Solo pedidos (para reordenar la lista)
    routes: [{ path: path }]             // Ruta completa (para el mapa)
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => { console.log(`✅ Backend INTELIGENTE listo en http://localhost:${PORT}`); });