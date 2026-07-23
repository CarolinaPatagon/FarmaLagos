import { notFound } from 'next/navigation';
import { DeletePedidoButton } from '@/components/DeletePedidoButton';
import { PedidoLineasTable } from '@/components/PedidoLineasTable';
import { RankingBarChart } from '@/components/RankingBarChart';
import { StatCard } from '@/components/StatCard';
import { formatDateTime, formatFecha, formatNumber } from '@/lib/format';
import { getPedidoAnalysis, getPedidoDetail } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const [pedido, analysis] = await Promise.all([getPedidoDetail(id), getPedidoAnalysis(id)]);
  if (!pedido || !analysis) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-700">Pedido histórico</p>
          <h1 className="text-2xl font-bold">
            {pedido.nombre} · {formatFecha(pedido.fecha)}
          </h1>
          <p className="text-sm text-slate-500">
            Fichero original: {pedido.archivoOriginal} · Importado el {formatDateTime(pedido.importadoEn)}
          </p>
          {pedido.totalErrores > 0 ? (
            <p className="mt-1 text-sm text-amber-600">
              {formatNumber(pedido.totalErrores)} línea(s) del fichero original no se pudieron interpretar.
            </p>
          ) : null}
        </div>
        <DeletePedidoButton id={pedido.id} nombre={pedido.nombre} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Líneas del pedido" value={formatNumber(pedido.totalLineas)} />
        <StatCard label="Unidades pedidas" value={formatNumber(pedido.totalUnidades)} />
        <StatCard label="Productos distintos" value={formatNumber(analysis.productosUnicos)} />
        <StatCard label="Laboratorios distintos" value={formatNumber(analysis.laboratoriosUnicos)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Top 10 productos del pedido</h2>
          <RankingBarChart data={analysis.topProductos} />
        </div>
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Top 10 laboratorios del pedido</h2>
          <RankingBarChart data={analysis.topLaboratorios} color="#146143" />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Detalle de líneas</h2>
        <PedidoLineasTable lineas={pedido.lineas} />
      </div>
    </div>
  );
}
