const express = require('express');
const path = require('path');
// Servicios: APIs externas (Reto 1), base de datos y notificador (Reto 2)
const apiService = require('./services/apiService');
const reservaService = require('./services/reservaService');
const notificadorService = require('./services/notificadorService');
// Fábricas de controladores
const crearControlador = require('./controllers/controlador');
const crearReservaControlador = require('./controllers/reservaControlador');
const AppDataSource = require('./database/data-source');

const app = express();
// Inyección de dependencias
const controlador = crearControlador(apiService);
const reservas = crearReservaControlador(reservaService, notificadorService);

// Entiende JSON en el cuerpo de las peticiones y muestra la página de public
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Reto 1: datos de las APIs externas
app.get('/clientes', controlador.clientes);
app.get('/citas', controlador.citas);
app.get('/servicios', controlador.servicios);

// Reto 2: CRUD de reservas en mi base de datos
app.post('/reservas', reservas.crear);
app.get('/reservas', reservas.listar);
app.get('/reservas/:id', reservas.obtener);
app.put('/reservas/:id', reservas.actualizar);
app.delete('/reservas/:id', reservas.eliminar);

// --- CLIENTES LOCALES ---
app.get('/clientes-locales', async (req, res) => {
  try {
    const clienteRepo = AppDataSource.getRepository('Cliente');
    const clientesLocales = await clienteRepo.find();
    res.json(clientesLocales);
  } catch (error) {
    console.error('Error al obtener clientes locales:', error);
    res.status(500).json({ error: 'Error al obtener clientes locales' });
  }
});

app.post('/clientes-locales', async (req, res) => {
  try {
    const clienteRepo = AppDataSource.getRepository('Cliente');
    const nuevoCliente = clienteRepo.create(req.body);
    const resultado = await clienteRepo.save(nuevoCliente);
    res.status(201).json(resultado);
  } catch (error) {
    console.error('Error al crear cliente local:', error);
    res.status(500).json({ error: 'Error al crear cliente local' });
  }
});

app.put('/clientes-locales/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository('Cliente');
    await repo.update(req.params.id, req.body);
    res.json({ mensaje: 'Cliente actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

app.delete('/clientes-locales/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository('Cliente');
    await repo.delete(req.params.id);
    res.json({ mensaje: 'Cliente eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// --- SERVICIOS LOCALES ---
app.get('/servicios-locales', async (req, res) => {
  try {
    const servicioRepo = AppDataSource.getRepository('Servicio');
    const serviciosLocales = await servicioRepo.find();
    res.json(serviciosLocales);
  } catch (error) {
    console.error('Error al obtener servicios locales:', error);
    res.status(500).json({ error: 'Error al obtener servicios locales' });
  }
});

app.post('/servicios-locales', async (req, res) => {
  try {
    const servicioRepo = AppDataSource.getRepository('Servicio');
    const nuevoServicio = servicioRepo.create(req.body);
    const resultado = await servicioRepo.save(nuevoServicio);
    res.status(201).json(resultado);
  } catch (error) {
    console.error('Error al crear servicio local:', error);
    res.status(500).json({ error: 'Error al crear servicio local' });
  }
});

app.put('/servicios-locales/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository('Servicio');
    await repo.update(req.params.id, req.body);
    res.json({ mensaje: 'Servicio actualizado con éxito' });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

app.delete('/servicios-locales/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository('Servicio');
    await repo.delete(req.params.id);
    res.json({ mensaje: 'Servicio eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// Conecto la base de datos y enciendo el servidor
AppDataSource.initialize()
  .then(() => app.listen(3000, () => console.log('Servidor en http://localhost:3000')))
  .catch((error) => console.error('No se pudo conectar a la base de datos:', error));