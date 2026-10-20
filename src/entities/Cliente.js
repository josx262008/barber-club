// Importo EntitySchema, la herramienta de TypeORM para describir una tabla
const { EntitySchema } = require('typeorm');

// Exporto la descripción de la tabla para usarla en otros archivos
module.exports = new EntitySchema({
  // Nombre interno de la entidad (la "clase" en mi código)
  name: 'Cliente',
  // Nombre real que va a tener la tabla en la base de datos
  tableName: 'clientes',
  // Aquí van las columnas de la tabla
  columns: {
    // id: número único de cada cliente; primary = es la llave primaria (PK)
    // generated = la base de datos lo asigna sola (1, 2, 3...)
    id: { type: Number, primary: true, generated: true },
    // nombre: texto, y es obligatorio
    nombre: { type: String },
    // telefono: texto; nullable = puede quedar vacío si no se tiene
    telefono: { type: String, nullable: true }
  }
});