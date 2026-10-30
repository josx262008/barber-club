require('dotenv').config();
const axios = require('axios');

const URL_BASE = 'https://jsonplaceholder.typicode.com';
const URL_CAL = 'https://api.cal.com/v2';

function encabezadosCal(version) {
  return {
    Authorization: 'Bearer ' + process.env.CAL_API_KEY,
    'cal-api-version': version
  };
}

async function obtenerClientes() {
  const respuesta = await axios.get(`${URL_BASE}/users`);
  return respuesta.data;
}

async function obtenerServicios() {
  const respuesta = await axios.get(`${URL_CAL}/event-types`, { headers: encabezadosCal('2024-06-14') });
  const datos = respuesta.data.data;
  return Array.isArray(datos) ? datos : [];
}

async function obtenerCitas() {
  const respuesta = await axios.get(`${URL_CAL}/bookings`, { headers: encabezadosCal('2026-05-01') });
  const datos = respuesta.data.data;
  return Array.isArray(datos) ? datos : [];
}

module.exports = { obtenerClientes, obtenerServicios, obtenerCitas };