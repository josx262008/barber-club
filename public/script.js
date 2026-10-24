// Función que le pide datos a mi API y devuelve el JSON
// async porque pedir datos por internet tarda y hay que esperar
async function pedir(ruta) {
  // fetch hace la petición a mi servidor (por ejemplo /clientes)
  const respuesta = await fetch(ruta);
  // Si el servidor respondió con error (como el 500), lanzo un error para atraparlo después
  if (!respuesta.ok) throw new Error('El servidor respondió con error');
  // Convierto la respuesta en datos que JavaScript pueda usar
  return respuesta.json();
}

// Función que arma una tarjeta con título, líneas de texto y una etiqueta opcional
function crearTarjeta(titulo, lineas, etiqueta) {
  // Creo el cuadro de la tarjeta
  const tarjeta = document.createElement('article');
  // Le pongo la clase "tarjeta" para que tome el diseño del CSS
  tarjeta.className = 'tarjeta';

  // Creo el título de la tarjeta
  const h3 = document.createElement('h3');
  // textContent pone el texto como texto simple (más seguro que innerHTML)
  h3.textContent = titulo;
  // Meto el título dentro de la tarjeta
  tarjeta.appendChild(h3);

  // Por cada línea de texto que me pasen, creo un párrafo
  lineas.forEach((texto) => {
    const p = document.createElement('p');
    p.textContent = texto;
    tarjeta.appendChild(p);
  });

  // Si me pasaron una etiqueta (Atendida o Pendiente), la agrego
  if (etiqueta) {
    const span = document.createElement('span');
    // Clase base "etiqueta" más la clase de color (atendida o pendiente)
    span.className = 'etiqueta ' + etiqueta.clase;
    span.textContent = etiqueta.texto;
    tarjeta.appendChild(span);
  }

  // Devuelvo la tarjeta terminada
  return tarjeta;
}

// Función principal: carga los clientes y las citas y los muestra en la página
async function cargar() {
  // Busco en la página los dos espacios donde van las tarjetas
  const contClientes = document.getElementById('clientes');
  const contCitas = document.getElementById('citas');
  // Guardo aquí los clientes para después buscar el nombre de cada cita
  let clientes = [];

  // Primer intento: traer los clientes
  try {
    // Pido los clientes a mi API
    clientes = await pedir('/clientes');
    // Borro el texto "Cargando clientes..."
    contClientes.textContent = '';
    // Por cada cliente creo una tarjeta con su nombre, teléfono y correo
    clientes.forEach((cliente) => {
      contClientes.appendChild(crearTarjeta(cliente.name, [cliente.phone, cliente.email]));
    });
  } catch (error) {
    // Si algo falla, muestro un mensaje claro en vez de dejar la página vacía
    contClientes.textContent = 'No se pudieron cargar los clientes';
  }

  // Segundo intento: traer las citas
  try {
    // Pido las citas a mi API
    const citas = await pedir('/citas');
    // Borro el texto "Cargando citas..."
    contCitas.textContent = '';
    // Por cada cita creo una tarjeta
    citas.forEach((cita) => {
      // Busco el cliente dueño de la cita comparando userId con el id del cliente
      const cliente = clientes.find((c) => c.id === cita.userId);
      // Si lo encuentro uso su nombre, si no, un texto por defecto
      const nombre = cliente ? cliente.name : 'Cliente sin nombre';
      // En los datos de prueba, completed = true significa que la cita ya se atendió
      const etiqueta = cita.completed
        ? { texto: 'Atendida', clase: 'atendida' }
        : { texto: 'Pendiente', clase: 'pendiente' };
      // Agrego la tarjeta: título de la cita, el nombre del cliente y su estado
      contCitas.appendChild(crearTarjeta('Cita #' + cita.id, [cita.title, 'Cliente: ' + nombre], etiqueta));
    });
  } catch (error) {
    // Mensaje claro si falla
    contCitas.textContent = 'No se pudieron cargar las citas';
  }
}

// Ejecuto la función apenas se abre la página
cargar();