'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatFecha } from '@/lib/format';

interface EditPedidoPanelProps {
  id: number;
  nombreActual: string;
  fechaActual: string;
}

interface DuplicadoInfo {
  id: number;
  nombre: string;
  fecha: string;
}

export function EditPedidoPanel({ id, nombreActual, fechaActual }: EditPedidoPanelProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const [nombre, setNombre] = useState(nombreActual);
  const [fecha, setFecha] = useState(fechaActual);
  const [guardandoMetadata, setGuardandoMetadata] = useState(false);
  const [errorMetadata, setErrorMetadata] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reemplazando, setReemplazando] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [okArchivo, setOkArchivo] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<DuplicadoInfo | null>(null);

  async function guardarMetadata(e: React.FormEvent) {
    e.preventDefault();
    setErrorMetadata(null);
    setGuardandoMetadata(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, fecha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMetadata(data.error ?? 'No se ha podido guardar.');
        return;
      }
      router.refresh();
    } catch {
      setErrorMetadata('Error de red al guardar los cambios.');
    } finally {
      setGuardandoMetadata(false);
    }
  }

  async function reemplazarArchivo(e?: React.FormEvent, forzar = false) {
    e?.preventDefault();
    setErrorArchivo(null);
    setOkArchivo(null);
    if (!forzar) setDuplicado(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setErrorArchivo('Selecciona el fichero .txt corregido.');
      return;
    }

    const formData = new FormData();
    formData.set('archivo', file);
    if (forzar) formData.set('forzar', '1');

    setReemplazando(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (res.status === 409 && data.duplicado) {
        setDuplicado(data.duplicado as DuplicadoInfo);
        return;
      }
      if (!res.ok) {
        setErrorArchivo(data.error ?? 'No se ha podido reemplazar el fichero.');
        return;
      }
      setDuplicado(null);
      setOkArchivo(
        `Fichero reemplazado: ${data.totalLineas} líneas · ${data.totalUnidades} unidades${
          data.totalErrores > 0 ? ` · ${data.totalErrores} línea(s) con errores` : ''
        }`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch {
      setErrorArchivo('Error de red al reemplazar el fichero.');
    } finally {
      setReemplazando(false);
    }
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="btn-secondary">
        Editar pedido
      </button>
    );
  }

  return (
    <div className="card w-full max-w-md space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Editar pedido</h2>
        <button onClick={() => setAbierto(false)} className="text-sm text-slate-400 hover:text-slate-600">
          Cerrar
        </button>
      </div>

      <form onSubmit={guardarMetadata} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Nombre / referencia</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Fecha del pedido</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" required />
        </div>
        {errorMetadata ? <p className="text-sm text-red-600">{errorMetadata}</p> : null}
        <button type="submit" disabled={guardandoMetadata} className="btn-primary">
          {guardandoMetadata ? 'Guardando…' : 'Guardar nombre/fecha'}
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4">
        <form onSubmit={reemplazarArchivo} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Reemplazar fichero (por si no se guardó bien)
            </label>
            <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="input" />
          </div>
          {errorArchivo ? <p className="text-sm text-red-600">{errorArchivo}</p> : null}
          {okArchivo ? <p className="text-sm text-brand-700">{okArchivo}</p> : null}
          {duplicado ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Mismo contenido que el pedido{' '}
                <Link href={`/pedidos/${duplicado.id}`} className="underline">
                  {duplicado.nombre} · {formatFecha(duplicado.fecha)}
                </Link>
                .
              </p>
              <button
                type="button"
                onClick={() => reemplazarArchivo(undefined, true)}
                disabled={reemplazando}
                className="btn-secondary mt-2"
              >
                {reemplazando ? 'Reemplazando…' : 'Reemplazar de todas formas'}
              </button>
            </div>
          ) : null}
          <button type="submit" disabled={reemplazando} className="btn-secondary">
            {reemplazando ? 'Reemplazando…' : 'Reemplazar fichero'}
          </button>
        </form>
      </div>
    </div>
  );
}
