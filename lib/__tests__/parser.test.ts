import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodePedidoBuffer, parsePedidoTxt } from '../parser';

describe('parsePedidoTxt', () => {
  it('parses a single well-formed line', () => {
    const line =
      '02397500000044126218054083025667ABBV REFRESH TEARS 0.5% GTS 15 ML  00000000000000000002000000000000000';
    const result = parsePedidoTxt(line);

    expect(result.errores).toHaveLength(0);
    expect(result.lineas).toHaveLength(1);

    const [linea] = result.lineas;
    expect(linea.codigoInterno).toBe('0239750000004412621');
    expect(linea.codigoBarras).toBe('8054083025667');
    expect(linea.nombreComercial).toBe('ABBV REFRESH TEARS 0.5% GTS 15 ML');
    expect(linea.laboratorio).toBe('ABBV');
    expect(linea.producto).toBe('REFRESH TEARS 0.5% GTS 15 ML');
    expect(linea.unidades).toBe(2);
  });

  it('skips blank lines without producing errors', () => {
    const content = [
      '02397500000044126218054083025667ABBV REFRESH TEARS 0.5% GTS 15 ML  00000000000000000002000000000000000',
      '',
      '   ',
    ].join('\r\n');

    const result = parsePedidoTxt(content);
    expect(result.totalLineas).toBe(1);
    expect(result.errores).toHaveLength(0);
  });

  it('flags lines that are too short to contain the unidades field', () => {
    const result = parsePedidoTxt('demasiado corta');
    expect(result.lineas).toHaveLength(0);
    expect(result.errores).toHaveLength(1);
    expect(result.errores[0].motivo).toMatch(/demasiado corta/i);
  });

  it('flags lines with a non-numeric unidades field', () => {
    const line =
      '02397500000044126218054083025667ABBV REFRESH TEARS 0.5% GTS 15 ML  ABCDEDCBAABCDEDCBAAB000000000000000';
    const result = parsePedidoTxt(line);
    expect(result.lineas).toHaveLength(0);
    expect(result.errores).toHaveLength(1);
    expect(result.errores[0].motivo).toMatch(/no numéricas/i);
  });

  it('parses the full real-world sample file end-to-end', () => {
    const buffer = readFileSync(join(__dirname, 'pedido-sample.txt'));
    const content = decodePedidoBuffer(buffer);
    const result = parsePedidoTxt(content);

    // El fichero de ejemplo tiene 263 líneas con datos y una línea final en blanco.
    expect(result.totalLineas).toBe(263);
    expect(result.errores).toHaveLength(0);
    expect(result.totalUnidades).toBeGreaterThan(0);

    const first = result.lineas[0];
    expect(first.codigoBarras).toBe('8054083025667');
    expect(first.laboratorio).toBe('ABBV');

    const withNumero = result.lineas.find((l) => l.codigoBarras === '7791824117595');
    expect(withNumero?.laboratorio).toBe('ASFA');
    expect(withNumero?.unidades).toBe(1);

    // Nombres con caracteres especiales decodificados correctamente desde ISO-8859-1.
    const bano = result.lineas.find((l) => l.producto.includes('BAÑO'));
    expect(bano).toBeDefined();
  });

  it('parses a single well-formed "formato B" line (con separadores)', () => {
    const line = 'TOBREX GTS OFT  5 ML           ALCO 000001 02876161 7795306435054';
    const result = parsePedidoTxt(line);

    expect(result.errores).toHaveLength(0);
    expect(result.lineas).toHaveLength(1);

    const [linea] = result.lineas;
    expect(linea.codigoInterno).toBe('02876161');
    expect(linea.codigoBarras).toBe('7795306435054');
    expect(linea.laboratorio).toBe('ALCO');
    expect(linea.producto).toBe('TOBREX GTS OFT  5 ML');
    expect(linea.nombreComercial).toBe('ALCO TOBREX GTS OFT  5 ML');
    expect(linea.unidades).toBe(1);
  });

  it('parses a full real-world "formato B" sample file end-to-end', () => {
    const buffer = readFileSync(join(__dirname, 'pedido-formato-b-sample.txt'));
    const content = decodePedidoBuffer(buffer);
    const result = parsePedidoTxt(content);

    expect(result.totalLineas).toBe(95);
    expect(result.errores).toHaveLength(0);
    expect(result.totalUnidades).toBeGreaterThan(0);

    const first = result.lineas[0];
    expect(first.laboratorio).toBe('ALCO');
    expect(first.codigoBarras).toBe('7792086750490');

    // Caracter especial CP437 (0xA5) decodificado igual que en el formato A.
    const conCaracterEspecial = result.lineas.find((l) => l.codigoBarras === '7792183002386');
    expect(conCaracterEspecial?.producto).toContain('Ñ');
  });
});
