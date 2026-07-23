'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { formatFecha } from '@/lib/format';

interface ImportResponse {
  id: number;
  reemplazado: boolean;
  totalLineas: number;
  totalUnidades: number;
  totalErrores: number;
  errores: { lineNumber: number; raw: string; motivo: string }[];
}

interface ImportError {
  error: string;
  errores?: { lineNumber: number; raw: string; motivo: string }[];
}

interface DuplicadoInfo {
  id: number;
  nombre: string;
  fecha: string;
}

function todayIso(): string {
  const now = new Date();
  const tz = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tz).toISOString().slice(0, 10);
}

export function ImportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [duplicado, setDuplicado] = useState<DuplicadoInfo | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && !nombre) {
      setNombre(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  async function enviar(forzar: boolean) {
    setResult(null);
    setError(null);
    setDuplicado(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError({ error: 'Selecciona el fichero .txt del pedido.' });
      return;
    }

    const formData = new FormData();
    formData.set('nombre', nombre);
    formData.set('fecha', fecha);
    formData.set('archivo', file);
    if (forzar) formData.set('forzar', '1');

    setLoading(true);
    try {
      const res = await fetch('/api/pedidos', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.status === 409 && data.duplicado) {
        setDuplicado(data.duplicado as DuplicadoInfo);
      } else if (!res.ok) {
        setError(data as ImportError);
      } else {
        setResult(data as ImportResponse);
      }
    } catch {
      setError({ error: 'Error de red al importar el pedido. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void enviar(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Fichero del pedido (.txt)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre / referencia del pedido</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. PEDIDO Farmacia Central"
              className="input"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha del pedido</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Importando…' : 'Importar pedido'}
        </button>
      </form>

      {duplicado ? (
        <div className="card border-amber-200 bg-amber-50">
          <p className="font-medium text-amber-800">Este fichero parece que ya se importó antes.</p>
          <p className="mt-1 text-sm text-amber-700">
            Mismo contenido que el pedido{' '}
            <Link href={`/pedidos/${duplicado.id}`} className="underline">
              {duplicado.nombre} · {formatFecha(duplicado.fecha)}
            </Link>
            .
          </p>
          <button onClick={() => enviar(true)} disabled={loading} className="btn-secondary mt-4">
            {loading ? 'Importando…' : 'Importar de todas formas'}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="card border-red-200 bg-red-50">
          <p className="font-medium text-red-700">{error.error}</p>
          {error.errores && error.errores.length > 0 ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-600">
              {error.errores.map((e, i) => (
                <li key={i}>
                  Línea {e.lineNumber}: {e.motivo}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="card border-brand-200 bg-brand-50">
          <p className="font-medium text-brand-800">
            {result.reemplazado ? 'Pedido reemplazado correctamente.' : 'Pedido importado correctamente.'}
          </p>
          <p className="mt-1 text-sm text-brand-700">
            {result.totalLineas} líneas · {result.totalUnidades} unidades
            {result.totalErrores > 0 ? ` · ${result.totalErrores} línea(s) con errores (omitidas)` : ''}
          </p>
          {result.errores.length > 0 ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-amber-700">
              {result.errores.map((e, i) => (
                <li key={i}>
                  Línea {e.lineNumber}: {e.motivo}
                </li>
              ))}
            </ul>
          ) : null}
          <Link href={`/pedidos/${result.id}`} className="btn-primary mt-4 inline-flex">
            Ver análisis del pedido
          </Link>
        </div>
      ) : null}
    </div>
  );
}
