// reflect-metadata es una librería que TypeORM necesita para funcionar
require('reflect-metadata');
// Importo DataSource, la clase que maneja la conexión a la base de datos
const { DataSource } = require('typeorm');
// Importo las descripciones de las tablas que creé
const Cliente = require('../entities/Cliente');
const Servicio = require('../entities/Servicio');

// Creo la conexión con su configuración
const AppDataSource = new DataSource({
  // Tipo de base de datos que uso: SQLite
    type: 'better-sqlite3',
  // Nombre del archivo donde se va a guardar la base de datos
  database: 'barberia.sqlite',
  // synchronize: true hace que el ORM cree las tablas solo, sin CREATE TABLE
  synchronize: true,
  // Lista de tablas que el ORM debe crear
  entities: [Cliente, Servicio]
});

// Exporto la conexión para usarla en otros archivos
module.exports = AppDataSource;