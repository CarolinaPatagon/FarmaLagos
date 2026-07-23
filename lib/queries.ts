import { getDb } from './db';
import type { ParseResult } from './parser';
import type {
  OverviewData,
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

export function findPedidoByNombreFecha(nombre: string, fecha: string): PedidoSummary | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM pedidos WHERE nombre = ? AND fecha = ?')
    .get(nombre, fecha) as PedidoRow | undefined;
  return row ? toPedidoSummary(row) : null;
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

export function upsertPedido({ nombre, fecha, archivoOriginal, parseResult }: InsertPedidoInput): InsertPedidoResult {
  const db = getDb();

  const run = db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM pedidos WHERE nombre = ? AND fecha = ?')
      .get(nombre, fecha) as { id: number } | undefined;

    let pedidoId: number;
    let reemplazado = false;

    if (existing) {
      pedidoId = existing.id;
      reemplazado = true;
      db.prepare('DELETE FROM pedido_lineas WHERE pedido_id = ?').run(pedidoId);
      db.prepare(
        `UPDATE pedidos
         SET archivo_original = ?, importado_en = datetime('now'), total_lineas = ?, total_unidades = ?, total_errores = ?
         WHERE id = ?`
      ).run(archivoOriginal, parseResult.totalLineas, parseResult.totalUnidades, parseResult.errores.length, pedidoId);
    } else {
      const info = db
        .prepare(
          `INSERT INTO pedidos (nombre, fecha, archivo_original, total_lineas, total_unidades, total_errores)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(nombre, fecha, archivoOriginal, parseResult.totalLineas, parseResult.totalUnidades, parseResult.errores.length);
      pedidoId = Number(info.lastInsertRowid);
    }

    const insertLinea = db.prepare(
      `INSERT INTO pedido_lineas
        (pedido_id, linea_numero, codigo_interno, codigo_barras, nombre_comercial, laboratorio, producto, unidades)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const linea of parseResult.lineas) {
      insertLinea.run(
        pedidoId,
        linea.lineNumber,
        linea.codigoInterno,
        linea.codigoBarras,
        linea.nombreComercial,
        linea.laboratorio,
        linea.producto,
        linea.unidades
      );
    }

    return { id: pedidoId, reemplazado };
  });

  return run();
}

export function listPedidos(): PedidoSummary[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM pedidos ORDER BY fecha DESC, importado_en DESC').all() as PedidoRow[];
  return rows.map(toPedidoSummary);
}

export function deletePedido(id: number): boolean {
  const db = getDb();
  const info = db.prepare('DELETE FROM pedidos WHERE id = ?').run(id);
  return info.changes > 0;
}

export function getPedidoDetail(id: number): PedidoDetail | null {
  const db = getDb();
  const pedidoRow = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id) as PedidoRow | undefined;
  if (!pedidoRow) return null;

  const lineaRows = db
    .prepare(
      `SELECT id, linea_numero, codigo_interno, codigo_barras, nombre_comercial, laboratorio, producto, unidades
       FROM pedido_lineas WHERE pedido_id = ? ORDER BY linea_numero ASC`
    )
    .all(id) as Array<{
    id: number;
    linea_numero: number;
    codigo_interno: string;
    codigo_barras: string;
    nombre_comercial: string;
    laboratorio: string;
    producto: string;
    unidades: number;
  }>;

  const lineas: PedidoLineaRow[] = lineaRows.map((r) => ({
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

function ranking(db: ReturnType<typeof getDb>, column: 'nombre_comercial' | 'laboratorio', pedidoId?: number): RankingItem[] {
  const where = pedidoId ? 'WHERE pedido_id = ?' : '';
  const rows = db
    .prepare(
      `SELECT ${column} AS clave, SUM(unidades) AS unidades, COUNT(*) AS lineas
       FROM pedido_lineas
       ${where}
       GROUP BY ${column}
       ORDER BY unidades DESC
       LIMIT ${TOP_N}`
    )
    .all(...(pedidoId ? [pedidoId] : [])) as Array<{ clave: string; unidades: number; lineas: number }>;
  return rows.map((r) => ({ clave: r.clave || '(sin dato)', unidades: r.unidades, lineas: r.lineas }));
}

export function getPedidoAnalysis(id: number): PedidoAnalysis | null {
  const db = getDb();
  const pedidoRow = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id) as PedidoRow | undefined;
  if (!pedidoRow) return null;

  const topProductos = ranking(db, 'nombre_comercial', id);
  const topLaboratorios = ranking(db, 'laboratorio', id);

  const { productosUnicos, laboratoriosUnicos } = db
    .prepare(
      `SELECT COUNT(DISTINCT nombre_comercial) AS productosUnicos, COUNT(DISTINCT laboratorio) AS laboratoriosUnicos
       FROM pedido_lineas WHERE pedido_id = ?`
    )
    .get(id) as { productosUnicos: number; laboratoriosUnicos: number };

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

export function getOverview(): OverviewData {
  const db = getDb();

  const pedidos = listPedidos();

  const totales = db
    .prepare(
      `SELECT
        COUNT(DISTINCT pedido_id) AS totalPedidos,
        COALESCE(SUM(unidades), 0) AS totalUnidades,
        COUNT(DISTINCT nombre_comercial) AS productosUnicos,
        COUNT(DISTINCT laboratorio) AS laboratoriosUnicos
      FROM pedido_lineas`
    )
    .get() as {
    totalPedidos: number;
    totalUnidades: number;
    productosUnicos: number;
    laboratoriosUnicos: number;
  };

  const evolucion = [...pedidos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.importadoEn.localeCompare(b.importadoEn))
    .map((p) => ({ fecha: p.fecha, nombre: p.nombre, pedidoId: p.id, unidades: p.totalUnidades, lineas: p.totalLineas }));

  const topProductosHistorico = ranking(db, 'nombre_comercial');
  const topLaboratoriosHistorico = ranking(db, 'laboratorio');

  return {
    totalPedidos: totales.totalPedidos,
    totalUnidadesHistorico: totales.totalUnidades,
    productosUnicosHistorico: totales.productosUnicos,
    laboratoriosUnicosHistorico: totales.laboratoriosUnicos,
    ultimoPedido: pedidos[0] ?? null,
    evolucion,
    topProductosHistorico,
    topLaboratoriosHistorico,
  };
}
