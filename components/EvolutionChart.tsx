'use client';

import Link from 'next/link';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFecha } from '@/lib/format';

interface EvolutionPoint {
  fecha: string;
  nombre: string;
  pedidoId: number;
  unidades: number;
  lineas: number;
}

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Todavía no hay pedidos importados.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 8, right: 24, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(_label, payload) => {
            const point = payload?.[0]?.payload as EvolutionPoint | undefined;
            return point ? `${point.nombre} · ${formatFecha(point.fecha)}` : '';
          }}
          formatter={(value: number, key: string) => [
            value.toLocaleString('es-ES'),
            key === 'unidades' ? 'Unidades' : 'Líneas',
          ]}
        />
        <Line type="monotone" dataKey="unidades" stroke="#279867" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EvolutionLegendLinks({ data }: { data: EvolutionPoint[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {data.slice(-8).map((point) => (
        <Link
          key={point.pedidoId}
          href={`/pedidos/${point.pedidoId}`}
          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-brand-300 hover:text-brand-700"
        >
          {formatFecha(point.fecha)} · {point.nombre}
        </Link>
      ))}
    </div>
  );
}
