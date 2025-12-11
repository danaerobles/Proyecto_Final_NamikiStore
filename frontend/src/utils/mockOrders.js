/**
 * Datos de Prueba (Mock Data) COMPLETOS
 * Incluye:
 * 1. Direcciones Reales (Santiago) -> Para ver la ruta en el mapa.
 * 2. Errores (Datos vacíos) -> Para probar tu Validador.
 * 3. Opción de Relleno -> Para probar el límite de 23 paradas.
 */

export const mockOrders = [
  // --- GRUPO 1: DIRECCIONES REALES (Para que el mapa funcione) ---
  {
    id: "PED-1001",
    cliente: "Ana Pérez",
    telefono: "+56912345678",
    direccion: "Av. Providencia 1234, Providencia", // Metro Manuel Montt
    estado: "PENDIENTE"
  },
  {
    id: "PED-1002",
    cliente: "Carlos Díaz",
    telefono: "987654321",
    direccion: "Moneda 1137, Santiago", // Cerca de La Moneda
    estado: "PENDIENTE"
  },
  {
    id: "PED-1003",
    cliente: "Luisa Tapia",
    telefono: "+56955555555",
    direccion: "Av. Apoquindo 4500, Las Condes", // Escuela Militar
    estado: "PENDIENTE"
  },
  {
    id: "PED-1004",
    cliente: "Pedro Pascal",
    telefono: "+56944444444",
    direccion: "Av. Irarrázaval 2401, Ñuñoa", // Plaza Ñuñoa
    estado: "PENDIENTE"
  },
  {
    id: "PED-1005",
    cliente: "Gabriela Mistral",
    telefono: "+56933333333",
    direccion: "Av. Vitacura 2900, Las Condes", // Costanera Center
    estado: "PENDIENTE"
  },

  // --- GRUPO 2: CASOS INVÁLIDOS (Para probar que tu sistema NO falla) ---
  {
    id: "PED-ERR-1",
    cliente: "Cliente Sin Dirección",
    telefono: "+56911111111",
    direccion: "", // ¡ESTO DEBE DAR ERROR ROJO! ❌
    estado: "PENDIENTE"
  },
  {
    id: "PED-ERR-2",
    cliente: "Cliente Fantasma",
    telefono: "", // ¡ESTO TAMBIÉN DEBE DAR ERROR! ❌
    direccion: "Calle Conocida 123",
    estado: "PENDIENTE"
  },

  // --- GRUPO 3: PRUEBA DE LÍMITE (SOLO DESCOMENTAR PARA PROBAR) ---
  // Si quieres ver la ALERTA de "Más de 23 pedidos", 
  // borra las dos barras "//" de la linea de abajo:
  
  // ...Array.from({ length: 20 }, (_, i) => ({ id: `RELLENO-${i}`, cliente: `Auto ${i}`, telefono: `111`, direccion: `Calle ${i}` }))

];