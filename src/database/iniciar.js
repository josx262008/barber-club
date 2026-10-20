// Importo la conexión que configuré en data-source.js
const AppDataSource = require('./data-source');

// initialize() enciende la conexión; en ese momento el ORM crea las tablas
AppDataSource.initialize()
  // .then se ejecuta si todo salió bien
  .then(async () => {
    // Muestro un mensaje en la terminal para confirmar
    console.log('Base de datos lista, tablas creadas por el ORM');
    // Cierro la conexión porque este script solo sirve para crear las tablas
    await AppDataSource.destroy();
  })
  // .catch se ejecuta si algo falló, y muestra el error en la terminal
  .catch((error) => console.error('Error al conectar:', error));