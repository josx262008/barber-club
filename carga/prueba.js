import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';
const CLAVE_BARBERO = __ENV.CLAVE_BARBERO || 'barbero';

export const options = {
  vus: 5000,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const uniq = `${__VU}-${__ITER}-${Date.now()}`;

  // 1. CREATE
  const crearRes = http.post(
    `${BASE_URL}/clientes-locales`,
    JSON.stringify({
      nombre: `Carga k6 ${uniq}`,
      telefono: '3001234567',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const okCreate = check(crearRes, {
    '1. CREATE 201': (r) => r.status === 201,
  });

  if (!okCreate) {
    console.log(`CREATE falló con status ${crearRes.status}: ${crearRes.body}`);
  }

  let id = null;
  if (crearRes.status === 201) {
    const dataCreada = crearRes.json();
    id = dataCreada?.id ?? dataCreada?.data?.id;
  }

  // 2. READ
  const leerRes = http.get(`${BASE_URL}/clientes-locales`);
  check(leerRes, {
    '2. READ 200': (r) => r.status === 200,
  });

  // 3. UPDATE y 4. DELETE (limpiando el registro creado para no saturar la BD)
  if (id) {
    const headersAuth = {
      'Content-Type': 'application/json',
      'x-clave-barbero': CLAVE_BARBERO,
    };

    const actualizarRes = http.put(
      `${BASE_URL}/clientes-locales/${id}`,
      JSON.stringify({
        nombre: `Carga k6 Editado ${uniq}`,
        telefono: '3007654321',
      }),
      { headers: headersAuth }
    );

    check(actualizarRes, {
      '3. UPDATE 200': (r) => r.status === 200,
    });

    const borrarRes = http.del(`${BASE_URL}/clientes-locales/${id}`, null, {
      headers: headersAuth,
    });

    const okDelete = check(borrarRes, {
      '4. DELETE 200/204': (r) => r.status === 200 || r.status === 204,
    });

    if (!okDelete) {
      console.log(`DELETE falló con status ${borrarRes.status}: ${borrarRes.body}`);
    }
  }

  sleep(0.5);
}