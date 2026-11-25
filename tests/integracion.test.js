// Fuerzo el modo prueba: así la app usa la base de datos en memoria y no barberia.sqlite
process.env.NODE_ENV = 'test';
// Pongo una clave de barbero fija para las pruebas (antes de cargar la app)
process.env.CLAVE_BARBERO = 'clave-de-prueba';

// supertest hace peticiones a la app sin necesidad de encender el servidor
const request = require('supertest');

// Reemplazo el notificador por uno falso, para que las pruebas no llamen a internet
jest.mock('../src/services/notificadorService', () => ({
  notificar: jest.fn().mockResolvedValue({ id: 101 })
}));

// Importo la app completa (rutas, validaciones, controladores) y la conexión a la base
const app = require('../src/app');
const AppDataSource = require('../src/database/data-source');

// Antes de todas las pruebas: enciendo la base de datos (en memoria, vacía)
beforeAll(async () => {
  await AppDataSource.initialize();
});

// Al terminar todas las pruebas: cierro la conexión
afterAll(async () => {
  await AppDataSource.destroy();
});

// Reserva de ejemplo que uso en las tres pruebas
const reservaEjemplo = {
  clienteNombre: 'Cliente Integracion',
  telefono: '3001112233',
  servicio: 'Corte de cabello',
  fechaHora: '2026-12-01T10:00'
};

// Prueba 1: flujo Create completo
test('Create: POST /reservas responde 201 y el dato queda en la base', async () => {
  // Hago la petición POST como si fuera Postman
  const res = await request(app).post('/reservas').send(reservaEjemplo);
  // Verifico que respondió 201 (creado) y que devolvió un id
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('id');
  // Voy directo a la base de datos a confirmar que la reserva existe
  const guardada = await AppDataSource.getRepository('Cita').findOneBy({ id: res.body.id });
  expect(guardada).not.toBeNull();
  expect(guardada.clienteNombre).toBe('Cliente Integracion');
});

// Prueba 2: flujo Read con dato real
test('Read: GET /reservas/:id devuelve exactamente el dato guardado', async () => {
  // Guardo una reserva directamente en la base de datos
  const repo = AppDataSource.getRepository('Cita');
  const guardada = await repo.save(repo.create(reservaEjemplo));
  // La pido por su id a través de la API
  const res = await request(app).get('/reservas/' + guardada.id);
  // Verifico que respondió 200 y que trae exactamente esos datos
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    id: guardada.id,
    clienteNombre: 'Cliente Integracion',
    servicio: 'Corte de cabello',
    fechaHora: '2026-12-01T10:00'
  });
});

// Prueba 3: flujo Delete
test('Delete: DELETE /reservas/:id borra la reserva y el GET posterior responde 404', async () => {
  // Creo una reserva para poder borrarla
  const repo = AppDataSource.getRepository('Cita');
  const guardada = await repo.save(repo.create(reservaEjemplo));
  // La borro; el DELETE exige la clave del barbero en el encabezado
  const borrado = await request(app)
    .delete('/reservas/' + guardada.id)
    .set('x-clave-barbero', 'clave-de-prueba');
  expect(borrado.status).toBe(200);
  // Pido la misma reserva otra vez: ya no debe existir
  const despues = await request(app).get('/reservas/' + guardada.id);
  expect(despues.status).toBe(404);
});