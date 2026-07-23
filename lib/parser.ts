/**
 * Parser para los ficheros de pedidos de medicamentos.
 *
 * Se han observado dos formatos de origen distintos, ambos de ancho fijo y
 * ambos en la página de códigos CP437 (ver `decodePedidoBuffer`). El parser
 * detecta automáticamente cuál es, línea a línea.
 *
 * Formato A — sin separadores, 102 caracteres por línea:
 *   [0, 19)   código interno del artículo
 *   [19, 32)  código de barras (EAN-13)
 *   [32, 67)  nombre comercial (los primeros 4 caracteres son el código de laboratorio)
 *   [67, 87)  unidades pedidas (numérico, ceros a la izquierda)
 *   [87, 102) campo reservado / sin uso conocido
 *
 * Formato B — con espacios como separadores, 65 caracteres por línea:
 *   [0, 30)   nombre comercial
 *   [31, 35)  código de laboratorio
 *   [36, 42)  unidades pedidas (numérico, ceros a la izquierda)
 *   [43, 51)  código interno del artículo
 *   [52, 65)  código de barras (EAN-13)
 */

const FIELD_A_CODIGO_INTERNO: [number, number] = [0, 19];
const FIELD_A_CODIGO_BARRAS: [number, number] = [19, 32];
const FIELD_A_NOMBRE_COMERCIAL: [number, number] = [32, 67];
const FIELD_A_UNIDADES: [number, number] = [67, 87];
const MIN_LINE_LENGTH_A = FIELD_A_UNIDADES[1]; // 87: lo mínimo para poder leer hasta unidades

const FIELD_B_NOMBRE_COMERCIAL: [number, number] = [0, 30];
const FIELD_B_LABORATORIO: [number, number] = [31, 35];
const FIELD_B_UNIDADES: [number, number] = [36, 42];
const FIELD_B_CODIGO_INTERNO: [number, number] = [43, 51];
const FIELD_B_CODIGO_BARRAS: [number, number] = [52, 65];
const MIN_LINE_LENGTH_B = FIELD_B_CODIGO_BARRAS[1]; // 65

function esFormatoA(line: string): boolean {
  return line.length >= MIN_LINE_LENGTH_A && /^[0-9]{19}/.test(line);
}

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

function parseLineaFormatoA(line: string, lineNumber: number): PedidoLineaParsed | PedidoLineaError {
  const codigoInterno = slice(line, FIELD_A_CODIGO_INTERNO).trim();
  const codigoBarras = slice(line, FIELD_A_CODIGO_BARRAS).trim();
  const nombreComercialRaw = slice(line, FIELD_A_NOMBRE_COMERCIAL);
  const nombreComercial = nombreComercialRaw.trim();
  const unidadesRaw = slice(line, FIELD_A_UNIDADES).trim();
  const unidades = Number.parseInt(unidadesRaw, 10);

  if (!codigoBarras) return { lineNumber, raw: line, motivo: 'Código de barras vacío' };
  if (!nombreComercial) return { lineNumber, raw: line, motivo: 'Nombre comercial vacío' };
  if (Number.isNaN(unidades)) {
    return { lineNumber, raw: line, motivo: `Unidades no numéricas ("${unidadesRaw}")` };
  }

  const laboratorio = nombreComercialRaw.slice(0, 4).trim();
  const producto = nombreComercialRaw.slice(4).trim() || nombreComercial;

  return { lineNumber, codigoInterno, codigoBarras, nombreComercial, laboratorio, producto, unidades, raw: line };
}

function parseLineaFormatoB(line: string, lineNumber: number): PedidoLineaParsed | PedidoLineaError {
  const producto = slice(line, FIELD_B_NOMBRE_COMERCIAL).trim();
  const laboratorio = slice(line, FIELD_B_LABORATORIO).trim();
  const unidadesRaw = slice(line, FIELD_B_UNIDADES).trim();
  const codigoInterno = slice(line, FIELD_B_CODIGO_INTERNO).trim();
  const codigoBarras = slice(line, FIELD_B_CODIGO_BARRAS).trim();
  const unidades = Number.parseInt(unidadesRaw, 10);

  if (!codigoBarras) return { lineNumber, raw: line, motivo: 'Código de barras vacío' };
  if (!producto) return { lineNumber, raw: line, motivo: 'Nombre comercial vacío' };
  if (Number.isNaN(unidades)) {
    return { lineNumber, raw: line, motivo: `Unidades no numéricas ("${unidadesRaw}")` };
  }

  const nombreComercial = laboratorio ? `${laboratorio} ${producto}` : producto;

  return { lineNumber, codigoInterno, codigoBarras, nombreComercial, laboratorio, producto, unidades, raw: line };
}

function esError(resultado: PedidoLineaParsed | PedidoLineaError): resultado is PedidoLineaError {
  return 'motivo' in resultado;
}

export function parsePedidoTxt(content: string): ParseResult {
  const rawLines = content.split(/\r\n|\n|\r/);
  const lineas: PedidoLineaParsed[] = [];
  const errores: PedidoLineaError[] = [];

  rawLines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    if (line.trim().length === 0) return;

    let resultado: PedidoLineaParsed | PedidoLineaError;
    if (esFormatoA(line)) {
      resultado = parseLineaFormatoA(line, lineNumber);
    } else if (line.length >= MIN_LINE_LENGTH_B) {
      resultado = parseLineaFormatoB(line, lineNumber);
    } else {
      resultado = {
        lineNumber,
        raw: line,
        motivo: `Línea demasiado corta (${line.length} caracteres, se esperaban al menos ${MIN_LINE_LENGTH_B})`,
      };
    }

    if (esError(resultado)) {
      errores.push(resultado);
    } else {
      lineas.push(resultado);
    }
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
