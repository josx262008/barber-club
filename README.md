# Barber Club - API REST

Proyecto de una web para la barbería MVP Barber Club. En esta primera parte el backend consume APIs externas y devuelve los datos en JSON, y una página web sencilla los muestra.

## APIs elegidas
- Cal.com (https://cal.com): servicios y citas de la barbería. Requiere registro y clave.
- JSONPlaceholder (https://jsonplaceholder.typicode.com): clientes de prueba.

## Por qué las elegí
Cal.com es una API de agendamiento, y lo que más necesita una barbería es mostrar sus servicios y llevar las citas apartadas. Me registré para obtener una clave, que guardo en un archivo .env fuera del código y fuera del repositorio. JSONPlaceholder la uso como datos de prueba para los clientes, mientras construyo la base de datos real de la barbería.

## Endpoints
- GET /servicios: devuelve los servicios de la barbería (Cal.com) en JSON
- GET /citas: devuelve las citas apartadas (Cal.com) en JSON
- GET /clientes: devuelve la lista de clientes de prueba (JSONPlaceholder) en JSON

## Cómo ejecutarlo
1. Instalar las librerías: npm install
2. Crear un archivo .env en la raíz del proyecto con la clave de Cal.com: CAL_API_KEY=tu_clave
3. Encender el servidor: node src/app.js
4. Abrir la página en http://localhost:3000

## Cómo ejecutar las pruebas
npm test

## Inyección de dependencias
El controlador no crea su propio servicio: lo recibe como parámetro desde afuera. Lo hice así para que el controlador no quede pegado a la API real. Así, en las pruebas le paso un servicio simulado (mock) y pruebo sin conectarme a internet.