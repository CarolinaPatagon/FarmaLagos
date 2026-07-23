'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeletePedidoButton({ id, nombre }: { id: number; nombre: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmado = window.confirm(`¿Eliminar el pedido "${nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    setLoading(true);
    const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
    setLoading(false);

    if (res.ok) {
      router.push('/pedidos');
      router.refresh();
    } else {
      window.alert('No se ha podido eliminar el pedido.');
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-secondary text-red-600 hover:bg-red-50">
      {loading ? 'Eliminando…' : 'Eliminar pedido'}
    </button>
  );
}
