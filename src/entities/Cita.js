// Importo EntitySchema para describir la tabla
const { EntitySchema } = require('typeorm');

// Exporto la descripción de la tabla citas (las reservas de la barbería)
module.exports = new EntitySchema({
  // Nombre interno de la entidad
  name: 'Cita',
  // Nombre que tendrá la tabla en la base de datos
  tableName: 'citas',
  // Columnas de la tabla
  columns: {
    // id: número único, llave primaria, generado automáticamente
    id: { type: Number, primary: true, generated: true },
    // clienteNombre: nombre de quien aparta la cita (obligatorio)
    clienteNombre: { type: String },
    // telefono: teléfono del cliente; nullable = puede quedar vacío
    telefono: { type: String, nullable: true },
    // servicio: qué se va a hacer, por ejemplo "Corte de cabello" (obligatorio)
    servicio: { type: String },
    // fechaHora: fecha y hora de la cita, guardada como texto (obligatorio)
    fechaHora: { type: String },
    // estado: cómo va la cita; si no se dice nada, queda como "pendiente"
    estado: { type: String, default: 'pendiente' }
  }
});