// Estados permitidos para una reserva
const ESTADOS = ['pendiente', 'confirmada', 'atendida', 'cancelada'];

// Toma solo los campos permitidos del cuerpo y les quita espacios
function limpiar(cuerpo) {
  const datos = {};
  ['clienteNombre', 'telefono', 'servicio', 'fechaHora', 'estado'].forEach((campo) => {
    if (typeof cuerpo[campo] === 'string') datos[campo] = cuerpo[campo].trim();
  });
  return datos;
}

// Devuelve un mensaje de error o null; completo = true exige los obligatorios (crear)
function validar(datos, completo) {
  if (completo) {
    for (const campo of ['clienteNombre', 'servicio', 'fechaHora']) {
      if (!datos[campo]) return 'Falta el campo obligatorio: ' + campo;
    }
  }
  for (const campo of ['clienteNombre', 'servicio', 'fechaHora']) {
    if (campo in datos && !datos[campo]) return 'El campo ' + campo + ' no puede estar vacío';
  }
  if (datos.estado && !ESTADOS.includes(datos.estado)) {
    return 'Estado no válido. Usa: ' + ESTADOS.join(', ');
  }
  return null;
}

// Inyección de dependencias: recibe el servicio de la base y el notificador desde afuera
function crearReservaControlador(servicio, notificador) {
  return {
    // POST /reservas: guarda en la base y luego envía a la API externa
    crear: async (req, res) => {
      try {
        const datos = limpiar(req.body || {});
        const error = validar(datos, true);
        if (error) return res.status(400).json({ error });
        // Paso 1: guardo en la base de datos
        const reserva = await servicio.crear(datos);
        // Paso 2: envío a la API externa; si falla, la reserva igual queda guardada
        let notificacion = 'no enviada';
        try {
          const externo = await notificador.notificar(reserva);
          notificacion = 'enviada (id externo ' + externo.id + ')';
        } catch (e) {
          console.error('No se pudo notificar a la API externa:', e.message);
        }
        res.status(201).json({ ...reserva, notificacion });
      } catch (error) {
        console.error('Error en POST /reservas:', error.message);
        res.status(500).json({ error: 'No se pudo crear la reserva' });
      }
    },

    // GET /reservas: todas
    listar: async (req, res) => {
      try { res.json(await servicio.listar()); }
      catch (error) {
        console.error('Error en GET /reservas:', error.message);
        res.status(500).json({ error: 'No se pudieron obtener las reservas' });
      }
    },

    // GET /reservas/:id: una por id (404 si no existe)
    obtener: async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'El id debe ser un número' });
        const reserva = await servicio.obtener(id);
        if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json(reserva);
      } catch (error) {
        console.error('Error en GET /reservas/:id:', error.message);
        res.status(500).json({ error: 'No se pudo obtener la reserva' });
      }
    },

    // PUT /reservas/:id: modifica (404 si no existe)
    actualizar: async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'El id debe ser un número' });
        const datos = limpiar(req.body || {});
        const error = validar(datos, false);
        if (error) return res.status(400).json({ error });
        const reserva = await servicio.actualizar(id, datos);
        if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json(reserva);
      } catch (error) {
        console.error('Error en PUT /reservas/:id:', error.message);
        res.status(500).json({ error: 'No se pudo actualizar la reserva' });
      }
    },

    // DELETE /reservas/:id: elimina y confirma (404 si no existe)
    eliminar: async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'El id debe ser un número' });
        const reserva = await servicio.eliminar(id);
        if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json({ mensaje: 'Reserva eliminada', id });
      } catch (error) {
        console.error('Error en DELETE /reservas/:id:', error.message);
        res.status(500).json({ error: 'No se pudo eliminar la reserva' });
      }
    }
  };
}

module.exports = crearReservaControlador;
