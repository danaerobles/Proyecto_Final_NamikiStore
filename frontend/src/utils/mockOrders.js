/**
 * Datos de Prueba (Mock Data) para Nakimi Store
 * Simula la respuesta de la Base de Datos o la carga de un CSV.
 */
export const mockOrders = [
  // --- CASOS VÁLIDOS ---
  {
    id: "PED-1001",
    cliente: "Ana Pérez",
    telefono: "+56912345678",
    direccion: "Av. Providencia 1234, Santiago",
    estado: "PENDIENTE"
  },
  {
    id: "PED-1002",
    cliente: "Carlos Díaz",
    telefono: "987654321",
    direccion: "Moneda 1137, Santiago Centro",
    estado: "PENDIENTE"
  },
  {
    id: "PED-1003",
    cliente: "Luisa Tapia",
    telefono: "+56955555555",
    direccion: "Av. Apoquindo 4500, Las Condes",
    estado: "PENDIENTE"
  },
  
  // --- CASOS INVÁLIDOS (Para probar tu Validador REQ-1.1) ---
  {
    id: "PED-ERR-1",
    cliente: "Sin Dirección",
    telefono: "+56911111111",
    direccion: "", // ERROR: Campo vacío
    estado: "PENDIENTE"
  },
  {
    id: "PED-ERR-2",
    cliente: "", // ERROR: Sin nombre
    telefono: "+56922222222",
    direccion: "Calle Falsa 123",
    estado: "PENDIENTE"
  },

  // --- RELLENO (Para probar el límite de 23 paradas REQ-2.6) ---
  // Generamos automáticamente más pedidos para superar el límite
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `PED-AUTO-${i + 1}`,
    cliente: `Cliente Auto ${i + 1}`,
    telefono: `+569000000${i}`,
    direccion: `Calle Genérica ${i + 1}, Santiago`,
    estado: "PENDIENTE"
  }))
];