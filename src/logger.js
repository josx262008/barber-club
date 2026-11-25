// Importo winston, la librería que me deja escribir logs con niveles (info, error)
const winston = require('winston');
// Importo fs para poder crear la carpeta donde se guardan los logs
const fs = require('fs');

// Si la carpeta logs no existe, la creo
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

// Creo el logger con su configuración
const logger = winston.createLogger({
  // Nivel mínimo que se registra: info y todo lo más grave (como error)
  level: 'info',



    // Si arranco con LOG_SILENT=true (prueba de carga), el logger no escribe nada
  silent: process.env.LOG_SILENT === 'true',



  
  // Formato de cada línea: fecha, nivel en mayúscula y mensaje
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  // Dónde se escriben los logs: en la terminal y en el archivo logs/app.log
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// Función para registrar un error con su stacktrace completo (nivel ERROR)
logger.fallo = (mensaje, error) => {
  // Si el error trae stack lo uso; si no, lo convierto a texto
  const detalle = error && error.stack ? error.stack : String(error);
  // Escribo el mensaje y debajo el stacktrace
  logger.error(mensaje + '\n' + detalle);
};

// Exporto el logger para usarlo en otros archivos
module.exports = logger;