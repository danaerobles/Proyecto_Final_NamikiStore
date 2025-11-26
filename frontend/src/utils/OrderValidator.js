/**
 * Validador de Pedidos para Nakimi Store
 * Cumple con REQ-1.1, REQ-1.2 y RN-001 (Integridad de datos)
 */
const OrderValidator = {
  /**
   * Valida si un pedido tiene todos los campos obligatorios.
   * @param {Object} pedido 
   * @returns {Object} { isValid: boolean, errores: string[] }
   */
  validate: (pedido) => {
    const errores = [];

    // 1. Validación de campos obligatorios (RN-001)
    if (!pedido.id) errores.push("Falta Número de Pedido");
    if (!pedido.cliente || pedido.cliente.trim() === "") errores.push("Falta Nombre Cliente");
    if (!pedido.telefono) errores.push("Falta Teléfono");
    if (!pedido.direccion || pedido.direccion.trim() === "") errores.push("Falta Dirección");

    return {
      isValid: errores.length === 0,
      errores: errores
    };
  }
};

export default OrderValidator;