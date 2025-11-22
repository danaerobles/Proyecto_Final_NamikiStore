// index.js (Backend minimal)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '5mb'}));

// STUB geocoding — reemplaza con Google/Mapbox/OpenRouteService en producción
app.post('/api/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    // Para pruebas devolvemos coordenadas aleatorias alrededor de Santiago
    const baseLat = -33.45 + (Math.random()-0.5)*0.1;
    const baseLng = -70.6667 + (Math.random()-0.5)*0.1;
    res.json({ lat: baseLat, lng: baseLng });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para optimizar: recibe { locations: [{lat,lng,demand,window:[start,end]}], num_vehicles, depot }
app.post('/api/optimize', async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const py = spawn('python3', ['services/vrp_solver.py']);
    let output = '';
    let errout = '';

    py.stdin.write(payload);
    py.stdin.end();

    py.stdout.on('data', (data)=> output += data.toString());
    py.stderr.on('data', (data)=> errout += data.toString());

    py.on('close', (code) => {
      if(errout) console.error('PY ERR:', errout);
      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch(e){
        res.status(500).json({ error: 'Invalid solver output', details: e.message, raw: output });
      }
    });
  } catch(e){
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend API running on http://localhost:${PORT}`));
