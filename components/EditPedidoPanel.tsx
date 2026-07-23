'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

interface EditPedidoPanelProps {
  id: number;
  nombreActual: string;
  fechaActual: string;
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

  async function reemplazarArchivo(e: React.FormEvent) {
    e.preventDefault();
    setErrorArchivo(null);
    setOkArchivo(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setErrorArchivo('Selecciona el fichero .txt corregido.');
      return;
    }

    const formData = new FormData();
    formData.set('archivo', file);

    setReemplazando(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErrorArchivo(data.error ?? 'No se ha podido reemplazar el fichero.');
        return;
      }
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
          <button type="submit" disabled={reemplazando} className="btn-secondary">
            {reemplazando ? 'Reemplazando…' : 'Reemplazar fichero'}
          </button>
        </form>
      </div>
    </div>
  );
}
