import { NextResponse } from 'next/server';
import { getPedidoAnalysis } from '@/lib/queries';

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

  const analysis = await getPedidoAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
