const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ===========================
//   /api/geocode
// ===========================
app.post("/api/geocode", async(req, res) => {
    try {
        const { address } = req.body;

        if (!address) return res.status(400).json({ error: "Falta address" });

        const url =
            "https://nominatim.openstreetmap.org/search?format=json&q=" +
            encodeURIComponent(address);

        const geo = await axios.get(url);

        if (geo.data.length === 0) {
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
//   /api/optimize (DEMO)
// ===========================
app.post("/api/optimize", (req, res) => {
    const { locations } = req.body;

    if (!locations || locations.length === 0)
        return res.json({ status: "error", msg: "No locations" });

    // Ruta simple: visitar los puntos en orden
    const route = locations.map((_, i) => i);

    return res.json({
        status: "ok",
        routes: [route]
    });
});

// ===========================
//   /api/metrics  (Dashboard)
// ===========================
app.get("/api/metrics", (req, res) => {
    // Ejemplo fijo / fake data (puedes reemplazarlo después)
    const metrics = [
        { date: "2025-01-01", orders: 120, invalid_pct: 3.5, kms: 140, avg_min: 28 },
        { date: "2025-01-02", orders: 140, invalid_pct: 2.2, kms: 155, avg_min: 30 },
        { date: "2025-01-03", orders: 100, invalid_pct: 1.7, kms: 130, avg_min: 25 }
    ];

    res.json({ metrics });
});


// ===========================
//   /api/vrp  (Optimización)
// ===========================
app.post("/api/vrp", (req, res) => {
    const { locations } = req.body;

    if (!locations || locations.length === 0) {
        return res.status(400).json({ error: "No locations" });
    }

    // Retornamos una ruta simple (demo)
    const route = locations.map((loc, index) => ({
        lat: loc.lat,
        lng: loc.lng
    }));

    res.json({
        routes: [{
            vehicle: 1,
            path: route
        }]
    });
});


// ===========================
//   INICIAR SERVIDOR
// ===========================
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});