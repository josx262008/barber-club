// Cargo las variables del archivo .env (ahí está mi clave de Cal.com, fuera del código)
require('dotenv').config();
// Importo axios, la librería que me deja hacer peticiones a internet
const axios = require('axios');

// Dirección base de JSONPlaceholder, la API de datos de prueba que uso para los clientes
const URL_BASE = 'https://jsonplaceholder.typicode.com';
// Dirección base de la API de Cal.com, que uso para los servicios y las citas
const URL_CAL = 'https://api.cal.com/v2';

// Función que arma los encabezados que Cal.com exige; recibe la versión de la API a usar
function encabezadosCal(version) {
  // Devuelvo un objeto con los dos encabezados
  return {
    // Authorization: aquí va mi clave. "Bearer" es la forma en que Cal.com espera recibirla,
    // y process.env.CAL_API_KEY es el valor guardado en el archivo .env
    Authorization: 'Bearer ' + process.env.CAL_API_KEY,
    // cal-api-version: le digo a Cal.com qué versión de su API quiero usar
    'cal-api-version': version
  };
}

// Función que trae la lista de clientes de prueba
// async porque pedir datos por internet tarda y la función tiene que esperar
async function obtenerClientes() {
  // await = espera a que JSONPlaceholder responda; pido /users y no mando clave porque no la pide
  const respuesta = await axios.get(`${URL_BASE}/users`);
  // respuesta.data es el JSON con los datos; eso es lo que devuelvo
  return respuesta.data;
}

// Función que trae los servicios de la barbería (los tipos de evento de Cal.com)
async function obtenerServicios() {
  // Pido /event-types a Cal.com y le mando los encabezados con mi clave y la versión 2024-06-14
  const respuesta = await axios.get(`${URL_CAL}/event-types`, { headers: encabezadosCal('2024-06-14') });
  // Cal.com mete la lista dentro de un campo llamado "data"; la guardo en esta variable
  const datos = respuesta.data.data;
  // Si lo que llegó es una lista la devuelvo; si no, devuelvo una lista vacía para no romper la página
  return Array.isArray(datos) ? datos : [];
}

// Función que trae las citas apartadas (las reservas de Cal.com)
async function obtenerCitas() {
  // Pido /bookings a Cal.com con mi clave; esta ruta pide la versión 2026-05-01
  const respuesta = await axios.get(`${URL_CAL}/bookings`, { headers: encabezadosCal('2026-05-01') });
  // La lista de reservas también viene dentro del campo "data"
  const datos = respuesta.data.data;
  // Devuelvo la lista, o una vacía si no llegó una lista
  return Array.isArray(datos) ? datos : [];
}

// Exporto las tres funciones para usarlas en otros archivos (el controlador y las pruebas)
module.exports = { obtenerClientes, obtenerServicios, obtenerCitas };