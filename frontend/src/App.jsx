import React, { useState, useRef } from "react"
import axios from "axios"
import * as XLSX from "xlsx"
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import Dashboard from "./src/Dashboard"

export default function App() {
  const [locations, setLocations] = useState([])
  const [routes, setRoutes] = useState([])
  const [backendLog, setBackendLog] = useState([])
  const fileRef = useRef()

  const log = (msg, data = null) => {
    setBackendLog(prev => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        msg,
        data
      }
    ])
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)

    const output = []

    for (const r of rows) {
      if (r["dirección"]) {
        const fullAddress = `${r["dirección"] || ""}, ${r["departamento"] || ""}, ${r["comuna"] || ""}, ${r["extra"] || ""}`

        try {
          const geo = await axios.post("http://localhost:4000/api/geocode", {
            address: fullAddress
          })

          log("Geocoding (fullAddress)", {
            fullAddress,
            geo: geo.data
          })

          output.push({
            lat: geo.data.lat,
            lng: geo.data.lng,
            demand: 0
          })

          continue
        } catch (err) {
          log("ERROR geocoding", err.message)
        }
      }

      if (r.lat && r.lng) {
        output.push({
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lng),
          demand: parseInt(r.demand || 0, 10)
        })
      }
    }

    setLocations(output)
    log("Direcciones cargadas", output)
  }

  const optimizeRoutes = async () => {
    if (locations.length === 0) {
      alert("⚠ Primero carga direcciones.")
      return
    }

    try {
      /* const res = await axios.post("http://localhost:4000/api/vrp", { locations }) */
      const res = await axios.post("http://localhost:4000/api/optimize", { locations })

      log("Respuesta backend VRP", res.data)
      setRoutes(res.data.routes || [])
    } catch (err) {
      log("ERROR optimizando VRP", err.message)
      alert("Error optimizando rutas")
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ width: 380, padding: 12, overflow: "auto", borderRight: "1px solid #ccc" }}>
        <h2>NamikiRoute</h2>
        <p>Generador de rutas + Excel + Geocoding</p>

        <hr />

        <h3>Cargar XLSX</h3>
        <input type="file" ref={fileRef} accept=".xlsx" onChange={handleFile} />

        <button
          onClick={optimizeRoutes}
          style={{ marginTop: 20, padding: "8px 12px", background: "#4caf50", color: "white", border: "none", cursor: "pointer" }}
        >
          Optimizar rutas
        </button>

        <hr />

        <h3>Logs</h3>
        <div style={{ fontSize: 12 }}>
          {backendLog.map((l, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <b>{l.time}</b> — {l.msg}
              <pre>{JSON.stringify(l.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <MapContainer center={[-33.45, -70.66]} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {locations.map((loc, i) => (
            <Marker key={i} position={[loc.lat, loc.lng]} />
          ))}

          {routes.map((route, rIndex) => (
            <Polyline key={rIndex} positions={route.path.map(p => [p.lat, p.lng])} color="blue" />
          ))}
        </MapContainer>
      </div>
    </div>
  )

}