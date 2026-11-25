// Importo axios para hacer peticiones a internet
const axios = require('axios');

// Dirección base de la API externa (JSONPlaceholder acepta POST de práctica)
const URL_BASE = 'https://jsonplaceholder.typicode.com';

// Envía los datos de la reserva a la API externa y devuelve su respuesta
async function notificar(reserva) {


    // En la prueba de carga no llamo a la API externa (SIN_EXTERNAS=true)
  if (process.env.SIN_EXTERNAS === 'true') return { id: 0 };
  
  const respuesta = await axios.post(`${URL_BASE}/posts`, {
    title: 'Nueva reserva #' + reserva.id,
    body: reserva.clienteNombre + ' - ' + reserva.servicio + ' - ' + reserva.fechaHora,
    userId: 1
  });
  // La API devuelve el registro con un id nuevo; mi controlador lo muestra
  return respuesta.data;
}

module.exports = { notificar };