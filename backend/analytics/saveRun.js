// backend/analytics/saveRun.js
// agrega un registro al histórico analytics.json
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'analytics.json');

function saveRun(runData) {
    let current = [];
    try {
        if (fs.existsSync(file)) {
            const raw = fs.readFileSync(file, 'utf8') || '[]';
            current = JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error leyendo analytics.json:', err);
    }

    current.push({
        id: Date.now(),
        date: new Date().toISOString(),
        ...runData
    });

    try {
        fs.writeFileSync(file, JSON.stringify(current, null, 2));
    } catch (err) {
        console.error('Error guardando analytics.json:', err);
    }
}

module.exports = { saveRun };