'use client';

import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';
import type { PedidoLineaRow } from '@/lib/types';

export function PedidoLineasTable({ lineas }: { lineas: PedidoLineaRow[] }) {
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return lineas;
    return lineas.filter(
      (l) =>
        l.codigoBarras.includes(q) ||
        l.nombreComercial.toLowerCase().includes(q) ||
        l.laboratorio.toLowerCase().includes(q)
    );
  }, [lineas, busqueda]);

  return (
    <div className="space-y-4">
      <input
        className="input max-w-sm"
        placeholder="Buscar por código de barras, producto o laboratorio…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="table-wrap max-h-[520px] overflow-y-auto">
        <table>
          <thead>
            <tr>
              <th>Código de barras</th>
              <th>Laboratorio</th>
              <th>Nombre comercial</th>
              <th className="text-right">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.id}>
                <td className="font-mono text-xs text-slate-500">{l.codigoBarras}</td>
                <td>{l.laboratorio}</td>
                <td>{l.producto}</td>
                <td className="text-right font-medium">{formatNumber(l.unidades)}</td>
              </tr>
            ))}
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No hay líneas que coincidan con la búsqueda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Mostrando {formatNumber(filtradas.length)} de {formatNumber(lineas.length)} líneas.
      </p>
    </div>
  );
}
