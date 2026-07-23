import Link from 'next/link';
import { PedidosTable } from '@/components/PedidosTable';
import { listPedidos } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
  const pedidos = await listPedidos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos históricos</h1>
          <p className="text-sm text-slate-500">
            Selecciona un pedido para acceder a su análisis detallado.
          </p>
        </div>
        <Link href="/importar" className="btn-primary">
          Importar nuevo pedido
        </Link>
      </div>

      <PedidosTable pedidos={pedidos} />
    </div>
  );
}
