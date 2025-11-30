// backend/analytics/summary.js
// devuelve el histórico completo de analytics.json 
// devuelve el array completo del histórico para que el frontend pueda mostrar listados o detalle.

const fs = require('fs').promises;
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'analytics.json');

async function getAnalytics() {
    try {
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(raw || '[]');
    } catch (err) {
        // si no existe devolver []
        return [];
    }
}

module.exports = { getAnalytics };