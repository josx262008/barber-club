# Barber Club - API REST

Proyecto de una web para una barbería. En esta primera parte el backend consume una API pública y devuelve los datos en JSON.

## API elegida
JSONPlaceholder (https://jsonplaceholder.typicode.com)

## Por qué la elegí
Es gratuita, no necesita registro ni clave y casi nunca falla. La uso como fuente de datos de prueba: sus usuarios representan a los clientes de la barbería y sus tareas representan las citas. Más adelante estos datos pasarán a mi propia base de datos.

## Endpoints
- GET /clientes: devuelve la lista de clientes en JSON
- GET /citas: devuelve la lista de citas en JSON

## Cómo ejecutarlo
npm install
node src/app.js

## Cómo ejecutar las pruebas
npm test

## Inyección de dependencias
El controlador recibe el servicio desde afuera en lugar de crearlo adentro. Así en las pruebas le paso un servicio simulado sin llamar a la API real.