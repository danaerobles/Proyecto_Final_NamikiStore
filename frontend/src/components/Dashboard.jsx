// frontend/src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('http://localhost:4000/api/metrics');

        if (res.data && res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      } catch (err) {
        console.error("Error cargando métricas:", err);
      }
    }

    load();
  }, []);

  const labels = metrics.map(m => m.date);
  const orders = metrics.map(m => m.orders);
  const invalidPct = metrics.map(m => Number(m.invalid_pct.toFixed(2)));
  const kms = metrics.map(m => m.kms);
  const avgMin = metrics.map(m => m.avg_min);

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard — Analítica de Entregas</h1>

      <div style={{ maxWidth: 1000 }}>
        <h3>Pedidos diarios</h3>
        <Bar data={{ labels, datasets: [{ label: "Pedidos", data: orders }] }} />

        <h3 style={{ marginTop: 32 }}>Porcentaje inválidos (%)</h3>
        <Bar data={{ labels, datasets: [{ label: "% inválidos", data: invalidPct }] }} />

        <h3 style={{ marginTop: 32 }}>Kilómetros recorridos</h3>
        <Line data={{ labels, datasets: [{ label: "kms", data: kms }] }} />

        <h3 style={{ marginTop: 32 }}>Tiempo promedio de entrega (min)</h3>
        <Bar data={{ labels, datasets: [{ label: "Minutos", data: avgMin }] }} />
      </div>
    </div>
  );
}
