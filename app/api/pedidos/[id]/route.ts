import { NextRequest, NextResponse } from 'next/server';
import { decodePedidoBuffer, parsePedidoTxt } from '@/lib/parser';
import { deletePedido, getPedidoDetail, replacePedidoArchivo, updatePedidoMetadata } from '@/lib/queries';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identificador de pedido inválido.' }, { status: 400 });
  }

  const pedido = await getPedidoDetail(id);
  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ pedido });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identificador de pedido inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const nombre = String(body?.nombre ?? '').trim();
  const fecha = String(body?.fecha ?? '').trim();

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre del pedido es obligatorio.' }, { status: 400 });
  }
  if (!FECHA_REGEX.test(fecha)) {
    return NextResponse.json({ error: 'La fecha debe tener el formato AAAA-MM-DD.' }, { status: 400 });
  }

  const resultado = await updatePedidoMetadata(id, { nombre, fecha });
  if (!resultado.ok) {
    const status = resultado.motivo === 'Pedido no encontrado.' ? 404 : 409;
    return NextResponse.json({ error: resultado.motivo }, { status });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identificador de pedido inválido.' }, { status: 400 });
  }

  const formData = await request.formData();
  const archivo = formData.get('archivo');
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: 'Debes adjuntar el fichero .txt del pedido.' }, { status: 400 });
  }

  const arrayBuffer = await archivo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const content = decodePedidoBuffer(buffer);
  const parseResult = parsePedidoTxt(content);

  if (parseResult.totalLineas === 0) {
    return NextResponse.json(
      {
        error: 'No se ha podido extraer ninguna línea válida del fichero. Revisa el formato.',
        errores: parseResult.errores.slice(0, 20),
      },
      { status: 422 }
    );
  }

  const reemplazado = await replacePedidoArchivo(id, { archivoOriginal: archivo.name, parseResult });
  if (!reemplazado) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    totalLineas: parseResult.totalLineas,
    totalUnidades: parseResult.totalUnidades,
    errores: parseResult.errores.slice(0, 20),
    totalErrores: parseResult.errores.length,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identificador de pedido inválido.' }, { status: 400 });
  }

  const eliminado = await deletePedido(id);
  if (!eliminado) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
