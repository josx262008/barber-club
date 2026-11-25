const { EntitySchema } = require('typeorm');

const Auditoria = new EntitySchema({
  name: 'Auditoria',
  tableName: 'auditoria',
  columns: {
    id: {
      type: 'integer',
      primary: true,
      generated: true,
    },
    accion: {
      type: 'varchar',
      nullable: false,
    },
    nombre: {
      type: 'varchar',
      nullable: true,
    },
    usuario: {
      type: 'varchar',
      nullable: true,
    },
    servicio: {
      type: 'varchar',
      nullable: true,
    },
    rol: {
      type: 'varchar',
      nullable: false,
      default: 'cliente',
    },
    fechaHora: {
      type: 'varchar',
      nullable: false,
    },
    detalle: {
      type: 'text',
      nullable: true,
    },
  },
});

module.exports = { Auditoria };