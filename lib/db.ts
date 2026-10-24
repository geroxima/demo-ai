import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS proveedores (
      ruc TEXT PRIMARY KEY,
      razon_social TEXT NOT NULL,
      nombre_comercial TEXT,
      contacto TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contratos (
      id TEXT PRIMARY KEY,
      proveedor_ruc TEXT NOT NULL REFERENCES proveedores(ruc),
      ocid TEXT,
      llamado TEXT,
      convocante TEXT,
      objeto TEXT,
      fecha_firma TEXT,
      fecha_entrega_prevista TEXT,
      fecha_entrega_real TEXT,
      monto REAL,
      moneda TEXT DEFAULT 'PYG',
      estado TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS entregas (
      id TEXT PRIMARY KEY,
      contrato_id TEXT NOT NULL REFERENCES contratos(id),
      fecha_entrega TEXT NOT NULL,
      cumple_plazo INTEGER,
      observacion TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reclamos (
      id TEXT PRIMARY KEY,
      contrato_id TEXT NOT NULL REFERENCES contratos(id),
      proveedor_ruc TEXT NOT NULL REFERENCES proveedores(ruc),
      fecha TEXT NOT NULL,
      tipo TEXT,
      descripcion TEXT NOT NULL,
      resuelto INTEGER DEFAULT 0,
      respuesta TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS observaciones (
      id TEXT PRIMARY KEY,
      contrato_id TEXT REFERENCES contratos(id),
      proveedor_ruc TEXT NOT NULL REFERENCES proveedores(ruc),
      fecha TEXT NOT NULL,
      autor TEXT,
      tipo TEXT,
      texto TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS evaluaciones (
      id TEXT PRIMARY KEY,
      contrato_id TEXT NOT NULL REFERENCES contratos(id),
      proveedor_ruc TEXT NOT NULL REFERENCES proveedores(ruc),
      unidad_solicitante TEXT,
      fecha TEXT NOT NULL,
      calidad INTEGER,
      cumplimiento_plazos INTEGER,
      grado_satisfaccion INTEGER,
      reincidencias INTEGER DEFAULT 0,
      nota_final REAL,
      comentarios TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

initDb();
