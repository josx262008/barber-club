// Inyección de dependencias: el controlador recibe el servicio desde afuera
// en vez de crearlo adentro. Así, en las pruebas puedo pasarle un servicio
// simulado (mock) sin llamar a la API real.

// Esta función fabrica el controlador y recibe el "servicio" como parámetro
function crearControlador(servicio) {
  // Devuelvo un objeto con las dos funciones que atienden las rutas
  return {
    // Se ejecuta cuando alguien pide /clientes
    // req = lo que llega (la petición), res = lo que respondo
    clientes: async (req, res) => {
      // try: intento hacer esto
      try {
        // Le pido los clientes al servicio y espero la respuesta
        const datos = await servicio.obtenerClientes();
        // Respondo al que preguntó con los datos en formato JSON
        res.json(datos);
      // catch: si algo falla (por ejemplo, se cae la API) cae aquí y no explota
      } catch (error) {
        // Respondo con código 500 (error del servidor) y un mensaje claro
        res.status(500).json({ error: 'No se pudieron obtener los clientes' });
      }
    },
    // Se ejecuta cuando alguien pide /citas; funciona igual que la anterior
    citas: async (req, res) => {
      try {
        // Le pido las citas al servicio
        const datos = await servicio.obtenerCitas();
        // Respondo con el JSON
        res.json(datos);
      } catch (error) {
        // Si falla, mensaje claro con código 500
        res.status(500).json({ error: 'No se pudieron obtener las citas' });
      }
    }
  };
}

// Exporto la función para usarla en app.js y en las pruebas
module.exports = crearControlador;