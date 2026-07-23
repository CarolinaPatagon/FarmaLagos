'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankingItem } from '@/lib/types';

interface RankingBarChartProps {
  data: RankingItem[];
  color?: string;
}

export function RankingBarChart({ data, color = '#279867' }: RankingBarChartProps) {
  const chartData = [...data].reverse();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sin datos suficientes todavía.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="clave"
          width={160}
          tick={{ fontSize: 12 }}
          tickFormatter={(value: string) => (value.length > 24 ? `${value.slice(0, 24)}…` : value)}
        />
        <Tooltip formatter={(value: number) => [value.toLocaleString('es-ES'), 'Unidades']} />
        <Bar dataKey="unidades" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
