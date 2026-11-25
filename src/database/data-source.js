// reflect-metadata es una librería que TypeORM necesita para funcionar
require('reflect-metadata');
// Importo DataSource, la clase que maneja la conexión a la base de datos
const { DataSource } = require('typeorm');
// Importo las descripciones de las tablas que creé
const Cliente = require('../entities/Cliente');
const Servicio = require('../entities/Servicio');
const Cita = require('../entities/Cita');

// Creo la conexión con su configuración
const AppDataSource = new DataSource({
  // Tipo de base de datos que uso: SQLite

  type: 'better-sqlite3',
  // En las pruebas uso una base en memoria (se borra sola); si no, el archivo de siempre


  database: process.env.NODE_ENV === 'test' ? ':memory:' : 'barberia.sqlite',
  // Si arranco con LOG_SILENT=true (prueba de carga), el logger no escribe nada


  silent: process.env.LOG_SILENT === 'true',
  // synchronize: true hace que el ORM cree las tablas solo, sin CREATE TABLE
  synchronize: true,
  // Lista de tablas que el ORM debe crear

  
  entities: [Cliente, Servicio, Cita]
});

// Exporto la conexión para usarla en otros archivos
module.exports = AppDataSource;