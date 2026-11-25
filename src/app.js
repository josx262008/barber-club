const express = require('express');
const path = require('path');
// Servicios: APIs externas (Reto 1), base de datos y notificador (Reto 2)
const apiService = require('./services/apiService');
const reservaService = require('./services/reservaService');
const notificadorService = require('./services/notificadorService');
// Importo el servicio que copia los datos de las APIs a la base de datos
const sincronizarService = require('./services/sincronizarService');
// Servicio de auditoría para registrar eventos en SQLite
const { registrarAuditoria } = require('./services/auditoriaService');
// Fábricas de controladores
const crearControlador = require('./controllers/controlador');
const crearReservaControlador = require('./controllers/reservaControlador');
const AppDataSource = require('./database/data-source');
// Importo mi logger para poder escribir registros desde este archivo
const logger = require('./logger');

const DURACION_CITA_MIN = 40;
const HORA_INICIO_MIN = 9 * 60;  // 09:00 a. m.
const HORA_FIN_MIN = 20 * 60;    // 08:00 p. m.

const app = express();
// Inyección de dependencias
const controlador = crearControlador(apiService);
const reservas = crearReservaControlador(reservaService, notificadorService);

// Oculto el encabezado que dice que uso Express
app.disable('x-powered-by');

// Registro de cada petición: método, ruta, código HTTP y tiempo que tardó
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - inicio}ms`);
  });
  next();
});

// Endpoint de salud: sirve para saber si el servidor está vivo
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Entiende JSON en el cuerpo de las peticiones y muestra la página de public
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Protección: solo deja pasar si llega la clave del barbero (guardada en el .env, no en el código)
function soloBarbero(req, res, next) {
  const clave = req.get('x-clave-barbero');
  if (!process.env.CLAVE_BARBERO || clave !== process.env.CLAVE_BARBERO) {
    return res.status(401).json({ error: 'Solo el barbero puede hacer esto' });
  }
  next();
}

// El barbero entra con su clave; si es correcta, la página muestra los botones de administración
app.post('/login-barbero', (req, res) => {
  const clave = (req.body || {}).clave;
  if (process.env.CLAVE_BARBERO && clave === process.env.CLAVE_BARBERO) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Clave incorrecta' });
});

// Reto 1: datos de las APIs externas
app.get('/clientes', controlador.clientes);
app.get('/citas', controlador.citas);
app.get('/servicios', controlador.servicios);

// Convierte "YYYY-MM-DDTHH:mm" o ISO en { dia: "YYYY-MM-DD", minutos: number } en hora Colombia
function extraerDiaYMinutos(fechaHoraStr) {
  if (typeof fechaHoraStr !== 'string' || !fechaHoraStr.trim()) return null;
  const limpia = fechaHoraStr.trim();

  const matchLocal = limpia.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (matchLocal) {
    const dia = matchLocal[1];
    const hh = Number(matchLocal[2]);
    const mm = Number(matchLocal[3]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return { dia, minutos: hh * 60 + mm };
    }
  }

  const fecha = new Date(limpia);
  if (isNaN(fecha.getTime())) return null;

  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(fecha);

  const mapa = {};
  partes.forEach((p) => { mapa[p.type] = p.value; });
  const hh = Number(mapa.hour === '24' ? '00' : mapa.hour);
  const mm = Number(mapa.minute);
  return { dia: `${mapa.year}-${mapa.month}-${mapa.day}`, minutos: hh * 60 + mm };
}

function hayChoqueHorario(inicioNuevo, finNuevo, inicioExistente, finExistente) {
  return inicioNuevo < finExistente && finNuevo > inicioExistente;
}

// Endpoint público solo para consultar qué horas ya están ocupadas en un día (sin datos personales)
app.get('/horarios-ocupados', async (req, res) => {
  try {
    const diaConsulta = typeof req.query.fecha === 'string' ? req.query.fecha.trim() : '';
    const todas = await reservaService.listar();
    const ocupadas = [];

    for (const cita of todas) {
      if ((cita.estado || 'pendiente') === 'cancelada') continue;
      const parsed = extraerDiaYMinutos(cita.fechaHora);
      if (!parsed) continue;
      if (diaConsulta && parsed.dia !== diaConsulta) continue;
      ocupadas.push({
        fechaHora: cita.fechaHora,
        dia: parsed.dia,
        minutos: parsed.minutos,
        duracionMin: DURACION_CITA_MIN
      });
    }

    res.json({ duracionMin: DURACION_CITA_MIN, ocupadas });
  } catch (error) {
    logger.fallo('Error al consultar horarios ocupados:', error);
    res.status(500).json({ error: 'No se pudieron consultar los horarios ocupados' });
  }
});

// Registra automáticamente un cliente si no existe aún por teléfono o nombre
async function asegurarClienteDesdeReserva(nombreRaw, telefonoRaw) {
  const nombre = typeof nombreRaw === 'string' ? nombreRaw.trim() : '';
  const telefono = typeof telefonoRaw === 'string' ? telefonoRaw.trim() : '';
  if (!nombre || nombre.length < 2 || nombre.length > 60) return;

  const telefonoValido = telefono && /^[0-9+().\-\sxX]{7,25}$/.test(telefono) ? telefono : null;
  const clienteRepo = AppDataSource.getRepository('Cliente');

  let existente = null;
  if (telefonoValido) {
    existente = await clienteRepo.findOne({ where: { telefono: telefonoValido } });
  }
  if (!existente) {
    existente = await clienteRepo.findOne({ where: { nombre } });
  }
  if (!existente) {
    await clienteRepo.save(clienteRepo.create({ nombre, telefono: telefonoValido }));
  }
}

// Reto 2: CRUD de reservas
app.post('/reservas', async (req, res, next) => {
  try {
    const datos = {};
    ['clienteNombre', 'telefono', 'servicio', 'fechaHora', 'estado'].forEach((campo) => {
      if (typeof req.body?.[campo] === 'string') datos[campo] = req.body[campo].trim();
    });
    if (!datos.estado) datos.estado = 'pendiente';
    if (!datos.clienteNombre || !datos.servicio || !datos.fechaHora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (clienteNombre, servicio, fechaHora)' });
    }

    const parsedNueva = extraerDiaYMinutos(datos.fechaHora);
    if (!parsedNueva) {
      return res.status(400).json({ error: 'Fecha y hora no válidas' });
    }

    const inicioNueva = parsedNueva.minutos;
    const finNueva = inicioNueva + DURACION_CITA_MIN;
    if (inicioNueva < HORA_INICIO_MIN || finNueva > HORA_FIN_MIN) {
      return res.status(400).json({
        error: 'El horario de atención es de 9:00 a. m. a 8:00 p. m. y cada cita dura máximo 40 minutos'
      });
    }

    const existentes = await reservaService.listar();
    for (const cita of existentes) {
      if ((cita.estado || 'pendiente') === 'cancelada') continue;
      const parsedExistente = extraerDiaYMinutos(cita.fechaHora);
      if (!parsedExistente || parsedExistente.dia !== parsedNueva.dia) continue;

      const inicioEx = parsedExistente.minutos;
      const finEx = inicioEx + DURACION_CITA_MIN;
      if (hayChoqueHorario(inicioNueva, finNueva, inicioEx, finEx)) {
        return res.status(409).json({
          error: 'Ese horario ya está ocupado por otra cita (duración de 40 minutos por corte)'
        });
      }
    }

    const reserva = await reservaService.crear(datos);

    try {
      await asegurarClienteDesdeReserva(reserva.clienteNombre, reserva.telefono);
    } catch (e) {
      logger.fallo('No se pudo registrar automáticamente el cliente:', e);
    }

    await registrarAuditoria({
      req,
      nombre: reserva.clienteNombre || null,
      usuario: reserva.telefono || reserva.clienteNombre || null,
      servicio: reserva.servicio || null,
      accion: 'PIDIO',
    });

    let notificacion = 'no enviada';
    try {
      const externo = await notificadorService.notificar(reserva);
      notificacion = 'enviada (id externo ' + externo.id + ')';
    } catch (e) {
      logger.fallo('No se pudo notificar a la API externa:', e.message);
    }

    return res.status(201).json({ ...reserva, notificacion });
  } catch (error) {
    next(error);
  }
});

app.get('/reservas', soloBarbero, reservas.listar);
app.get('/reservas/:id', soloBarbero, reservas.obtener);

app.post('/reservas/:id/cancelar', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'El id debe ser un número' });
    const existente = await reservaService.obtener(id);
    if (!existente) return res.status(404).json({ error: 'Reserva no encontrada' });

    const actualizada = await reservaService.actualizar(id, { estado: 'cancelada' });
    await registrarAuditoria({
      req,
      nombre: actualizada.clienteNombre || null,
      usuario: actualizada.telefono || actualizada.clienteNombre || null,
      servicio: actualizada.servicio || null,
      accion: 'CANCELO',
    });
    res.json({ mensaje: 'Cita cancelada', reserva: actualizada });
  } catch (error) {
    logger.fallo('Error al cancelar reserva:', error);
    res.status(500).json({ error: 'No se pudo cancelar la cita' });
  }
});

app.put('/reservas/:id', soloBarbero, async (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = async (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const cita = (body && (body.data || body)) || {};
      await registrarAuditoria({
        req,
        nombre: cita.clienteNombre || req.body?.clienteNombre || null,
        usuario: cita.telefono || cita.clienteNombre || req.body?.telefono || null,
        servicio: cita.servicio || req.body?.servicio || null,
        accion: cita.estado === 'confirmada' ? 'CONFIRMO' : 'ACTUALIZO',
      });
    }
    return origJson(body);
  };
  return reservas.actualizar(req, res, next);
});

app.delete('/reservas/:id', soloBarbero, reservas.eliminar);

// --- AUDITORÍA (solo el barbero) ---
app.get('/auditoria', soloBarbero, async (req, res) => {
  try {
    const registros = await AppDataSource.query(
      'SELECT id, nombre, usuario, servicio, hora, rol FROM auditoria ORDER BY id DESC'
    );
    res.json(registros);
  } catch (error) {
    logger.fallo('Error al obtener auditoría:', error);
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

// Toma solo los campos permitidos de un cliente y les quita los espacios
function limpiarCliente(cuerpo) {
  const datos = {};
  ['nombre', 'telefono'].forEach((campo) => {
    if (typeof cuerpo[campo] === 'string') datos[campo] = cuerpo[campo].trim();
  });
  return datos;
}

// Devuelve un mensaje de error, o null si todo está bien
function validarCliente(datos, completo) {
  if (completo && !datos.nombre) return 'Falta el campo obligatorio: nombre';
  if ('nombre' in datos && (datos.nombre.length < 2 || datos.nombre.length > 60)) {
    return 'El nombre debe tener entre 2 y 60 caracteres';
  }
  if (datos.telefono && !/^[0-9+().\-\sxX]{7,25}$/.test(datos.telefono)) {
    return 'El teléfono no es válido (solo números, de 7 a 25 caracteres)';
  }
  return null;
}

// --- CLIENTES LOCALES (ver, editar y borrar es solo del barbero) ---
app.get('/clientes-locales', soloBarbero, async (req, res) => {
  try {
    const clienteRepo = AppDataSource.getRepository('Cliente');
    res.json(await clienteRepo.find());
  } catch (error) {
    logger.fallo('Error al obtener clientes locales:', error);
    res.status(500).json({ error: 'Error al obtener clientes locales' });
  }
});

app.post('/clientes-locales', soloBarbero, async (req, res) => {
  try {
    const datos = limpiarCliente(req.body || {});
    const error = validarCliente(datos, true);
    if (error) return res.status(400).json({ error });
    const clienteRepo = AppDataSource.getRepository('Cliente');
    const resultado = await clienteRepo.save(clienteRepo.create(datos));

    await registrarAuditoria({
      req,
      nombre: resultado.nombre,
      usuario: resultado.telefono || resultado.nombre,
      servicio: null,
      accion: 'REGISTRO_CLIENTE',
    });

    res.status(201).json(resultado);
  } catch (error) {
    logger.fallo('Error al crear cliente local:', error);
    res.status(500).json({ error: 'Error al crear cliente local' });
  }
});

app.put('/clientes-locales/:id', soloBarbero, async (req, res) => {
  try {
    const datos = limpiarCliente(req.body || {});
    const error = validarCliente(datos, false);
    if (error) return res.status(400).json({ error });
    await AppDataSource.getRepository('Cliente').update(req.params.id, datos);
    res.json({ mensaje: 'Cliente actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

app.delete('/clientes-locales/:id', soloBarbero, async (req, res) => {
  try {
    await AppDataSource.getRepository('Cliente').delete(req.params.id);
    res.json({ mensaje: 'Cliente eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// --- SERVICIOS LOCALES (leer es de todos; agregar, editar y borrar es solo del barbero) ---
app.get('/servicios-locales', async (req, res) => {
  try {
    const servicioRepo = AppDataSource.getRepository('Servicio');
    res.json(await servicioRepo.find());
  } catch (error) {
    logger.fallo('Error al obtener servicios locales:', error);
    res.status(500).json({ error: 'Error al obtener servicios locales' });
  }
});

app.post('/servicios-locales', soloBarbero, async (req, res) => {
  try {
    const servicioRepo = AppDataSource.getRepository('Servicio');
    const resultado = await servicioRepo.save(servicioRepo.create(req.body));
    res.status(201).json(resultado);
  } catch (error) {
    logger.fallo('Error al crear servicio local:', error);
    res.status(500).json({ error: 'Error al crear servicio local' });
  }
});

app.put('/servicios-locales/:id', soloBarbero, async (req, res) => {
  try {
    await AppDataSource.getRepository('Servicio').update(req.params.id, req.body);
    res.json({ mensaje: 'Servicio actualizado con éxito' });
  } catch (error) {
    logger.fallo('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

app.delete('/servicios-locales/:id', soloBarbero, async (req, res) => {
  try {
    await AppDataSource.getRepository('Servicio').delete(req.params.id);
    res.json({ mensaje: 'Servicio eliminado con éxito' });
  } catch (error) {
    logger.fallo('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// --- BORRAR TODOS LOS DATOS LOCALES (solo el barbero) ---
app.delete('/datos', soloBarbero, async (req, res) => {
  try {
    await AppDataSource.getRepository('Cita').clear();
    await AppDataSource.getRepository('Servicio').clear();
    await AppDataSource.getRepository('Cliente').clear();
    await AppDataSource.query('DELETE FROM auditoria');
    res.json({ mensaje: 'Datos locales borrados' });
  } catch (error) {
    logger.fallo('Error al borrar los datos:', error);
    res.status(500).json({ error: 'No se pudieron borrar los datos' });
  }
});

// --- SINCRONIZAR: copia los datos de las APIs a la base de datos (solo el barbero) ---
app.post('/sincronizar', soloBarbero, async (req, res) => {
  try {
    const resumen = await sincronizarService.sincronizar();
    res.json({ mensaje: 'Datos de las APIs guardados en la base de datos', guardados: resumen });
  } catch (error) {
    logger.fallo('Error en /sincronizar:', error.message);
    res.status(500).json({ error: 'No se pudo sincronizar' });
  }
});

// Si ninguna ruta coincide, respondo 404 con un mensaje simple
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores: el detalle va al log y al usuario solo le llega un mensaje genérico
app.use((err, req, res, next) => {
  logger.fallo('Error en ' + req.method + ' ' + req.originalUrl, err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El JSON enviado no es válido' });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

process.on('uncaughtException', (err) => {
  console.error('EXCEPCION NO CAPTURADA:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('PROMESA RECHAZADA SIN CATCH:', reason);
});

if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS auditoria (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT,
          usuario TEXT,
          servicio TEXT,
          hora TEXT NOT NULL,
          rol TEXT NOT NULL DEFAULT 'cliente'
        )
      `);

 app.listen(3000, () => console.log('Barbería El J · Servidor activo en http://localhost:3000'));     
    })
    .catch((error) => logger.fallo('No se pudo conectar a la base de datos:', error));
}

module.exports = app;