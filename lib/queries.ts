import { getDb } from './db';
import type { ParseResult } from './parser';
import type {
  OverviewData,
  OverviewFilters,
  PedidoAnalysis,
  PedidoDetail,
  PedidoLineaRow,
  PedidoSummary,
  RankingItem,
} from './types';

const TOP_N = 10;

interface PedidoRow {
  id: number;
  nombre: string;
  fecha: string;
  archivo_original: string;
  importado_en: string;
  total_lineas: number;
  total_unidades: number;
  total_errores: number;
}

function toPedidoSummary(row: PedidoRow): PedidoSummary {
  return {
    id: row.id,
    nombre: row.nombre,
    fecha: row.fecha,
    archivoOriginal: row.archivo_original,
    importadoEn: row.importado_en,
    totalLineas: row.total_lineas,
    totalUnidades: row.total_unidades,
    totalErrores: row.total_errores,
  };
}

export async function findPedidoByNombreFecha(nombre: string, fecha: string): Promise<PedidoSummary | null> {
  const db = await getDb();
  const { rows } = await db.query<PedidoRow>('SELECT * FROM pedidos WHERE nombre = $1 AND fecha = $2', [
    nombre,
    fecha,
  ]);
  return rows[0] ? toPedidoSummary(rows[0]) : null;
}

export interface InsertPedidoInput {
  nombre: string;
  fecha: string;
  archivoOriginal: string;
  parseResult: ParseResult;
}

export interface InsertPedidoResult {
  id: number;
  reemplazado: boolean;
}

export async function upsertPedido({
  nombre,
  fecha,
  archivoOriginal,
  parseResult,
}: InsertPedidoInput): Promise<InsertPedidoResult> {
  const pool = await getDb();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query<{ id: number }>('SELECT id FROM pedidos WHERE nombre = $1 AND fecha = $2', [
      nombre,
      fecha,
    ]);

    let pedidoId: number;
    let reemplazado = false;

    if (existing.rows[0]) {
      pedidoId = existing.rows[0].id;
      reemplazado = true;
      await client.query('DELETE FROM pedido_lineas WHERE pedido_id = $1', [pedidoId]);
      await client.query(
        `UPDATE pedidos
         SET archivo_original = $1,
             importado_en = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'),
             total_lineas = $2,
             total_unidades = $3,
             total_errores = $4
         WHERE id = $5`,
        [archivoOriginal, parseResult.totalLineas, parseResult.totalUnidades, parseResult.errores.length, pedidoId]
      );
    } else {
      const info = await client.query<{ id: number }>(
        `INSERT INTO pedidos (nombre, fecha, archivo_original, total_lineas, total_unidades, total_errores)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [nombre, fecha, archivoOriginal, parseResult.totalLineas, parseResult.totalUnidades, parseResult.errores.length]
      );
      pedidoId = info.rows[0].id;
    }

    for (const linea of parseResult.lineas) {
      await client.query(
        `INSERT INTO pedido_lineas
          (pedido_id, linea_numero, codigo_interno, codigo_barras, nombre_comercial, laboratorio, producto, unidades)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          pedidoId,
          linea.lineNumber,
          linea.codigoInterno,
          linea.codigoBarras,
          linea.nombreComercial,
          linea.laboratorio,
          linea.producto,
          linea.unidades,
        ]
      );
    }

    await client.query('COMMIT');
    return { id: pedidoId, reemplazado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listPedidos(): Promise<PedidoSummary[]> {
  const db = await getDb();
  const { rows } = await db.query<PedidoRow>('SELECT * FROM pedidos ORDER BY fecha DESC, importado_en DESC');
  return rows.map(toPedidoSummary);
}

export async function deletePedido(id: number): Promise<boolean> {
  const db = await getDb();
  const { rowCount } = await db.query('DELETE FROM pedidos WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getPedidoDetail(id: number): Promise<PedidoDetail | null> {
  const db = await getDb();
  const pedidoResult = await db.query<PedidoRow>('SELECT * FROM pedidos WHERE id = $1', [id]);
  const pedidoRow = pedidoResult.rows[0];
  if (!pedidoRow) return null;

  const lineaResult = await db.query<{
    id: number;
    linea_numero: number;
    codigo_interno: string;
    codigo_barras: string;
    nombre_comercial: string;
    laboratorio: string;
    producto: string;
    unidades: number;
  }>(
    `SELECT id, linea_numero, codigo_interno, codigo_barras, nombre_comercial, laboratorio, producto, unidades
     FROM pedido_lineas WHERE pedido_id = $1 ORDER BY linea_numero ASC`,
    [id]
  );

  const lineas: PedidoLineaRow[] = lineaResult.rows.map((r) => ({
    id: r.id,
    lineaNumero: r.linea_numero,
    codigoInterno: r.codigo_interno,
    codigoBarras: r.codigo_barras,
    nombreComercial: r.nombre_comercial,
    laboratorio: r.laboratorio,
    producto: r.producto,
    unidades: r.unidades,
  }));

  return { ...toPedidoSummary(pedidoRow), lineas };
}

/**
 * Construye las condiciones WHERE compartidas por los agregados filtrables:
 * rango de fechas y pedido concreto sobre `pedidos` (alias p), y búsqueda de
 * producto sobre `pedido_lineas` (alias pl).
 */
function buildFilterConditions(filters: OverviewFilters): { conditions: string[]; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.fechaDesde) {
    params.push(filters.fechaDesde);
    conditions.push(`p.fecha >= $${params.length}`);
  }
  if (filters.fechaHasta) {
    params.push(filters.fechaHasta);
    conditions.push(`p.fecha <= $${params.length}`);
  }
  if (filters.pedidoId) {
    params.push(filters.pedidoId);
    conditions.push(`p.id = $${params.length}`);
  }
  if (filters.producto) {
    params.push(`%${filters.producto}%`);
    conditions.push(`pl.nombre_comercial ILIKE $${params.length}`);
  }
  if (filters.laboratorio) {
    params.push(filters.laboratorio);
    conditions.push(`pl.laboratorio = $${params.length}`);
  }

  return { conditions, params };
}

async function ranking(
  db: Awaited<ReturnType<typeof getDb>>,
  column: 'nombre_comercial' | 'laboratorio',
  filters: OverviewFilters = {}
): Promise<RankingItem[]> {
  const { conditions, params } = buildFilterConditions(filters);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query<{ clave: string; unidades: string; lineas: string }>(
    `SELECT pl.${column} AS clave, SUM(pl.unidades) AS unidades, COUNT(*) AS lineas
     FROM pedido_lineas pl
     JOIN pedidos p ON p.id = pl.pedido_id
     ${where}
     GROUP BY pl.${column}
     ORDER BY SUM(pl.unidades) DESC
     LIMIT ${TOP_N}`,
    params
  );
  return rows.map((r) => ({
    clave: r.clave || '(sin dato)',
    unidades: Number(r.unidades),
    lineas: Number(r.lineas),
  }));
}

export async function getPedidoAnalysis(id: number): Promise<PedidoAnalysis | null> {
  const db = await getDb();
  const pedidoResult = await db.query<PedidoRow>('SELECT * FROM pedidos WHERE id = $1', [id]);
  const pedidoRow = pedidoResult.rows[0];
  if (!pedidoRow) return null;

  const [topProductos, topLaboratorios, conteo] = await Promise.all([
    ranking(db, 'nombre_comercial', { pedidoId: id }),
    ranking(db, 'laboratorio', { pedidoId: id }),
    db.query<{ productosUnicos: string; laboratoriosUnicos: string }>(
      `SELECT COUNT(DISTINCT nombre_comercial) AS "productosUnicos", COUNT(DISTINCT laboratorio) AS "laboratoriosUnicos"
       FROM pedido_lineas WHERE pedido_id = $1`,
      [id]
    ),
  ]);

  const productosUnicos = Number(conteo.rows[0].productosUnicos);
  const laboratoriosUnicos = Number(conteo.rows[0].laboratoriosUnicos);

  const pedido = toPedidoSummary(pedidoRow);
  const unidadesPromedioPorLinea = pedido.totalLineas > 0 ? pedido.totalUnidades / pedido.totalLineas : 0;

  return {
    pedido,
    topProductos,
    topLaboratorios,
    productosUnicos,
    laboratoriosUnicos,
    unidadesPromedioPorLinea,
  };
}

export async function listLaboratorios(): Promise<string[]> {
  const db = await getDb();
  const { rows } = await db.query<{ laboratorio: string }>(
    `SELECT DISTINCT laboratorio FROM pedido_lineas WHERE laboratorio <> '' ORDER BY laboratorio ASC`
  );
  return rows.map((r) => r.laboratorio);
}

export async function getOverview(filters: OverviewFilters = {}): Promise<OverviewData> {
  const db = await getDb();

  const pedidos = await listPedidos();
  const { conditions, params } = buildFilterConditions(filters);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalesResult = await db.query<{
    totalPedidos: string;
    totalUnidades: string;
    productosUnicos: string;
    laboratoriosUnicos: string;
  }>(
    `SELECT
      COUNT(DISTINCT pl.pedido_id) AS "totalPedidos",
      COALESCE(SUM(pl.unidades), 0) AS "totalUnidades",
      COUNT(DISTINCT pl.nombre_comercial) AS "productosUnicos",
      COUNT(DISTINCT pl.laboratorio) AS "laboratoriosUnicos"
    FROM pedido_lineas pl
    JOIN pedidos p ON p.id = pl.pedido_id
    ${where}`,
    params
  );
  const totales = totalesResult.rows[0];

  // buildFilterConditions siempre añade las condiciones sobre `p` (fecha/pedido) antes que
  // las condiciones sobre `pl` (producto/laboratorio), así que ambos grupos son un prefijo y
  // un sufijo contiguos de `conditions`/`params` con su numeración $n original intacta.
  const condicionesPedido = conditions.filter((c) => c.startsWith('p.'));
  const evolucionWhere = condicionesPedido.length ? `WHERE ${condicionesPedido.join(' AND ')}` : '';
  // Los filtros sobre pl (producto/laboratorio) se aplican en el JOIN, no en el WHERE,
  // para que un pedido sin líneas que casen siga apareciendo con 0 en el gráfico.
  const joinExtra = conditions.slice(condicionesPedido.length).join(' AND ');

  const evolucionResult = await db.query<{
    pedido_id: number;
    nombre: string;
    fecha: string;
    unidades: string;
    lineas: string;
  }>(
    `SELECT p.id AS pedido_id, p.nombre, p.fecha,
       COALESCE(SUM(pl.unidades), 0) AS unidades, COUNT(pl.id) AS lineas
     FROM pedidos p
     LEFT JOIN pedido_lineas pl ON pl.pedido_id = p.id ${joinExtra ? `AND ${joinExtra}` : ''}
     ${evolucionWhere}
     GROUP BY p.id, p.nombre, p.fecha
     ORDER BY p.fecha ASC, p.importado_en ASC`,
    params
  );

  const evolucion = evolucionResult.rows.map((r) => ({
    fecha: r.fecha,
    nombre: r.nombre,
    pedidoId: r.pedido_id,
    unidades: Number(r.unidades),
    lineas: Number(r.lineas),
  }));

  const [topProductosHistorico, topLaboratoriosHistorico] = await Promise.all([
    ranking(db, 'nombre_comercial', filters),
    ranking(db, 'laboratorio', filters),
  ]);

  return {
    totalPedidos: Number(totales.totalPedidos),
    totalUnidadesHistorico: Number(totales.totalUnidades),
    productosUnicosHistorico: Number(totales.productosUnicos),
    laboratoriosUnicosHistorico: Number(totales.laboratoriosUnicos),
    ultimoPedido: pedidos[0] ?? null,
    evolucion,
    topProductosHistorico,
    topLaboratoriosHistorico,
  };
}
