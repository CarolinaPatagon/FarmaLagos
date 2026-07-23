# FarmaLagos

Aplicación para importar y analizar pedidos de medicamentos.

Cada día se puede importar un fichero `.txt` con el detalle de un pedido (código de barras,
nombre comercial y unidades pedidas de cada medicamento). La aplicación guarda todos los
pedidos importados y ofrece un dashboard dinámico para analizarlos, tanto de forma agregada
(histórico completo) como accediendo al detalle de cada pedido concreto.

## Funcionalidades

- **Importar pedidos** (`/importar`): sube el fichero `.txt` diario, indica el nombre/referencia
  y la fecha del pedido. Si ya existe un pedido con ese mismo nombre y fecha, se reemplaza.
- **Pedidos históricos** (`/pedidos`): lista y busca todos los pedidos importados, para
  seleccionar cualquiera de ellos y acceder a su análisis.
- **Análisis por pedido** (`/pedidos/[id]`): estadísticas del pedido, top 10 productos y
  laboratorios por unidades pedidas, y el detalle completo de líneas (con buscador).
- **Dashboard global** (`/`): evolución de unidades pedidas a lo largo del tiempo, top 10
  productos y laboratorios de todo el histórico, y accesos rápidos a los pedidos recientes.
- **Importación masiva por CLI** (`npm run import:historicos`): importa de una vez todos los
  ficheros `.txt` que coloques en `data/historicos/` (ver `data/historicos/README.md`).

## Formato del fichero de pedido

Los ficheros de origen tienen un formato de **ancho fijo** (sin separadores), con líneas de
102 caracteres. Provienen de un sistema DOS y usan la página de códigos **CP437** (no
ISO-8859-1/UTF-8): por ejemplo, la "Ñ" se codifica como el byte `0xA5`. El parser decodifica
esto explícitamente (`lib/parser.ts`).

| Campo | Posición (offset) | Longitud | Descripción |
|---|---|---|---|
| Código interno | 0 | 19 | Código de artículo del proveedor |
| Código de barras | 19 | 13 | EAN-13 |
| Nombre comercial | 32 | 35 | Los primeros 4 caracteres son el código del laboratorio |
| Unidades pedidas | 67 | 20 | Numérico, con ceros a la izquierda |
| Reservado | 87 | 15 | Sin uso conocido |

El parser (`lib/parser.ts`) valida cada línea y reporta como error las que no se puedan
interpretar (demasiado cortas, sin código de barras, sin nombre o con unidades no numéricas),
sin interrumpir la importación del resto del fichero.

Si en el futuro cambia el formato de origen, solo hay que ajustar `lib/parser.ts` — el resto
de la aplicación (base de datos, API y dashboard) no depende del formato concreto del fichero.

## Stack técnico

- **Next.js 14** (App Router) + TypeScript + React
- **SQLite** (`better-sqlite3`) como almacenamiento — fichero único en `data/farmalagos.db`
  (no versionado; se regenera reimportando los históricos)
- **Recharts** para las visualizaciones
- **Tailwind CSS** para el estilo
- **Vitest** para los tests del parser

## Desarrollo local

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`.

### Tests

```bash
npm test
```

### Compilar para producción

```bash
npm run build
npm start
```

## Estructura del proyecto

```
app/                  Páginas y rutas API (Next.js App Router)
  api/pedidos/         Importar (POST) y listar (GET) pedidos
  api/pedidos/[id]/    Detalle y borrado de un pedido
  api/pedidos/[id]/analysis/  Análisis agregado de un pedido
  api/overview/        Agregados globales para el dashboard
  pedidos/             Listado y detalle de pedidos históricos
  importar/            Formulario de importación
components/           Componentes de UI (gráficos, tablas, formulario)
lib/
  parser.ts            Parser del fichero de ancho fijo
  db.ts                 Conexión y esquema SQLite
  queries.ts            Acceso a datos y agregados
  types.ts              Tipos compartidos
scripts/
  import-historicos.ts  Importación masiva desde data/historicos/
data/historicos/       Ficheros .txt históricos (fuente para la importación masiva)
```

## Notas sobre despliegue

El almacenamiento por defecto es un fichero SQLite en disco, pensado para ejecutar la
aplicación en un servidor/contenedor persistente (Docker, VPS, etc.). Si se despliega en una
plataforma serverless sin disco persistente (por ejemplo Vercel en su modo por defecto), los
datos importados no sobrevivirán entre despliegues; en ese caso habría que migrar
`lib/db.ts` a una base de datos gestionada (Postgres, Turso, etc.), manteniendo igual el resto
de la aplicación.
