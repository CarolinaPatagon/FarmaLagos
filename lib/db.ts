import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? './data/farmalagos.db';

declare global {
  // eslint-disable-next-line no-var
  var __farmalagosDb: Database.Database | undefined;
}

function createDatabase(): Database.Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      fecha TEXT NOT NULL,
      archivo_original TEXT NOT NULL,
      importado_en TEXT NOT NULL DEFAULT (datetime('now')),
      total_lineas INTEGER NOT NULL,
      total_unidades INTEGER NOT NULL,
      total_errores INTEGER NOT NULL DEFAULT 0,
      UNIQUE(nombre, fecha)
    );

    CREATE TABLE IF NOT EXISTS pedido_lineas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      linea_numero INTEGER NOT NULL,
      codigo_interno TEXT,
      codigo_barras TEXT NOT NULL,
      nombre_comercial TEXT NOT NULL,
      laboratorio TEXT,
      producto TEXT,
      unidades INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pedido_lineas_pedido ON pedido_lineas(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_pedido_lineas_barcode ON pedido_lineas(codigo_barras);
    CREATE INDEX IF NOT EXISTS idx_pedido_lineas_laboratorio ON pedido_lineas(laboratorio);
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__farmalagosDb) {
    globalThis.__farmalagosDb = createDatabase();
  }
  return globalThis.__farmalagosDb;
}
