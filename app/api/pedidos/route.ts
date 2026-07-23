import { NextRequest, NextResponse } from 'next/server';
import { decodePedidoBuffer, parsePedidoTxt } from '@/lib/parser';
import { listPedidos, upsertPedido } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET() {
  const pedidos = await listPedidos();
  return NextResponse.json({ pedidos });
}

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const nombre = String(formData.get('nombre') ?? '').trim();
  const fecha = String(formData.get('fecha') ?? '').trim();
  const archivo = formData.get('archivo');

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre del pedido es obligatorio.' }, { status: 400 });
  }
  if (!FECHA_REGEX.test(fecha)) {
    return NextResponse.json({ error: 'La fecha debe tener el formato AAAA-MM-DD.' }, { status: 400 });
  }
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

  const { id, reemplazado } = await upsertPedido({
    nombre,
    fecha,
    archivoOriginal: archivo.name,
    parseResult,
  });

  return NextResponse.json({
    id,
    reemplazado,
    totalLineas: parseResult.totalLineas,
    totalUnidades: parseResult.totalUnidades,
    errores: parseResult.errores.slice(0, 20),
    totalErrores: parseResult.errores.length,
  });
}
