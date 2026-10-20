// Importo EntitySchema para describir la tabla
const { EntitySchema } = require('typeorm');

// Exporto la descripción de la tabla servicios
module.exports = new EntitySchema({
  // Nombre interno de la entidad
  name: 'Servicio',
  // Nombre que tendrá la tabla en la base de datos
  tableName: 'servicios',
  // Columnas de la tabla
  columns: {
    // id: número único, llave primaria, generado automáticamente
    id: { type: Number, primary: true, generated: true },
    // nombre del servicio, por ejemplo "Corte clásico"
    nombre: { type: String },
    // precio del servicio; 'float' guarda números con decimales
    precio: { type: 'float' },
    // activo: true si el servicio se sigue ofreciendo; por defecto es true
    activo: { type: Boolean, default: true }
  }
});