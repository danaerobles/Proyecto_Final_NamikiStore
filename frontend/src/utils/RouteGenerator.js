/**
 * Módulo de Generación de URL para Nakimi Store
 * Cumple con los requerimientos de la sección 7.3 de la ERS.
 */

const RouteGenerator = {
  /**
   * Genera la URL de Google Maps basada en origen, destino y waypoints.
   * @param {string} origin - Dirección o coordenadas de inicio (REQ-2.1).
   * @param {string} destination - Dirección o coordenadas de fin (REQ-2.2).
   * @param {string[]} waypoints - Lista de direcciones intermedias (REQ-2.3).
   * @returns {string} URL válida de Google Maps.
   */
  generateUrl: (origin, destination, waypoints = []) => {
    
    // 1. Validación de Regla de Negocio RN-002 y REQ-2.6
    // Google Maps permite máximo 25 puntos en total (Origen + Destino + 23 Waypoints).
    const MAX_WAYPOINTS = 23;
    
    if (!origin || !destination) {
      throw new Error("Error: Se requiere un Origen y un Destino obligatoriamente.");
    }

    if (waypoints.length > MAX_WAYPOINTS) {
      // Cumple con REQ-2.7 (Informar si se excede el límite)
      throw new Error(`Error: El límite es de ${MAX_WAYPOINTS} paradas intermedias. Has enviado ${waypoints.length}.`);
    }

    // 2. Codificación de URL (URL-Encoding) para cumplir con REQ-3.3
    // Esto asegura que espacios, tildes y caracteres especiales no rompan el link.
    const encodedOrigin = encodeURIComponent(origin);
    const encodedDestination = encodeURIComponent(destination);

    // 3. Procesamiento de Waypoints
    // Se deben separar por el caracter pipe "|" según REQ-3.2
    let waypointsString = "";
    
    if (waypoints.length > 0) {
      const encodedWaypoints = waypoints.map(wp => encodeURIComponent(wp));
      waypointsString = `&waypoints=${encodedWaypoints.join("|")}`;
    }

    // 4. Construcción de la URL final según REQ-3.1 y REQ-9.3.2
    // Base URL oficial de Google Maps Direction API
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    const finalUrl = `${baseUrl}&origin=${encodedOrigin}&destination=${encodedDestination}${waypointsString}`;

    return finalUrl;
  }
};

// Exportamos el módulo para usarlo en otras partes del proyecto (Node.js / ES6)
// module.exports = RouteGenerator; // Descomenta si usan CommonJS (require)
 export default RouteGenerator;   // Descomenta si usan ES Modules (import)

// --- ZONA DE PRUEBAS (Para que veas que funciona ya mismo) ---

try {
  // Datos de prueba simulando lo que vendría del Frontend
  const origenPrueba = "Centro de Distribución Nakimi";
  const destinoPrueba = "Plaza de Armas, Santiago";
  const paradasPrueba = [
    "Av. Providencia 1234, Santiago",
    "Calle Falsa 123, Ñuñoa", 
    "Estadio Nacional, Chile"
  ];

  console.log("--- Generando Ruta ---");
  const urlGenerada = RouteGenerator.generateUrl(origenPrueba, destinoPrueba, paradasPrueba);
  
  console.log("URL Creada Exitosamente:");
  console.log(urlGenerada);
  
  // Resultado esperado: Una URL larga que puedes pegar en tu navegador y verás la ruta trazada.

} catch (error) {
  console.error(error.message);
}