/**
 * Parser para los ficheros de pedidos de medicamentos.
 *
 * Formato de origen: ancho fijo, 102 caracteres por línea (sin separadores),
 * codificación ISO-8859-1 (Latin-1), líneas terminadas en CRLF.
 *
 * Layout por línea (offsets 0-indexados, half-open):
 *   [0, 19)   código interno del artículo
 *   [19, 32)  código de barras (EAN-13)
 *   [32, 67)  nombre comercial (los primeros 4 caracteres son el código de laboratorio)
 *   [67, 87)  unidades pedidas (numérico, ceros a la izquierda)
 *   [87, 102) campo reservado / sin uso conocido
 */

const FIELD_CODIGO_INTERNO: [number, number] = [0, 19];
const FIELD_CODIGO_BARRAS: [number, number] = [19, 32];
const FIELD_NOMBRE_COMERCIAL: [number, number] = [32, 67];
const FIELD_UNIDADES: [number, number] = [67, 87];
const MIN_LINE_LENGTH = FIELD_UNIDADES[1]; // 87: lo mínimo para poder leer hasta unidades

export interface PedidoLineaParsed {
  lineNumber: number;
  codigoInterno: string;
  codigoBarras: string;
  nombreComercial: string;
  laboratorio: string;
  producto: string;
  unidades: number;
  raw: string;
}

export interface PedidoLineaError {
  lineNumber: number;
  raw: string;
  motivo: string;
}

export interface ParseResult {
  lineas: PedidoLineaParsed[];
  errores: PedidoLineaError[];
  totalLineas: number;
  totalUnidades: number;
}

function slice(line: string, [start, end]: [number, number]): string {
  return line.slice(start, end);
}

export function parsePedidoTxt(content: string): ParseResult {
  const rawLines = content.split(/\r\n|\n|\r/);
  const lineas: PedidoLineaParsed[] = [];
  const errores: PedidoLineaError[] = [];

  rawLines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    if (line.trim().length === 0) return;

    if (line.length < MIN_LINE_LENGTH) {
      errores.push({
        lineNumber,
        raw: line,
        motivo: `Línea demasiado corta (${line.length} caracteres, se esperaban al menos ${MIN_LINE_LENGTH})`,
      });
      return;
    }

    const codigoInterno = slice(line, FIELD_CODIGO_INTERNO).trim();
    const codigoBarras = slice(line, FIELD_CODIGO_BARRAS).trim();
    const nombreComercialRaw = slice(line, FIELD_NOMBRE_COMERCIAL);
    const nombreComercial = nombreComercialRaw.trim();
    const unidadesRaw = slice(line, FIELD_UNIDADES).trim();
    const unidades = Number.parseInt(unidadesRaw, 10);

    if (!codigoBarras) {
      errores.push({ lineNumber, raw: line, motivo: 'Código de barras vacío' });
      return;
    }

    if (!nombreComercial) {
      errores.push({ lineNumber, raw: line, motivo: 'Nombre comercial vacío' });
      return;
    }

    if (Number.isNaN(unidades)) {
      errores.push({ lineNumber, raw: line, motivo: `Unidades no numéricas ("${unidadesRaw}")` });
      return;
    }

    const laboratorio = nombreComercialRaw.slice(0, 4).trim();
    const producto = nombreComercialRaw.slice(4).trim() || nombreComercial;

    lineas.push({
      lineNumber,
      codigoInterno,
      codigoBarras,
      nombreComercial,
      laboratorio,
      producto,
      unidades,
      raw: line,
    });
  });

  const totalUnidades = lineas.reduce((acc, l) => acc + l.unidades, 0);

  return {
    lineas,
    errores,
    totalLineas: lineas.length,
    totalUnidades,
  };
}

/**
 * Los ficheros de pedido provienen de un sistema DOS y usan la página de
 * códigos CP437 (OEM-US), no ISO-8859-1: por ejemplo, la "Ñ" se codifica
 * como 0xA5, no como 0xD1. Node no soporta 'cp437' de forma nativa en
 * Buffer#toString, así que se mapea a mano la mitad alta (0x80-0xFF); los
 * bytes 0x00-0x7F coinciden con ASCII en ambas codificaciones.
 */
const CP437_UPPER_HALF =
  'ÇüéâäàåçêëèïîìÄÅ' +
  'ÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
  'áíóúñÑªº¿⌐¬½¼¡«»' +
  '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧' +
  '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩' +
  '≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

export function decodePedidoBuffer(buffer: Buffer): string {
  let result = '';
  for (const byte of buffer) {
    result += byte < 0x80 ? String.fromCharCode(byte) : CP437_UPPER_HALF[byte - 0x80];
  }
  return result;
}
