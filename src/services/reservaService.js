// Conexión a la base de datos y descripción de la tabla citas
const AppDataSource = require('../database/data-source');
const Cita = require('../entities/Cita');

// Repositorio: la herramienta del ORM para leer y guardar filas
function repo() { return AppDataSource.getRepository(Cita); }

// READ (todos)
async function listar() { return repo().find({ order: { id: 'ASC' } }); }

// READ (uno por id); devuelve null si no existe
async function obtener(id) { return repo().findOneBy({ id }); }

// CREATE: arma la fila y la guarda; devuelve la fila con su id
async function crear(datos) { return repo().save(repo().create(datos)); }

// UPDATE: busca, cambia solo lo recibido y guarda; null si no existe
async function actualizar(id, datos) {
  const cita = await repo().findOneBy({ id });
  if (!cita) return null;
  repo().merge(cita, datos);
  return repo().save(cita);
}

// DELETE: busca y borra; null si no existe
async function eliminar(id) {
  const cita = await repo().findOneBy({ id });
  if (!cita) return null;
  const copia = { ...cita };
  await repo().remove(cita);
  return copia;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };