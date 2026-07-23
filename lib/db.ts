import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __farmalagosPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __farmalagosSchemaReady: Promise<void> | undefined;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    fecha TEXT NOT NULL,
    archivo_original TEXT NOT NULL,
    importado_en TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'),
    total_lineas INTEGER NOT NULL,
    total_unidades INTEGER NOT NULL,
    total_errores INTEGER NOT NULL DEFAULT 0,
    UNIQUE (nombre, fecha)
  );

  CREATE TABLE IF NOT EXISTS pedido_lineas (
    id SERIAL PRIMARY KEY,
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
`;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta la variable de entorno DATABASE_URL (cadena de conexión a Postgres).');
  }

  // Los proveedores gestionados (Supabase, Neon, Vercel Postgres...) exigen SSL y usan
  // certificados que Node no siempre valida por defecto; en local (Postgres propio) no hace falta.
  const esLocal = /localhost|127\.0\.0\.1/.test(connectionString);

  return new Pool({
    connectionString,
    ssl: esLocal ? undefined : { rejectUnauthorized: false },
  });
}

export async function getDb(): Promise<Pool> {
  if (!globalThis.__farmalagosPool) {
    globalThis.__farmalagosPool = createPool();
  }
  if (!globalThis.__farmalagosSchemaReady) {
    globalThis.__farmalagosSchemaReady = globalThis.__farmalagosPool.query(SCHEMA_SQL).then(() => undefined);
  }
  await globalThis.__farmalagosSchemaReady;
  return globalThis.__farmalagosPool;
}
