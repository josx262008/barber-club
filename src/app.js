// Importo express, el framework que crea el servidor
const express = require('express');
// Importo el servicio real, el que se conecta a la API
const apiService = require('./services/apiService');
// Importo la función que fabrica el controlador
const crearControlador = require('./controllers/controlador');

// Creo la aplicación (el servidor)
const app = express();
// Aquí está la inyección: le entrego el servicio real al controlador
const controlador = crearControlador(apiService);

// Cuando pidan GET /clientes, ejecuta la función clientes del controlador
app.get('/clientes', controlador.clientes);
// Cuando pidan GET /citas, ejecuta la función citas del controlador
app.get('/citas', controlador.citas);

// Enciendo el servidor en el puerto 3000 y muestro un mensaje en la terminal
app.listen(3000, () => console.log('Servidor en http://localhost:3000'));