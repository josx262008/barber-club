import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';
const CLAVE_BARBERO = __ENV.CLAVE_BARBERO || 'barbero';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // 1. CREATE (POST)
  const crearRes = http.post(
    `${BASE_URL}/clientes-locales`,
    JSON.stringify({ nombre: 'Cliente k6 Nuevo', telefono: '3001234567' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(crearRes, {
    '1. CREATE responde 201': (r) => r.status === 201,
  });

  const dataCreada = crearRes.json();
  const id = dataCreada?.id ?? dataCreada?.data?.id;

  // 2. READ (GET)
  const leerRes = http.get(`${BASE_URL}/clientes-locales`);
  check(leerRes, {
    '2. READ responde 200': (r) => r.status === 200,
  });

  if (id) {
    const headersAuth = {
      'Content-Type': 'application/json',
      'x-clave-barbero': CLAVE_BARBERO,
    };

    // 3. UPDATE (PUT)
    const actualizarRes = http.put(
      `${BASE_URL}/clientes-locales/${id}`,
      JSON.stringify({ nombre: 'Cliente k6 Editado', telefono: '3007654321' }),
      { headers: headersAuth }
    );

    check(actualizarRes, {
      '3. UPDATE responde 200': (r) => r.status === 200,
    });

    // 4. DELETE (DELETE)
    const borrarRes = http.del(`${BASE_URL}/clientes-locales/${id}`, null, {
      headers: headersAuth,
    });

    console.log('DELETE status:', borrarRes.status, 'body:', borrarRes.body);

    check(borrarRes, {
      '4. DELETE responde 200 o 204': (r) => r.status === 200 || r.status === 204,
    });
  }

  sleep(1);
}