// Inyección de dependencias: el controlador no crea su propio servicio,
// lo recibe como parámetro desde afuera. Lo hice así para que el controlador
// no quede pegado a la API real, y en las pruebas pueda pasarle un servicio
// falso (mock) sin conectarme a internet.



// Fábrica del controlador: recibe el servicio (real o falso en las pruebas)
function crearControlador(servicio) {
  return {
    // Se ejecuta cuando alguien pide /clientes
    clientes: async (req, res) => {
      try {
        const datos = await servicio.obtenerClientes();
        res.json(datos);
      } catch (error) {
        console.error('Error en /clientes:', error.message);
        res.status(500).json({ error: 'No se pudieron obtener los clientes' });
      }
    },

    // Se ejecuta cuando alguien pide /servicios
    servicios: async (req, res) => {
      try {
        const datos = await servicio.obtenerServicios();
        res.json(datos);
      } catch (error) {
        console.error('Error en /servicios:', error.message);
        res.status(500).json({ error: 'No se pudieron obtener los servicios' });
      }
    },

    // Se ejecuta cuando alguien pide /citas
    citas: async (req, res) => {
      try {
        const datos = await servicio.obtenerCitas();
        res.json(datos);
      } catch (error) {
        console.error('Error en /citas:', error.message);
        res.status(500).json({ error: 'No se pudieron obtener las citas' });
      }
    }
  };
}

module.exports = crearControlador;