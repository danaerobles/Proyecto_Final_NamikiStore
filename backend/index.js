const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ===========================
//   /api/geocode (Geocodificación Real con OSM)
// ===========================
app.post("/api/geocode", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) return res.status(400).json({ error: "Falta address" });

    // Consultamos a OpenStreetMap
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
      encodeURIComponent(address);

    const geo = await axios.get(url);

    if (geo.data.length === 0) {
      // Coordenada por defecto (Santiago) si no encuentra nada
      return res.json({ lat: -33.45, lng: -70.6667 });
    }

    res.json({
      lat: parseFloat(geo.data[0].lat),
      lng: parseFloat(geo.data[0].lon)
    });

  } catch (err) {
    console.error("GEOCODE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===========================
//   /api/vrp (ANTES ERA OPTIMIZE)
// ===========================
// Corregimos el nombre y el formato para que el mapa dibuje líneas azules
app.post("/api/vrp", (req, res) => {
  const { locations } = req.body;

  if (!locations || locations.length === 0)
    return res.json({ status: "error", msg: "No locations" });

  console.log(`Recibida solicitud VRP con ${locations.length} puntos.`);

  // SIMULACIÓN DE RUTA:
  // Tomamos los puntos tal cual vienen y creamos el camino (path)
  // para que el Frontend pueda dibujar la línea azul.
  const path = locations.map(loc => ({
      lat: loc.lat, 
      lng: loc.lng
  }));

  return res.json({
    status: "ok",
    routes: [
        {
            // El frontend espera esta estructura 'path' para usar Polyline
            path: path 
        }
    ]
  });
});

// ===========================
//   INICIAR SERVIDOR
// ===========================
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor Backend LISTO en http://localhost:${PORT}`);
});