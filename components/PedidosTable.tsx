'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDateTime, formatFecha, formatNumber } from '@/lib/format';
import type { PedidoSummary } from '@/lib/types';

export function PedidosTable({ pedidos }: { pedidos: PedidoSummary[] }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pedidos;
    return pedidos.filter((p) => p.nombre.toLowerCase().includes(q) || p.fecha.includes(q));
  }, [pedidos, busqueda]);

  return (
    <div className="space-y-4">
      <input
        className="input max-w-sm"
        placeholder="Buscar por nombre o fecha (AAAA-MM-DD)…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre / referencia</th>
              <th>Fecha del pedido</th>
              <th>Líneas</th>
              <th>Unidades</th>
              <th>Importado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-slate-800">{p.nombre}</td>
                <td>{formatFecha(p.fecha)}</td>
                <td>{formatNumber(p.totalLineas)}</td>
                <td>{formatNumber(p.totalUnidades)}</td>
                <td className="text-slate-400">{formatDateTime(p.importadoEn)}</td>
                <td>
                  <Link href={`/pedidos/${p.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                    Ver análisis →
                  </Link>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No se han encontrado pedidos con ese criterio.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
