// Usuario público de mi Cal.com (es la parte de mi enlace: cal.com/ESTE-USUARIO/corte)
const USUARIO_CAL = 'jose-mestra-9j6nkc';

// Pide datos a mi API y devuelve el JSON
async function pedir(ruta) {
  const respuesta = await fetch(ruta);
  // Si el servidor respondió con error, lanzo un error para atraparlo después
  if (!respuesta.ok) throw new Error('El servidor respondió con error');
  return respuesta.json();
}

// Arma una tarjeta con título, líneas de texto, una etiqueta opcional y un botón opcional
function crearTarjeta(titulo, lineas, etiqueta, boton) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';

  const h3 = document.createElement('h3');
  // textContent pone el texto como texto simple (más seguro que innerHTML)
  h3.textContent = titulo;
  tarjeta.appendChild(h3);

  lineas.forEach((texto) => {
    const p = document.createElement('p');
    p.textContent = texto;
    tarjeta.appendChild(p);
  });

  if (etiqueta) {
    const span = document.createElement('span');
    span.className = 'etiqueta ' + etiqueta.clase;
    span.textContent = etiqueta.texto;
    tarjeta.appendChild(span);
  }

  // Si me pasaron un botón (texto y enlace), lo agrego al final de la tarjeta
  if (boton) {
    const a = document.createElement('a');
    a.className = 'boton-reservar';
    a.textContent = boton.texto;
    a.href = boton.url;
    // Se abre en una pestaña nueva y sin dar acceso a mi página
    a.target = '_blank';
    a.rel = 'noopener';
    tarjeta.appendChild(a);
  }
  return tarjeta;
}

// Convierte una fecha en texto legible, en hora de Colombia
function formatearFecha(texto) {
  const fecha = new Date(texto);
  if (isNaN(fecha)) return 'Fecha no disponible';
  return fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
}

// Carga los clientes de prueba (JSONPlaceholder)
async function cargarClientes() {
  const cont = document.getElementById('clientes');
  try {
    const clientes = await pedir('/clientes');
    document.getElementById('fuente-clientes').textContent =
      'Fuente: GET /clientes (API JSONPlaceholder) · ' + clientes.length + ' registros recibidos';
    cont.textContent = '';
    clientes.forEach((c) => cont.appendChild(crearTarjeta(c.name, [c.phone, c.email])));
  } catch (error) {
    cont.textContent = 'No se pudieron cargar los clientes';
  }
}

// Carga los servicios de la barbería (Cal.com)
async function cargarServicios() {
  const cont = document.getElementById('servicios');
  try {
    const servicios = await pedir('/servicios');
    document.getElementById('fuente-servicios').textContent =
      'Fuente: GET /servicios (API Cal.com) · ' + servicios.length + ' registros recibidos';
    cont.textContent = '';
    if (servicios.length === 0) { cont.textContent = 'Todavía no hay servicios creados'; return; }
    // Muestro solo los servicios visibles (los ocultos de Cal.com no se listan)
    servicios.filter((s) => !s.hidden).forEach((s) => {
      const nombre = s.title || s.name || 'Servicio';
      const minutos = s.lengthInMinutes || s.length;
      const lineas = [];
      if (s.description) lineas.push(s.description);
      if (minutos) lineas.push('Duración: ' + minutos + ' minutos');
      // Enlace de reserva: el que mande Cal.com, o lo armo con mi usuario y el slug del servicio
      const url = s.bookingUrl || ('https://cal.com/' + USUARIO_CAL + '/' + encodeURIComponent(s.slug));
      cont.appendChild(crearTarjeta(nombre, lineas, null, { texto: 'Pedir cita', url: url }));
    });
  } catch (error) {
    cont.textContent = 'No se pudieron cargar los servicios';
  }
}

// Carga las citas apartadas (Cal.com)
async function cargarCitas() {
  const cont = document.getElementById('citas');
  try {
    const citas = await pedir('/citas');
    document.getElementById('fuente-citas').textContent =
      'Fuente: GET /citas (API Cal.com) · ' + citas.length + ' registros recibidos';
    cont.textContent = '';
    if (citas.length === 0) { cont.textContent = 'Todavía no hay citas apartadas'; return; }
    citas.forEach((c) => {
      const cliente = c.attendees && c.attendees[0] ? c.attendees[0].name : 'Cliente sin nombre';
      let etiqueta = { texto: 'Pendiente', clase: 'pendiente' };
      if (c.status === 'accepted') etiqueta = { texto: 'Confirmada', clase: 'atendida' };
      if (c.status === 'cancelled') etiqueta = { texto: 'Cancelada', clase: 'cancelada' };
      cont.appendChild(crearTarjeta(c.title || 'Cita', ['Fecha: ' + formatearFecha(c.start), 'Cliente: ' + cliente], etiqueta));
    });
  } catch (error) {
    cont.textContent = 'No se pudieron cargar las citas';
  }
}

// Ejecuto las tres cargas apenas se abre la página
cargarClientes();
cargarServicios();
cargarCitas();