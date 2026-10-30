// Cargo las variables del archivo .env (ahí está mi clave, fuera del código)
require('dotenv').config();
// Importo axios para hacer peticiones a internet
const axios = require('axios');

// Dirección base de JSONPlaceholder (la uso para los clientes de prueba)
const URL_BASE = 'https://jsonplaceholder.typicode.com';
// Dirección base de la API de Cal.com (servicios y citas de la barbería)
const URL_CAL = 'https://api.cal.com/v2';

// Arma los encabezados que Cal.com exige: mi clave y la versión de su API
function encabezadosCal(version) {
  return {
    // La clave viaja como "Bearer" más la clave que está en el .env
    Authorization: 'Bearer ' + process.env.CAL_API_KEY,
    // Versión de la API que quiero usar
    'cal-api-version': version
  };
}

// Trae la lista de clientes de prueba
async function obtenerClientes() {
  // Pido /users a JSONPlaceholder y espero la respuesta
  const respuesta = await axios.get(`${URL_BASE}/users`);
  // Devuelvo solo el JSON
  return respuesta.data;
}

// Trae los servicios de la barbería (los tipos de evento de Cal.com)
async function obtenerServicios() {
  // Pido los tipos de evento con mi clave
  const respuesta = await axios.get(`${URL_CAL}/event-types`, { headers: encabezadosCal('2024-08-13') });
  // Cal.com envuelve la lista dentro de "data"
  const datos = respuesta.data.data;
  // Si es una lista la devuelvo; si no, devuelvo una lista vacía
  return Array.isArray(datos) ? datos : [];
}

// Trae las citas apartadas (las reservas de Cal.com)
async function obtenerCitas() {
  // Pido las reservas con mi clave; esta ruta pide la versión 2026-05-01
  const respuesta = await axios.get(`${URL_CAL}/bookings`, { headers: encabezadosCal('2026-05-01') });
  // La lista viene dentro de "data"
  const datos = respuesta.data.data;
  // Devuelvo la lista, o una vacía si no hay
  return Array.isArray(datos) ? datos : [];
}

// Exporto las funciones para usarlas en otros archivos
module.exports = { obtenerClientes, obtenerServicios, obtenerCitas };