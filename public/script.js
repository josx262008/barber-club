let claveBarbero = sessionStorage.getItem('claveBarbero') || '';
let vistaBarberoActiva = 'pedidas';
const STORAGE_ULTIMA_CITA = 'ultimaCitaBarberiaElJ';
const DURACION_CITA_MIN = 40;
const HORA_INICIO_MIN = 9 * 60;  // 09:00 a. m.
const HORA_FIN_MIN = 20 * 60;    // 08:00 p. m.
const PASO_MIN = 30;

// ===== AUDIO GTA AUTOMÁTICO AL ENTRAR Y PAUSA AL SALIR =====
let usuarioSalioDePagina = false;

function obtenerAudioGta() {
  const el = document.getElementById('audio-gta');
  if (el) el.volume = 0.4;
  return el;
}

async function reproducirAudioGtaAlEntrar() {
  if (usuarioSalioDePagina || document.hidden) return;
  const audio = obtenerAudioGta();
  if (!audio) return;
  try {
    await audio.play();
  } catch {
    // Si el navegador bloquea el sonido automático antes del primer gesto, se activa en el primer clic/toque/tecla
  }
}

function detenerAudioGtaAlSalir() {
  const audio = obtenerAudioGta();
  if (!audio) return;
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {}
}

window.addEventListener('DOMContentLoaded', () => {
  usuarioSalioDePagina = false;
  reproducirAudioGtaAlEntrar();
});

window.addEventListener('pageshow', () => {
  usuarioSalioDePagina = false;
  reproducirAudioGtaAlEntrar();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    detenerAudioGtaAlSalir();
  } else if (!usuarioSalioDePagina) {
    reproducirAudioGtaAlEntrar();
  }
});

window.addEventListener('pagehide', () => {
  usuarioSalioDePagina = true;
  detenerAudioGtaAlSalir();
});

window.addEventListener('beforeunload', () => {
  usuarioSalioDePagina = true;
  detenerAudioGtaAlSalir();
});

['pointerdown', 'keydown', 'touchstart'].forEach((evento) => {
  window.addEventListener(
    evento,
    () => {
      if (!usuarioSalioDePagina) reproducirAudioGtaAlEntrar();
    },
    { passive: true }
  );
});

function esBarbero() { return claveBarbero !== ''; }

function cabeceras() {
  const h = { 'Content-Type': 'application/json' };
  if (esBarbero()) h['x-clave-barbero'] = claveBarbero;
  return h;
}

function mostrarModo() {
  document.body.classList.toggle('modo-barbero', esBarbero());
}

function salirPanelBarbero() {
  if (!confirm('¿Deseas salir del panel del barbero?')) return;
  claveBarbero = '';
  sessionStorage.removeItem('claveBarbero');
  mostrarModo();
  cargarServicios();
  renderizarUltimaCitaCliente();
  actualizarHorasDisponibles();
  cargarTablaHorasOcupadas();
}

async function alternarBarbero() {
  if (esBarbero()) {
    salirPanelBarbero();
    return;
  }

  const clave = prompt('Clave del barbero:');
  if (!clave) return;
  const res = await fetch('/login-barbero', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clave })
  });
  if (!res.ok) {
    alert('Clave incorrecta');
    return;
  }
  claveBarbero = clave;
  sessionStorage.setItem('claveBarbero', clave);
  mostrarModo();
  cambiarVistaBarbero('pedidas');
  cargarDatosBarbero();
  const panel = document.getElementById('panel-privado-barbero');
  if (panel) panel.scrollIntoView({ behavior: 'smooth' });
}

function cambiarVistaBarbero(vista) {
  vistaBarberoActiva = vista;
  document.getElementById('vista-citas-pedidas').style.display = vista === 'pedidas' ? 'block' : 'none';
  document.getElementById('vista-citas-canceladas').style.display = vista === 'canceladas' ? 'block' : 'none';
  document.getElementById('vista-clientes').style.display = vista === 'clientes' ? 'block' : 'none';
  document.getElementById('vista-auditoria').style.display = vista === 'auditoria' ? 'block' : 'none';
}

async function pedir(ruta, conClave = false) {
  const opciones = conClave ? { headers: cabeceras() } : undefined;
  const respuesta = await fetch(ruta, opciones);
  if (!respuesta.ok) throw new Error('El servidor respondió con error');
  return respuesta.json();
}

function crearTarjeta(titulo, lineas, etiqueta, boton) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';
  const h3 = document.createElement('h3');
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
  if (boton) {
    const a = document.createElement('a');
    a.className = 'boton-reservar';
    a.textContent = boton.texto;
    a.href = boton.url;
    tarjeta.appendChild(a);
  }
  return tarjeta;
}

function crearBoton(texto, clase, accion) {
  const b = document.createElement('button');
  b.textContent = texto;
  b.className = clase;
  b.onclick = accion;
  return b;
}

function formatearFecha(texto) {
  const fecha = new Date(texto);
  if (isNaN(fecha)) return 'Fecha no disponible';
  return fecha.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true,
    timeZone: 'America/Bogota'
  });
}

function formatearSoloFecha(diaStr) {
  if (!diaStr) return '—';
  const partes = String(diaStr).split('-');
  if (partes.length !== 3) return diaStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearHoraAmPm(minutosDesdeMedianoche) {
  const hh24 = Math.floor(minutosDesdeMedianoche / 60);
  const mm = minutosDesdeMedianoche % 60;
  const periodo = hh24 >= 12 ? 'p. m.' : 'a. m.';
  let hh12 = hh24 % 12;
  if (hh12 === 0) hh12 = 12;
  return `${String(hh12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${periodo}`;
}

function valorHora24(minutosDesdeMedianoche) {
  const hh24 = Math.floor(minutosDesdeMedianoche / 60);
  const mm = minutosDesdeMedianoche % 60;
  return `${String(hh24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function hayChoqueHorario(inicioNuevo, finNuevo, inicioExistente, finExistente) {
  return inicioNuevo < finExistente && finNuevo > inicioExistente;
}

async function poblarSelectHorasConDia(selectHora, dia) {
  if (!selectHora) return;
  selectHora.innerHTML = '<option value="">Selecciona hora...</option>';

  let ocupadas = [];
  if (dia) {
    try {
      const data = await pedir(`/horarios-ocupados?fecha=${encodeURIComponent(dia)}`);
      ocupadas = Array.isArray(data.ocupadas) ? data.ocupadas : [];
    } catch {
      ocupadas = [];
    }
  }

  for (let min = HORA_INICIO_MIN; min <= HORA_FIN_MIN; min += PASO_MIN) {
    const finSlot = min + DURACION_CITA_MIN;
    const bloqueada = ocupadas.some((c) => {
      const inicioEx = Number(c.minutos);
      const finEx = inicioEx + Number(c.duracionMin || DURACION_CITA_MIN);
      return hayChoqueHorario(min, finSlot, inicioEx, finEx);
    });

    const opt = document.createElement('option');
    opt.value = valorHora24(min);
    opt.disabled = bloqueada;
    opt.textContent = bloqueada
      ? `${formatearHoraAmPm(min)} (Ocupado)`
      : formatearHoraAmPm(min);
    selectHora.appendChild(opt);
  }
}
async function actualizarHorasDisponibles() {
  const selectHora = document.getElementById('horaCitaAmPm');
  const dia = document.getElementById('fechaCitaDia')?.value || '';
  await poblarSelectHorasConDia(selectHora, dia);
}

async function actualizarHorasManuales() {
  const selectHora = document.getElementById('horaManualAmPm');
  const dia = document.getElementById('fechaManualDia')?.value || '';
  await poblarSelectHorasConDia(selectHora, dia);
}

async function cargarTablaHorasOcupadas() {
  const tbody = document.getElementById('cuerpo-tabla-ocupadas');
  if (!tbody) return;

  const diaFiltro = document.getElementById('fechaCitaDia')?.value || '';
  const query = diaFiltro ? `?fecha=${encodeURIComponent(diaFiltro)}` : '';

  try {
    const data = await pedir(`/horarios-ocupados${query}`);
    const ocupadas = Array.isArray(data.ocupadas) ? data.ocupadas : [];
    const duracion = Number(data.duracionMin || DURACION_CITA_MIN);

    tbody.innerHTML = '';
    if (ocupadas.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = diaFiltro
        ? `No hay horas ocupadas el ${formatearSoloFecha(diaFiltro)}. Todos los turnos están libres.`
        : 'No hay horas ocupadas registradas por ahora.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    ocupadas.forEach((item) => {
      const tr = document.createElement('tr');

      const tdFecha = document.createElement('td');
      tdFecha.textContent = formatearSoloFecha(item.dia);

      const tdHora = document.createElement('td');
      const inicioMin = Number(item.minutos);
      const finMin = inicioMin + duracion;
      tdHora.textContent = `${formatearHoraAmPm(inicioMin)} – ${formatearHoraAmPm(finMin)}`;

      const tdDur = document.createElement('td');
      tdDur.textContent = `${duracion} min`;

      const tdEstado = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge-ocupado';
      badge.textContent = 'Ocupado';
      tdEstado.appendChild(badge);

      tr.appendChild(tdFecha);
      tr.appendChild(tdHora);
      tr.appendChild(tdDur);
      tr.appendChild(tdEstado);
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="4">No se pudieron cargar las horas ocupadas</td></tr>';
  }
}

async function alCambiarFechaCita() {
  await actualizarHorasDisponibles();
  await cargarTablaHorasOcupadas();
}

function avisarSiRechazo(res, mensaje) {
  if (res.status === 401) alert('Solo el barbero puede hacer esto');
  else if (!res.ok) alert(mensaje);
  return res.ok;
}

// ===== SERVICIOS =====
async function cargarServicios() {
  const cont = document.getElementById('servicios');
  const selectCita = document.getElementById('servicioCita');
  const selectManual = document.getElementById('servicioManual');
  if (selectCita) selectCita.innerHTML = '<option value="">Selecciona un servicio...</option>';
  if (selectManual) selectManual.innerHTML = '<option value="">Selecciona un servicio...</option>';

  try {
    const serviciosLocales = await pedir('/servicios-locales');
    cont.textContent = '';
    if (serviciosLocales.length === 0) {
      cont.textContent = 'Todavía no hay servicios creados';
      return;
    }

    serviciosLocales.forEach((s) => {
      const id = s.id;
      const lineas = [];
      if (s.precio !== undefined && s.precio !== null) {
        lineas.push('Precio: $' + Number(s.precio).toLocaleString('es-CO'));
      }
      const tarjeta = crearTarjeta(
        s.nombre || 'Servicio',
        lineas,
        { texto: 'Disponible', clase: 'atendida' },
        { texto: 'Pedir cita', url: '#pedir-cita-sec' }
      );

      if (esBarbero()) {
        tarjeta.appendChild(crearBoton('Editar', 'btn-accion', async () => {
          const nuevoNombre = prompt('Nuevo nombre del servicio:', s.nombre);
          const nuevoPrecioStr = prompt('Nuevo precio ($):', s.precio);
          if (nuevoNombre !== null && id) {
            let nuevoPrecio = Number(nuevoPrecioStr);
            if (nuevoPrecio > 0 && nuevoPrecio < 1000) nuevoPrecio = nuevoPrecio * 1000;
            const res = await fetch('/servicios-locales/' + id, {
              method: 'PUT',
              headers: cabeceras(),
              body: JSON.stringify({ nombre: nuevoNombre, precio: isNaN(nuevoPrecio) ? 0 : nuevoPrecio, activo: true })
            });
            if (avisarSiRechazo(res, 'No se pudo actualizar el servicio')) cargarServicios();
          }
        }));
        tarjeta.appendChild(crearBoton('Borrar', 'btn-accion btn-eliminar', async () => {
          if (confirm('¿Seguro que deseas eliminar este servicio?')) {
            const res = await fetch('/servicios-locales/' + id, { method: 'DELETE', headers: cabeceras() });
            if (avisarSiRechazo(res, 'No se pudo eliminar el servicio')) cargarServicios();
          }
        }));
      }
      cont.appendChild(tarjeta);

      const textoOpcion = s.nombre + (s.precio !== undefined ? ' ($' + Number(s.precio).toLocaleString('es-CO') + ')' : '');
      if (selectCita) {
        const option = document.createElement('option');
        option.value = s.nombre;
        option.textContent = textoOpcion;
        selectCita.appendChild(option);
      }
      if (selectManual) {
        const optionM = document.createElement('option');
        optionM.value = s.nombre;
        optionM.textContent = textoOpcion;
        selectManual.appendChild(optionM);
      }
    });
  } catch (error) {
    cont.textContent = 'No se pudieron cargar los servicios';
  }
}

async function agregarServicio(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombreServicio').value;
  let precio = parseFloat(document.getElementById('precioServicio').value);
  if (precio > 0 && precio < 1000) precio = precio * 1000;
  const res = await fetch('/servicios-locales', {
    method: 'POST',
    headers: cabeceras(),
    body: JSON.stringify({ nombre, precio, activo: true })
  });
  if (avisarSiRechazo(res, 'Error al guardar el servicio')) {
    document.getElementById('form-servicio').reset();
    cargarServicios();
  }
}

// ===== PEDIR CITA =====
function renderizarUltimaCitaCliente() {
  const cont = document.getElementById('ultima-cita-cliente');
  if (!cont) return;
  cont.innerHTML = '';

  const raw = sessionStorage.getItem(STORAGE_ULTIMA_CITA);
  if (!raw) return;

  let cita;
  try { cita = JSON.parse(raw); } catch {
    sessionStorage.removeItem(STORAGE_ULTIMA_CITA);
    return;
  }

  if (!cita || !cita.id || cita.estado === 'cancelada') {
    sessionStorage.removeItem(STORAGE_ULTIMA_CITA);
    return;
  }

  const tarjeta = crearTarjeta(
    cita.servicio || 'Cita solicitada',
    [
      'Cliente: ' + (cita.clienteNombre || ''),
      'Teléfono: ' + (cita.telefono || ''),
      'Fecha y hora: ' + formatearFecha(cita.fechaHora)
    ],
    { texto: 'Cita solicitada', clase: 'atendida' }
  );

  tarjeta.appendChild(crearBoton('Cancelar cita', 'btn-accion btn-eliminar', async () => {
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
    const res = await fetch('/reservas/' + cita.id + '/cancelar', { method: 'POST' });
    if (!res.ok) {
      alert('No se pudo cancelar la cita');
      return;
    }
    sessionStorage.removeItem(STORAGE_ULTIMA_CITA);
    alert('Cita cancelada.');
    renderizarUltimaCitaCliente();
    actualizarHorasDisponibles();
    actualizarHorasManuales();
    cargarTablaHorasOcupadas();
    if (esBarbero()) cargarDatosBarbero();
  }));

  cont.appendChild(tarjeta);
}

async function agregarCita(e) {
  e.preventDefault();
  const clienteNombre = document.getElementById('clienteCita').value;
  const telefono = document.getElementById('telCita').value;
  const servicio = document.getElementById('servicioCita').value;
  const dia = document.getElementById('fechaCitaDia').value;
  const hora24 = document.getElementById('horaCitaAmPm').value;

  if (!dia || !hora24) {
    alert('Por favor selecciona la fecha en el calendario y la hora (9:00 a. m. – 8:00 p. m.)');
    return;
  }

  const fechaHora = `${dia}T${hora24}:00`;

  const res = await fetch('/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clienteNombre, telefono, servicio, fechaHora })
  });

  if (!res.ok) {
    let errMsg = 'Error al pedir la cita';
    try {
      const dataErr = await res.json();
      if (dataErr && dataErr.error) errMsg = dataErr.error;
    } catch {}
    alert(errMsg);
    actualizarHorasDisponibles();
    actualizarHorasManuales();
    cargarTablaHorasOcupadas();
    return;
  }

  const creada = await res.json();
  sessionStorage.setItem(STORAGE_ULTIMA_CITA, JSON.stringify({
    id: creada.id,
    clienteNombre: creada.clienteNombre || clienteNombre,
    telefono: creada.telefono || telefono,
    servicio: creada.servicio || servicio,
    fechaHora: creada.fechaHora || fechaHora,
    estado: creada.estado || 'pendiente'
  }));

  document.getElementById('form-cita').reset();
  renderizarUltimaCitaCliente();
  actualizarHorasDisponibles();
  actualizarHorasManuales();
  cargarTablaHorasOcupadas();
  if (esBarbero()) cargarDatosBarbero();
}

async function agregarCitaManual(e) {
  e.preventDefault();
  if (!esBarbero()) return;

  const clienteNombre = document.getElementById('clienteManual').value;
  const telefono = document.getElementById('telManual').value;
  const servicio = document.getElementById('servicioManual').value;
  const dia = document.getElementById('fechaManualDia').value;
  const hora24 = document.getElementById('horaManualAmPm').value;

  if (!dia || !hora24) {
    alert('Selecciona la fecha en el calendario y la hora (9:00 a. m. – 8:00 p. m.)');
    return;
  }

  const fechaHora = `${dia}T${hora24}:00`;

  const res = await fetch('/reservas', {
    method: 'POST',
    headers: cabeceras(),
    body: JSON.stringify({ clienteNombre, telefono, servicio, fechaHora })
  });

  if (!res.ok) {
    let errMsg = 'No se pudo guardar la cita manual';
    try {
      const dataErr = await res.json();
      if (dataErr && dataErr.error) errMsg = dataErr.error;
    } catch {}
    alert(errMsg);
    actualizarHorasManuales();
    cargarTablaHorasOcupadas();
    return;
  }

  document.getElementById('form-cita-manual').reset();
  actualizarHorasDisponibles();
  actualizarHorasManuales();
  cargarTablaHorasOcupadas();
  cargarDatosBarbero();
}

// ===== PANEL PRIVADO DEL BARBERO =====
async function cargarCitasBarbero() {
  if (!esBarbero()) return;
  const contPedidas = document.getElementById('citas-pedidas');
  const contCanceladas = document.getElementById('citas-canceladas');

  try {
    const todas = await pedir('/reservas', true);
    const pedidas = todas.filter((c) => (c.estado || 'pendiente') !== 'cancelada');
    const canceladas = todas.filter((c) => c.estado === 'cancelada');

    contPedidas.textContent = '';
    if (pedidas.length === 0) {
      contPedidas.textContent = 'No hay citas pedidas';
    } else {
      pedidas.forEach((c) => {
        const estado = c.estado || 'pendiente';
        const etiqueta = estado === 'confirmada' || estado === 'atendida'
          ? { texto: 'Confirmada', clase: 'atendida' }
          : { texto: 'Pedida', clase: 'pendiente' };

        const tarjeta = crearTarjeta(
          c.servicio || 'Cita',
          [
            'Cliente: ' + (c.clienteNombre || 'Sin nombre'),
            'Teléfono: ' + (c.telefono || 'Sin teléfono'),
            'Fecha: ' + formatearFecha(c.fechaHora)
          ],
          etiqueta
        );

        if (estado !== 'confirmada' && estado !== 'atendida') {
          tarjeta.appendChild(crearBoton('Confirmar', 'btn-accion', async () => {
            const res = await fetch('/reservas/' + c.id, {
              method: 'PUT',
              headers: cabeceras(),
              body: JSON.stringify({ estado: 'confirmada' })
            });
            if (avisarSiRechazo(res, 'No se pudo confirmar la cita')) cargarDatosBarbero();
          }));
        }

        tarjeta.appendChild(crearBoton('Cancelar cita', 'btn-accion', async () => {
          if (!confirm('¿Cancelar esta cita?')) return;
          const res = await fetch('/reservas/' + c.id + '/cancelar', { method: 'POST' });
          if (avisarSiRechazo(res, 'No se pudo cancelar')) {
            actualizarHorasDisponibles();
            actualizarHorasManuales();
            cargarTablaHorasOcupadas();
            cargarDatosBarbero();
          }
        }));

        tarjeta.appendChild(crearBoton('Borrar', 'btn-accion btn-eliminar', async () => {
          if (!confirm('¿Borrar esta cita definitivamente?')) return;
          const res = await fetch('/reservas/' + c.id, { method: 'DELETE', headers: cabeceras() });
          if (avisarSiRechazo(res, 'No se pudo borrar')) {
            actualizarHorasDisponibles();
            actualizarHorasManuales();
            cargarTablaHorasOcupadas();
            cargarDatosBarbero();
          }
        }));

        contPedidas.appendChild(tarjeta);
      });
    }

    contCanceladas.textContent = '';
    if (canceladas.length === 0) {
      contCanceladas.textContent = 'No hay citas canceladas';
    } else {
      canceladas.forEach((c) => {
        const tarjeta = crearTarjeta(
          c.servicio || 'Cita cancelada',
          [
            'Cliente: ' + (c.clienteNombre || 'Sin nombre'),
            'Teléfono: ' + (c.telefono || 'Sin teléfono'),
            'Fecha: ' + formatearFecha(c.fechaHora)
          ],
          { texto: 'Cancelada', clase: 'cancelada' }
        );

        tarjeta.appendChild(crearBoton('Borrar', 'btn-accion btn-eliminar', async () => {
          if (!confirm('¿Borrar esta cita cancelada?')) return;
          const res = await fetch('/reservas/' + c.id, { method: 'DELETE', headers: cabeceras() });
          if (avisarSiRechazo(res, 'No se pudo borrar')) cargarCitasBarbero();
        }));

        contCanceladas.appendChild(tarjeta);
      });
    }
  } catch (error) {
    contPedidas.textContent = 'No se pudieron cargar las citas';
    contCanceladas.textContent = 'No se pudieron cargar las citas canceladas';
  }
}

async function cargarClientesBarbero() {
  if (!esBarbero()) return;
  const cont = document.getElementById('clientes');
  try {
    const clientesLocales = await pedir('/clientes-locales', true);
    cont.textContent = '';
    if (clientesLocales.length === 0) {
      cont.textContent = 'Todavía no hay clientes registrados';
      return;
    }

    clientesLocales.forEach((c) => {
      const tarjeta = crearTarjeta(
        c.nombre || 'Cliente',
        [c.telefono ? 'Teléfono: ' + c.telefono : 'Sin teléfono'],
        { texto: 'Registrado', clase: 'atendida' }
      );

      tarjeta.appendChild(crearBoton('Editar', 'btn-accion', async () => {
        const nuevoNombre = prompt('Nuevo nombre:', c.nombre);
        const nuevoTelefono = prompt('Nuevo teléfono:', c.telefono);
        if (nuevoNombre && c.id) {
          const res = await fetch('/clientes-locales/' + c.id, {
            method: 'PUT',
            headers: cabeceras(),
            body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono })
          });
          if (avisarSiRechazo(res, 'No se pudo actualizar el cliente')) cargarClientesBarbero();
        }
      }));

      tarjeta.appendChild(crearBoton('Borrar', 'btn-accion btn-eliminar', async () => {
        if (confirm('¿Seguro que deseas eliminar este cliente?')) {
          const res = await fetch('/clientes-locales/' + c.id, { method: 'DELETE', headers: cabeceras() });
          if (avisarSiRechazo(res, 'No se pudo eliminar el cliente')) cargarClientesBarbero();
        }
      }));

      cont.appendChild(tarjeta);
    });
  } catch (error) {
    cont.textContent = 'No se pudieron cargar los clientes';
  }
}

async function cargarAuditoriaBarbero() {
  if (!esBarbero()) return;
  const cont = document.getElementById('auditoria');
  if (!cont) return;

  try {
    const registros = await pedir('/auditoria', true);
    cont.textContent = '';
    if (!Array.isArray(registros) || registros.length === 0) {
      cont.textContent = 'Todavía no hay movimientos en auditoría';
      return;
    }

    registros.forEach((r) => {
      const esCancelacion = String(r.servicio || '').toUpperCase().includes('CANCELO');
      const tarjeta = crearTarjeta(
        r.servicio || 'Movimiento',
        [
          'Cliente: ' + (r.nombre || 'Sin nombre'),
          'Contacto / Usuario: ' + (r.usuario || '—'),
          'Rol: ' + (r.rol || 'cliente'),
          'Hora del registro: ' + formatearFecha(r.hora)
        ],
        esCancelacion
          ? { texto: 'Canceló', clase: 'cancelada' }
          : { texto: 'Registro', clase: 'atendida' }
      );
      cont.appendChild(tarjeta);
    });
  } catch (error) {
    cont.textContent = 'No se pudo cargar la auditoría';
  }
}

async function borrarTodo() {
  if (!confirm('¿Seguro que quieres borrar TODOS los datos de la base de datos? No se puede deshacer.')) return;
  const res = await fetch('/datos', { method: 'DELETE', headers: cabeceras() });
  if (avisarSiRechazo(res, 'No se pudieron borrar los datos')) {
    sessionStorage.removeItem(STORAGE_ULTIMA_CITA);
    renderizarUltimaCitaCliente();
    cargarServicios();
    actualizarHorasDisponibles();
    actualizarHorasManuales();
    cargarTablaHorasOcupadas();
    cargarDatosBarbero();
  }
}

function cargarDatosBarbero() {
  if (!esBarbero()) return;
  cargarCitasBarbero();
  cargarClientesBarbero();
  cargarAuditoriaBarbero();
}

function cargarTodo() {
  cargarServicios();
  renderizarUltimaCitaCliente();
  actualizarHorasDisponibles();
  actualizarHorasManuales();
  cargarTablaHorasOcupadas();
  if (esBarbero()) {
    cambiarVistaBarbero(vistaBarberoActiva);
    cargarDatosBarbero();
  }
}

mostrarModo();
cargarTodo();