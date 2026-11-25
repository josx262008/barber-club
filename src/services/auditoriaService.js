const dbModule = require('../database/data-source');
const db = dbModule.AppDataSource || dbModule;

function obtenerRol(req) {
  const claveRecibida = req?.get?.('x-clave-barbero') || req?.header?.('x-clave-barbero');
  const claveEsperada = process.env.CLAVE_BARBERO || 'barbero';
  return claveRecibida && claveRecibida === claveEsperada ? 'barbero' : 'cliente';
}

async function registrarAuditoria({ req, nombre, usuario, servicio, accion }) {
  try {
    if (!db || !db.isInitialized) return;

    const rol = obtenerRol(req);
    const hora = new Date().toISOString();
    let detalleServicio = servicio || null;

    if (accion && detalleServicio) {
      detalleServicio = `${accion}: ${detalleServicio}`;
    } else if (accion && !detalleServicio) {
      detalleServicio = accion;
    }

    await db.query(
      `INSERT INTO auditoria (nombre, usuario, servicio, hora, rol)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre || null, usuario || null, detalleServicio, hora, rol]
    );
  } catch (err) {
    console.error('Error al guardar en auditoria:', err.message);
  }
}

module.exports = { registrarAuditoria };