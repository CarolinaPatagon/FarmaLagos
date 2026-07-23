import { NextResponse } from 'next/server';
import { deletePedido, getPedidoDetail } from '@/lib/queries';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identificador de pedido inválido.' }, { status: 400 });
  }

  const pedido = getPedidoDetail(id);
  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ pedido });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identificador de pedido inválido.' }, { status: 400 });
  }

  const eliminado = deletePedido(id);
  if (!eliminado) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
