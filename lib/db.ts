import { Pool } from 'pg';
import { hashContenidoPedido } from './parser';

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
    contenido_hash TEXT,
    UNIQUE (nombre, fecha)
  );

  ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS contenido_hash TEXT;

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
  CREATE INDEX IF NOT EXISTS idx_pedidos_contenido_hash ON pedidos(contenido_hash);
`;

/**
 * Los pedidos importados antes de que existiera `contenido_hash` no lo
 * tienen calculado; se rellena una única vez a partir de sus líneas ya
 * guardadas, con la misma función de huella que se usa al importar.
 */
async function backfillContenidoHash(pool: Pool): Promise<void> {
  const { rows: pendientes } = await pool.query<{ id: number }>(
    'SELECT id FROM pedidos WHERE contenido_hash IS NULL'
  );

  for (const { id } of pendientes) {
    const { rows: lineas } = await pool.query<{ codigo_barras: string; unidades: number }>(
      'SELECT codigo_barras, unidades FROM pedido_lineas WHERE pedido_id = $1',
      [id]
    );
    const hash = hashContenidoPedido(lineas.map((l) => ({ codigoBarras: l.codigo_barras, unidades: l.unidades })));
    await pool.query('UPDATE pedidos SET contenido_hash = $1 WHERE id = $2', [hash, id]);
  }
}

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
    const pool = globalThis.__farmalagosPool;
    globalThis.__farmalagosSchemaReady = pool
      .query(SCHEMA_SQL)
      .then(() => backfillContenidoHash(pool));
  }
  await globalThis.__farmalagosSchemaReady;
  return globalThis.__farmalagosPool;
}
