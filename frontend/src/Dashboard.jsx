import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('http://localhost:4000/api/metrics');
        if (res.data && res.data.metrics) setMetrics(res.data.metrics);
      } catch (err) {
        console.error('Error fetching metrics', err);
      }
    }
    load();
  }, []);

  const labels = metrics.map(m => m.date);
  const orders = metrics.map(m => m.orders);
  const invalidPct = metrics.map(m => m.invalid_pct);
  const kms = metrics.map(m => +m.kms.toFixed(2));
  const avgMin = metrics.map(m => +m.avg_min.toFixed(1));

  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard — Entregas</h2>

      <div style={{ maxWidth: 900 }}>
        <h4>Pedidos diarios</h4>
        <Bar data={{ labels, datasets: [{ label: 'Pedidos', data: orders }] }} />

        <h4 style={{ marginTop: 20 }}>Porcentaje inválidos</h4>
        <Bar data={{ labels, datasets: [{ label: '% inválidos', data: invalidPct }] }} />

        <h4 style={{ marginTop: 20 }}>Kilómetros recorridos (diario)</h4>
        <Line data={{ labels, datasets: [{ label: 'kms', data: kms, fill: false }] }} />

        <h4 style={{ marginTop: 20 }}>Tiempo medio de entrega (min)</h4>
        <Bar data={{ labels, datasets: [{ label: 'minutos', data: avgMin }] }} />
      </div>
    </div>
  );
}