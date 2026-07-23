/**
 * Importa en bloque todos los ficheros de la carpeta data/historicos/.
 *
 * Convención de nombre de fichero: "<nombre-del-pedido>__<AAAA-MM-DD>.txt"
 * Ejemplo: "PEDIDO_FARMACIA_CENTRAL__2026-07-20.txt"
 *
 * Uso: npm run import:historicos
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { decodePedidoBuffer, parsePedidoTxt } from '../lib/parser';
import { upsertPedido } from '../lib/queries';

const HISTORICOS_DIR = join(process.cwd(), 'data', 'historicos');
const NOMBRE_FECHA_REGEX = /^(.+)__(\d{4}-\d{2}-\d{2})\.txt$/i;

function main() {
  let files: string[];
  try {
    files = readdirSync(HISTORICOS_DIR).filter((f) => f.toLowerCase().endsWith('.txt'));
  } catch {
    console.error(`No se encuentra la carpeta ${HISTORICOS_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`No hay ficheros .txt en ${HISTORICOS_DIR}`);
    return;
  }

  let importados = 0;
  let omitidos = 0;

  for (const file of files) {
    const match = file.match(NOMBRE_FECHA_REGEX);
    if (!match) {
      console.warn(
        `⚠️  Omitido "${file}": el nombre no sigue el formato "<nombre>__<AAAA-MM-DD>.txt". Renómbralo y vuelve a ejecutar.`
      );
      omitidos += 1;
      continue;
    }

    const [, nombre, fecha] = match;
    const buffer = readFileSync(join(HISTORICOS_DIR, file));
    const content = decodePedidoBuffer(buffer);
    const parseResult = parsePedidoTxt(content);

    if (parseResult.totalLineas === 0) {
      console.warn(`⚠️  Omitido "${file}": no se pudo extraer ninguna línea válida.`);
      omitidos += 1;
      continue;
    }

    const { id, reemplazado } = upsertPedido({
      nombre: nombre.replace(/_/g, ' ').trim(),
      fecha,
      archivoOriginal: file,
      parseResult,
    });

    console.log(
      `✅ ${reemplazado ? 'Reemplazado' : 'Importado'} "${file}" → pedido #${id} (${parseResult.totalLineas} líneas, ${
        parseResult.totalUnidades
      } unidades${parseResult.errores.length ? `, ${parseResult.errores.length} líneas con errores` : ''})`
    );
    importados += 1;
  }

  console.log(`\nResumen: ${importados} pedido(s) importado(s), ${omitidos} fichero(s) omitido(s).`);
}

main();
