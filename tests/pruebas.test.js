// Importo axios para poder simularlo (mock)
const axios = require('axios');
// Importo el servicio real, que es lo que voy a probar en la prueba 1
const apiService = require('../src/services/apiService');
// Importo la función que fabrica el controlador
const crearControlador = require('../src/controllers/controlador');

// Le digo a Jest: reemplaza axios por una versión falsa, así no se llama a internet
jest.mock('axios');

// Creo una respuesta falsa de Express para poder revisar qué devuelve el controlador
function crearRes() {
  // Objeto vacío que hará de "res"
  const res = {};
  // jest.fn() es una función espía: anota si la llamaron y con qué
  // mockReturnValue(res) hace que devuelva el mismo objeto, para poder encadenar
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  // Devuelvo el res falso
  return res;
}

// Prueba 1: el formato de los datos es correcto
// test('nombre', función) define una prueba
test('obtenerClientes retorna un array con campo id', async () => {
  // Le digo a axios falso que responda con una lista con una persona inventada
  axios.get.mockResolvedValue({ data: [{ id: 1, name: 'Ana' }] });
  // Llamo a la función real del servicio, que usará el axios falso
  const datos = await apiService.obtenerClientes();
  // expect = "espero que": reviso que lo devuelto sea un array
  expect(Array.isArray(datos)).toBe(true);
  // Reviso que el primer elemento tenga el campo id
  expect(datos[0]).toHaveProperty('id');
});

// Prueba 2: manejo de errores
test('el controlador devuelve un error claro cuando la API falla', async () => {
  // Creo un servicio falso que siempre falla, simulando que la API se cayó
  const servicioFalso = {
    obtenerClientes: jest.fn().mockRejectedValue(new Error('API caída'))
  };
  // Inyección: le entrego el servicio falso al controlador
  const controlador = crearControlador(servicioFalso);
  // Creo el res falso para espiar la respuesta
  const res = crearRes();
  // Ejecuto la función del controlador (req vacío porque no lo uso)
  await controlador.clientes({}, res);
  // Reviso que respondió con código 500
  expect(res.status).toHaveBeenCalledWith(500);
  // Reviso que mandó el mensaje de error claro
  expect(res.json).toHaveBeenCalledWith({ error: 'No se pudieron obtener los clientes' });
});

// Prueba 3: el controlador funciona con un servicio simulado
test('el controlador funciona con un servicio simulado', async () => {
  // Datos inventados que devolverá el servicio falso
  const datosFalsos = [{ id: 1, title: 'Cita de prueba' }];
  // Servicio falso que responde bien con esos datos
  const servicioFalso = {
    obtenerCitas: jest.fn().mockResolvedValue(datosFalsos)
  };
  // Inyección: le paso el servicio falso en lugar del real
  const controlador = crearControlador(servicioFalso);
  // Creo el res falso
  const res = crearRes();
  // Ejecuto la función citas del controlador
  await controlador.citas({}, res);
  // Reviso que el controlador respondió exactamente con esos datos
  expect(res.json).toHaveBeenCalledWith(datosFalsos);
});