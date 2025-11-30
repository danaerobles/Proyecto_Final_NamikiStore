// backend/utils/http.js
// utilidades para respuestas HTTP estandarizadas 
function sendOk(res, data) {
    res.json({ ok: true, data });
}

function sendError(res, status = 500, message = 'error') {
    res.status(status).json({ ok: false, error: message });
}

module.exports = { sendOk, sendError };