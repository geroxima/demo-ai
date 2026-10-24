import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const proveedores = sqliteTable('proveedores', {
  ruc: text('ruc').primaryKey(),
  razonSocial: text('razon_social').notNull(),
  nombreComercial: text('nombre_comercial'),
  contacto: text('contacto'),
  telefono: text('telefono'),
  email: text('email'),
  direccion: text('direccion'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const contratos = sqliteTable('contratos', {
  id: text('id').primaryKey(),
  proveedorRuc: text('proveedor_ruc').notNull().references(() => proveedores.ruc),
  ocid: text('ocid'),
  llamado: text('llamado'),
  convocante: text('convocante'),
  objeto: text('objeto'),
  fechaFirma: text('fecha_firma'),
  fechaEntregaPrevista: text('fecha_entrega_prevista'),
  fechaEntregaReal: text('fecha_entrega_real'),
  monto: real('monto'),
  moneda: text('moneda').default('PYG'),
  estado: text('estado'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const entregas = sqliteTable('entregas', {
  id: text('id').primaryKey(),
  contratoId: text('contrato_id').notNull().references(() => contratos.id),
  fechaEntrega: text('fecha_entrega').notNull(),
  cumplePlazo: integer('cumple_plazo', { mode: 'boolean' }),
  observacion: text('observacion'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const reclamos = sqliteTable('reclamos', {
  id: text('id').primaryKey(),
  contratoId: text('contrato_id').notNull().references(() => contratos.id),
  proveedorRuc: text('proveedor_ruc').notNull().references(() => proveedores.ruc),
  fecha: text('fecha').notNull(),
  tipo: text('tipo'),
  descripcion: text('descripcion').notNull(),
  resuelto: integer('resuelto', { mode: 'boolean' }).default(false),
  respuesta: text('respuesta'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const observaciones = sqliteTable('observaciones', {
  id: text('id').primaryKey(),
  contratoId: text('contrato_id').references(() => contratos.id),
  proveedorRuc: text('proveedor_ruc').notNull().references(() => proveedores.ruc),
  fecha: text('fecha').notNull(),
  autor: text('autor'),
  tipo: text('tipo'),
  texto: text('texto').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const evaluaciones = sqliteTable('evaluaciones', {
  id: text('id').primaryKey(),
  contratoId: text('contrato_id').notNull().references(() => contratos.id),
  proveedorRuc: text('proveedor_ruc').notNull().references(() => proveedores.ruc),
  unidadSolicitante: text('unidad_solicitante'),
  fecha: text('fecha').notNull(),
  calidad: integer('calidad'),
  cumplimientoPlazos: integer('cumplimiento_plazos'),
  gradoSatisfaccion: integer('grado_satisfaccion'),
  reincidencias: integer('reincidencias').default(0),
  notaFinal: real('nota_final'),
  comentarios: text('comentarios'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
