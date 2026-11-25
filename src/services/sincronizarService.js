// Importo la conexión a la base de datos (la misma que uso en app.js)
const AppDataSource = require('../database/data-source');
// Importo mi servicio de APIs, que ya sabe pedir los datos a Cal.com y JSONPlaceholder
const apiService = require('./apiService');

// Esta función traduce el estado que usa Cal.com al estado que usa mi tabla de citas
function traducirEstado(estado) {
  // Si Cal.com dice "accepted", en mi base queda como "confirmada"
  if (estado === 'accepted') return 'confirmada';
  // Si Cal.com dice "cancelled", en mi base queda como "cancelada"
  if (estado === 'cancelled') return 'cancelada';
  // Cualquier otro estado lo guardo como "pendiente"
  return 'pendiente';
}

// Esta función trae los datos de las APIs y los guarda en la base de datos con el ORM
async function sincronizar() {
  // Objeto donde voy contando cuántos registros nuevos se guardaron de cada tipo
  const resumen = { clientes: 0, servicios: 0, citas: 0 };

  // ===== 1. CLIENTES (JSONPlaceholder -> tabla Cliente) =====
  try {
    // Pido al ORM el repositorio de Cliente (es el que me deja guardar y buscar clientes)
    const repo = AppDataSource.getRepository('Cliente');
    // Pido a la API externa la lista de clientes
    const clientesApi = await apiService.obtenerClientes();
    // Recorro uno por uno los clientes que trajo la API
    for (const c of clientesApi) {
      // Busco en mi base si ya existe un cliente con ese nombre (para no repetirlo)
      const existe = await repo.findOneBy({ nombre: c.name });
      // Si no existe, lo guardo
      if (!existe) {
        // create arma el cliente con mis columnas y save lo guarda en la base de datos
        await repo.save(repo.create({ nombre: c.name, telefono: c.phone }));
        // Sumo 1 al contador de clientes guardados
        resumen.clientes++;
      }
    }
  // Si algo falla (por ejemplo la API caída), muestro el error en la terminal y sigo con lo demás
  } catch (e) { console.error('Error sincronizando clientes:', e.message); }

  // ===== 2. SERVICIOS (Cal.com -> tabla Servicio) =====
  try {
    // Pido al ORM el repositorio de Servicio
    const repo = AppDataSource.getRepository('Servicio');
    // Pido a Cal.com la lista de servicios (tipos de evento)
    const serviciosApi = await apiService.obtenerServicios();
    // Recorro uno por uno los servicios que trajo la API
    for (const s of serviciosApi) {
      // Cal.com guarda el nombre en "title" (o en "name"); tomo el que exista
      const nombre = s.title || s.name;
      // Si el servicio no trae nombre, lo salto y paso al siguiente
      if (!nombre) continue;
      // Busco en mi base si ya existe un servicio con ese nombre
      const existe = await repo.findOneBy({ nombre });
      // Si no existe, lo guardo
      if (!existe) {
        // Cal.com no maneja precio en este endpoint, lo dejo en 0 para editarlo después
        await repo.save(repo.create({ nombre, precio: 0, activo: true }));
        // Sumo 1 al contador de servicios guardados
        resumen.servicios++;
      }
    }
  // Si algo falla, muestro el error en la terminal y sigo con lo demás
  } catch (e) { console.error('Error sincronizando servicios:', e.message); }

  // ===== 3. CITAS (Cal.com -> tabla Cita) =====
  try {
    // Pido al ORM el repositorio de Cita (ahí guardo las reservas)
    const repo = AppDataSource.getRepository('Cita');
    // Pido a Cal.com la lista de citas
    const citasApi = await apiService.obtenerCitas();
    // Recorro una por una las citas que trajo la API
    for (const c of citasApi) {
      // El nombre del cliente viene dentro de "attendees"; si no hay, pongo un texto por defecto
      const clienteNombre = c.attendees && c.attendees[0] ? c.attendees[0].name : 'Cliente sin nombre';
      // El servicio es el título de la cita; si no trae título, pongo un texto por defecto
      const servicio = c.title || 'Cita de Cal.com';
      // La fecha y hora de inicio de la cita viene en "start"
      const fechaHora = c.start;
      // Busco si ya guardé esa misma cita (mismo cliente, servicio y fecha) para no repetirla
      const existe = await repo.findOneBy({ clienteNombre, servicio, fechaHora });
      // Si no existe, la guardo
      if (!existe) {
        // create arma la cita con mis columnas y save la guarda en la base de datos
        await repo.save(repo.create({
          clienteNombre,                         // nombre del cliente
          telefono: '',                          // Cal.com no manda teléfono, lo dejo vacío
          servicio,                              // nombre del servicio
          fechaHora,                             // fecha y hora de la cita
          estado: traducirEstado(c.status)       // estado traducido a los que usa mi proyecto
        }));
        // Sumo 1 al contador de citas guardadas
        resumen.citas++;
      }
    }
  // Si algo falla, muestro el error en la terminal
  } catch (e) { console.error('Error sincronizando citas:', e.message); }

  // Devuelvo el resumen con cuántos registros nuevos se guardaron de cada tipo
  return resumen;
}

// Exporto la función para poder usarla desde app.js
module.exports = { sincronizar };