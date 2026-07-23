'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatFecha } from '@/lib/format';
import type { PedidoSummary } from '@/lib/types';

interface DashboardFiltersProps {
  pedidos: PedidoSummary[];
  laboratorios: string[];
}

export function DashboardFilters({ pedidos, laboratorios }: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [fechaDesde, setFechaDesde] = useState(searchParams.get('fechaDesde') ?? '');
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('fechaHasta') ?? '');
  const [pedidoId, setPedidoId] = useState(searchParams.get('pedidoId') ?? '');
  const [producto, setProducto] = useState(searchParams.get('producto') ?? '');
  const [laboratorio, setLaboratorio] = useState(searchParams.get('laboratorio') ?? '');

  const hayFiltrosActivos =
    searchParams.has('fechaDesde') ||
    searchParams.has('fechaHasta') ||
    searchParams.has('pedidoId') ||
    searchParams.has('producto') ||
    searchParams.has('laboratorio');

  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    if (pedidoId) params.set('pedidoId', pedidoId);
    if (producto.trim()) params.set('producto', producto.trim());
    if (laboratorio) params.set('laboratorio', laboratorio);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function limpiar() {
    setFechaDesde('');
    setFechaHasta('');
    setPedidoId('');
    setProducto('');
    setLaboratorio('');
    router.push(pathname);
  }

  return (
    <form onSubmit={aplicar} className="card space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Pedido</label>
          <select value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} className="input">
            <option value="">Todos los pedidos</option>
            {pedidos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {formatFecha(p.fecha)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Laboratorio</label>
          <select value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} className="input">
            <option value="">Todos los laboratorios</option>
            {laboratorios.map((lab) => (
              <option key={lab} value={lab}>
                {lab}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Medicamento</label>
          <input
            type="text"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            placeholder="Ej. IBUPIRAC"
            className="input"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">
          Aplicar filtros
        </button>
        {hayFiltrosActivos ? (
          <button type="button" onClick={limpiar} className="btn-secondary">
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </form>
  );
}
