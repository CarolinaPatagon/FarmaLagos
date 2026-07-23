import Link from 'next/link';
import { EvolutionChart, EvolutionLegendLinks } from '@/components/EvolutionChart';
import { RankingBarChart } from '@/components/RankingBarChart';
import { StatCard } from '@/components/StatCard';
import { formatFecha, formatNumber } from '@/lib/format';
import { getOverview } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const overview = await getOverview();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de pedidos</h1>
          <p className="text-sm text-slate-500">Visión global de todos los pedidos de medicamentos importados.</p>
        </div>
        <Link href="/importar" className="btn-primary">
          Importar nuevo pedido
        </Link>
      </div>

      {overview.totalPedidos === 0 ? (
        <div className="card text-center">
          <p className="text-slate-600">
            Todavía no se ha importado ningún pedido. Empieza importando tu primer fichero de pedido.
          </p>
          <Link href="/importar" className="btn-primary mt-4 inline-flex">
            Importar pedido
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pedidos importados" value={formatNumber(overview.totalPedidos)} />
            <StatCard label="Unidades históricas" value={formatNumber(overview.totalUnidadesHistorico)} />
            <StatCard label="Productos distintos" value={formatNumber(overview.productosUnicosHistorico)} />
            <StatCard label="Laboratorios distintos" value={formatNumber(overview.laboratoriosUnicosHistorico)} />
          </div>

          {overview.ultimoPedido ? (
            <div className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Último pedido importado</p>
                <p className="text-lg font-semibold">
                  {overview.ultimoPedido.nombre} · {formatFecha(overview.ultimoPedido.fecha)}
                </p>
                <p className="text-sm text-slate-500">
                  {formatNumber(overview.ultimoPedido.totalLineas)} líneas · {formatNumber(overview.ultimoPedido.totalUnidades)}{' '}
                  unidades
                </p>
              </div>
              <Link href={`/pedidos/${overview.ultimoPedido.id}`} className="btn-secondary">
                Ver análisis
              </Link>
            </div>
          ) : null}

          <div className="card">
            <h2 className="mb-1 text-lg font-semibold">Evolución de unidades pedidas</h2>
            <p className="mb-4 text-sm text-slate-500">Total de unidades por pedido, ordenado por fecha.</p>
            <EvolutionChart data={overview.evolucion} />
            <EvolutionLegendLinks data={overview.evolucion} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Top 10 productos (histórico)</h2>
              <RankingBarChart data={overview.topProductosHistorico} />
            </div>
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Top 10 laboratorios (histórico)</h2>
              <RankingBarChart data={overview.topLaboratoriosHistorico} color="#146143" />
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/pedidos" className="btn-secondary">
              Ver todos los pedidos históricos →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
