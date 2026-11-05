// Usuario público de mi Cal.com (es la parte de mi enlace: cal.com/ESTE-USUARIO/corte)
const USUARIO_CAL = 'jose-mestra-9j6nkc';

// Función asíncrona genérica para pedir datos a cualquier ruta del servidor
async function pedir(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error('El servidor respondió con error');
  return respuesta.json();
}

// Función para crear dinámicamente un elemento de tarjeta HTML con sus datos
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
    a.target = '_blank';
    a.rel = 'noopener';
    tarjeta.appendChild(a);
  }
  return tarjeta;
}

// Función para formatear fechas de texto a un formato legible en hora de Colombia
function formatearFecha(texto) {
  const fecha = new Date(texto);
  if (isNaN(fecha)) return 'Fecha no disponible';
  return fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
}

// =========================================================================
// SECCIÓN 1: CLIENTES (API externa + SQLite local + Botones Editar/Borrar)
// =========================================================================
async function cargarClientes() {
  const cont = document.getElementById('clientes');
  try {
    const [clientesApi, clientesLocales] = await Promise.all([
      pedir('/clientes').catch(() => []),
      pedir('/clientes-locales').catch(() => [])
    ]);

    const totalClientes = [...clientesApi, ...clientesLocales];
    document.getElementById('fuente-clientes').textContent =
      'Fuente: API externa + Base de datos SQLite · ' + totalClientes.length + ' registros recibidos';
    
    cont.textContent = '';
    if (totalClientes.length === 0) { 
      cont.textContent = 'Todavía no hay clientes registrados'; 
      return; 
    }

    clientesApi.forEach((c) => {
      cont.appendChild(crearTarjeta(c.name, [c.phone, c.email]));
    });

    clientesLocales.forEach((c) => {
      const nombre = c.nombre || 'Cliente Local';
      const telefono = c.telefono ? 'Teléfono: ' + c.telefono : 'Sin teléfono';
      const idCliente = c.id || c.codigo || c.idCliente;
      
      const tarjeta = crearTarjeta(nombre, [telefono], { texto: 'BD Local', clase: 'atendida' });

      const btnEditar = document.createElement('button');
      btnEditar.textContent = '✏️ Editar';
      btnEditar.className = 'btn-accion';
      btnEditar.onclick = async () => {
        const nuevoNombre = prompt('Nuevo nombre:', c.nombre);
        const nuevoTelefono = prompt('Nuevo teléfono:', c.telefono);
        if (nuevoNombre && idCliente) {
          await fetch('/clientes-locales/' + idCliente, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono })
          });
          cargarClientes();
        }
      };

      const btnBorrar = document.createElement('button');
      btnBorrar.textContent = '🗑️ Borrar';
      btnBorrar.className = 'btn-accion btn-eliminar';
      btnBorrar.onclick = async () => {
        if (confirm('¿Seguro que deseas eliminar este cliente?') && idCliente) {
          await fetch('/clientes-locales/' + idCliente, { method: 'DELETE' });
          cargarClientes();
        }
      };

      tarjeta.appendChild(btnEditar);
      tarjeta.appendChild(btnBorrar);
      cont.appendChild(tarjeta);
    });

  } catch (error) {
    cont.textContent = 'No se pudieron cargar los clientes';
  }
}

async function agregarCliente(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombreCliente').value;
  const telefono = document.getElementById('telefonoCliente').value;

  const res = await fetch('/clientes-locales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, telefono })
  });

  if (res.ok) {
    document.getElementById('form-cliente').reset();
    cargarClientes();
  } else {
    alert('Error al guardar el cliente');
  }
}

// =========================================================================
// SECCIÓN 2: SERVICIOS (Cal.com + SQLite local + ID Robusto + Botones Admin)
// =========================================================================
async function cargarServicios() {
  const cont = document.getElementById('servicios');
  const selectCita = document.getElementById('servicioCita');
  
  if (selectCita) {
    selectCita.innerHTML = '<option value="">Seleccione un servicio...</option>';
  }

  try {
    const [serviciosCal, serviciosLocales] = await Promise.all([
      pedir('/servicios').catch(() => []),
      pedir('/servicios-locales').catch(() => [])
    ]);

    const totalServicios = [...serviciosCal, ...serviciosLocales];
    document.getElementById('fuente-servicios').textContent =
      'Fuente: API Cal.com + Base de datos SQLite · ' + totalServicios.length + ' registros recibidos';
    
    cont.textContent = '';
    if (totalServicios.length === 0) { 
      cont.textContent = 'Todavía no hay servicios creados'; 
      return; 
    }

    // 1. Pinta servicios de Cal.com
    serviciosCal.filter((s) => !s.hidden).forEach((s) => {
      const nombre = s.title || s.name || 'Servicio';
      const minutos = s.lengthInMinutes || s.length;
      const lineas = [];
      if (s.description) lineas.push(s.description);
      if (minutos) lineas.push('Duración: ' + minutos + ' minutos');
      const url = s.bookingUrl || ('https://cal.com/' + USUARIO_CAL + '/' + encodeURIComponent(s.slug));
      cont.appendChild(crearTarjeta(nombre, lineas, null, { texto: 'Pedir cita', url: url }));

      if (selectCita) {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;
        selectCita.appendChild(option);
      }
    });

    // 2. Pinta servicios locales
    serviciosLocales.forEach((s) => {
      const nombre = s.nombre || 'Servicio Local';
      // Detecta cualquier propiedad posible para el ID en la BD
      const idServicio = s.id || s.codigo || s.idServicio || s.servicioId;
      
      let precioTexto = '';
      if (s.precio !== undefined && s.precio !== null) {
        const precioFormateado = Number(s.precio).toLocaleString('es-CO');
        precioTexto = 'Precio: $' + precioFormateado;
      }
      
      const lineas = [];
      if (precioTexto) lineas.push(precioTexto);

      const urlLocal = 'https://cal.com/' + USUARIO_CAL;
      const tarjeta = crearTarjeta(
        nombre, 
        lineas, 
        { texto: 'BD Local', clase: 'atendida' }, 
        { texto: 'Pedir cita', url: urlLocal }
      );

      // Botón Editar servicio local
      const btnEditar = document.createElement('button');
      btnEditar.textContent = '✏️ Editar';
      btnEditar.className = 'btn-accion';
      btnEditar.onclick = async () => {
        const nuevoNombre = prompt('Nuevo nombre del servicio:', s.nombre);
        const nuevoPrecioStr = prompt('Nuevo precio ($):', s.precio);
        
        if (nuevoNombre !== null && idServicio) {
          let nuevoPrecio = Number(nuevoPrecioStr);
          if (nuevoPrecio < 1000) nuevoPrecio = nuevoPrecio * 1000;

          const respuestaPut = await fetch('/servicios-locales/' + idServicio, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              nombre: nuevoNombre, 
              precio: isNaN(nuevoPrecio) ? 0 : nuevoPrecio, 
              activo: true 
            })
          });

          if (respuestaPut.ok) {
            cargarServicios();
          } else {
            alert('No se pudo actualizar el servicio');
          }
        } else {
          alert('Error: No se encontró el ID del servicio');
        }
      };

      // Botón Borrar servicio local
      const btnBorrar = document.createElement('button');
      btnBorrar.textContent = '🗑️ Borrar';
      btnBorrar.className = 'btn-accion btn-eliminar';
      btnBorrar.onclick = async () => {
        if (confirm('¿Seguro que deseas eliminar este servicio local?') && idServicio) {
          const resBorrar = await fetch('/servicios-locales/' + idServicio, { 
            method: 'DELETE' 
          });

          if (resBorrar.ok) {
            cargarServicios();
          } else {
            alert('No se pudo eliminar el servicio en el servidor');
          }
        } else {
          alert('Error: No se encontró el ID del servicio');
        }
      };

      tarjeta.appendChild(btnEditar);
      tarjeta.appendChild(btnBorrar);
      cont.appendChild(tarjeta);

      if (selectCita) {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre + (s.precio !== undefined ? ' ($' + Number(s.precio).toLocaleString('es-CO') + ')' : '');
        selectCita.appendChild(option);
      }
    });

  } catch (error) {
    cont.textContent = 'No se pudieron cargar los servicios';
  }
}

async function agregarServicio(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombreServicio').value;
  let precioInput = parseFloat(document.getElementById('precioServicio').value);

  if (precioInput < 1000) {
    precioInput = precioInput * 1000;
  }

  const res = await fetch('/servicios-locales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, precio: precioInput, activo: true })
  });

  if (res.ok) {
    document.getElementById('form-servicio').reset();
    cargarServicios();
  } else {
    alert('Error al guardar el servicio');
  }
}

// =========================================================================
// SECCIÓN 3: CITAS (Cal.com + SQLite local + Menú desplegable + Botón Borrar)
// =========================================================================
async function cargarCitas() {
  const cont = document.getElementById('citas');
  try {
    const [citasCal, citasLocales] = await Promise.all([
      pedir('/citas').catch(() => []),
      pedir('/reservas').catch(() => [])
    ]);

    const totalCitas = [...citasCal, ...citasLocales];
    document.getElementById('fuente-citas').textContent =
      'Fuente: API Cal.com + Base de datos SQLite · ' + totalCitas.length + ' registros recibidos';
    
    cont.textContent = '';
    if (totalCitas.length === 0) { 
      cont.textContent = 'Todavía no hay citas apartadas'; 
      return; 
    }

    citasCal.forEach((c) => {
      const cliente = c.attendees && c.attendees[0] ? c.attendees[0].name : 'Cliente sin nombre';
      let etiqueta = { texto: 'Pendiente (Cal.com)', clase: 'pendiente' };
      if (c.status === 'accepted') etiqueta = { texto: 'Confirmada (Cal.com)', clase: 'atendida' };
      if (c.status === 'cancelled') etiqueta = { texto: 'Cancelada', clase: 'cancelada' };
      
      cont.appendChild(crearTarjeta(
        c.title || 'Cita de Cal.com', 
        ['Fecha: ' + formatearFecha(c.start), 'Cliente: ' + cliente], 
        etiqueta
      ));
    });

    citasLocales.forEach((c) => {
      const servicio = c.servicio || 'Cita Local';
      const idReserva = c.id || c.codigo || c.idReserva;
      const lineas = [
        'Cliente: ' + (c.clienteNombre || 'Sin nombre'),
        'Teléfono: ' + (c.telefono || 'Sin teléfono'),
        'Fecha: ' + formatearFecha(c.fechaHora)
      ];
      
      const tarjeta = crearTarjeta(servicio, lineas, { texto: 'Guardada en BD (Local)', clase: 'atendida' });

      const btnBorrar = document.createElement('button');
      btnBorrar.textContent = '🗑️ Borrar';
      btnBorrar.className = 'btn-accion btn-eliminar';
      btnBorrar.onclick = async () => {
        if (confirm('¿Seguro que deseas eliminar esta cita?') && idReserva) {
          await fetch('/reservas/' + idReserva, { method: 'DELETE' });
          cargarCitas();
        }
      };

      tarjeta.appendChild(btnBorrar);
      cont.appendChild(tarjeta);
    });

  } catch (error) {
    cont.textContent = 'No se pudieron cargar las citas';
  }
}

async function agregarCita(e) {
  e.preventDefault();
  const clienteNombre = document.getElementById('clienteCita').value;
  const telefono = document.getElementById('telCita').value;
  const servicio = document.getElementById('servicioCita').value;
  const fechaHora = document.getElementById('fechaCita').value;

  const res = await fetch('/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clienteNombre, telefono, servicio, fechaHora })
  });

  if (res.ok) {
    document.getElementById('form-cita').reset();
    cargarCitas();
  } else {
    alert('Error al guardar la cita');
  }
}

// Ejecución automática al cargar la página
cargarClientes();
cargarServicios();
cargarCitas();