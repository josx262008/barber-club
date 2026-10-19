// Importo axios, la librería que me deja hacer peticiones a internet
const axios = require('axios');

// Dirección base de la API que consumo (JSONPlaceholder)
const URL_BASE = 'https://jsonplaceholder.typicode.com';

// Función que trae la lista de clientes
// "async" porque internet tarda y la función tiene que esperar
async function obtenerClientes() {
  // "await" = espera a que la API responda antes de seguir
  // Pido /users (usuarios), que en mi proyecto representan a los clientes
  const respuesta = await axios.get(`${URL_BASE}/users`);
  // respuesta.data es el JSON con los datos; eso es lo que devuelvo
  return respuesta.data;
}

// Función que trae la lista de citas
async function obtenerCitas() {
  // Pido /todos (tareas) y con ?_limit=10 solo traigo 10; representan las citas
  const respuesta = await axios.get(`${URL_BASE}/todos?_limit=10`);
  // Devuelvo solo el JSON
  return respuesta.data;
}

// Exporto las dos funciones para poder usarlas en otros archivos
module.exports = { obtenerClientes, obtenerCitas };