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

Se han observado **dos formatos** de origen en los pedidos reales, ambos de ancho fijo y
ambos en la página de códigos **CP437** (no ISO-8859-1/UTF-8: por ejemplo, la "Ñ" se codifica
como el byte `0xA5`). El parser (`lib/parser.ts`) detecta automáticamente cuál es línea a
línea, decodifica el CP437 explícitamente y no depende de que el usuario indique el formato.

**Formato A** — sin separadores, 102 caracteres por línea:

| Campo | Posición (offset) | Longitud | Descripción |
|---|---|---|---|
| Código interno | 0 | 19 | Código de artículo del proveedor |
| Código de barras | 19 | 13 | EAN-13 |
| Nombre comercial | 32 | 35 | Los primeros 4 caracteres son el código del laboratorio |
| Unidades pedidas | 67 | 20 | Numérico, con ceros a la izquierda |
| Reservado | 87 | 15 | Sin uso conocido |

**Formato B** — con espacios como separadores, 65 caracteres por línea:

| Campo | Posición (offset) | Longitud | Descripción |
|---|---|---|---|
| Nombre comercial | 0 | 30 | Sin el código de laboratorio |
| Código de laboratorio | 31 | 4 | |
| Unidades pedidas | 36 | 6 | Numérico, con ceros a la izquierda |
| Código interno | 43 | 8 | Código de artículo del proveedor |
| Código de barras | 52 | 13 | EAN-13 |

El parser valida cada línea y reporta como error las que no se puedan interpretar (demasiado
cortas, sin código de barras, sin nombre o con unidades no numéricas), sin interrumpir la
importación del resto del fichero.

Si en el futuro aparece un tercer formato, solo hay que ajustar `lib/parser.ts` — el resto de
la aplicación (base de datos, API y dashboard) no depende del formato concreto del fichero.

## Stack técnico

- **Next.js** (App Router) + TypeScript + React
- **Postgres** (`pg`) como almacenamiento — el esquema se crea solo al arrancar
- **Recharts** para las visualizaciones
- **Tailwind CSS** para el estilo
- **Vitest** para los tests del parser

## Desarrollo local

Necesitas una base de datos Postgres accesible (local o remota) y su cadena de conexión en
`DATABASE_URL`. Ejemplo con Postgres local:

```bash
sudo -u postgres psql -c "CREATE ROLE farmalagos WITH LOGIN PASSWORD 'farmalagos_dev';"
sudo -u postgres psql -c "CREATE DATABASE farmalagos OWNER farmalagos;"
cp .env.example .env.local   # ajusta DATABASE_URL si hace falta
```

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`. El esquema de tablas se crea
automáticamente en el primer arranque (no hace falta ejecutar migraciones a mano).

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
  db.ts                 Conexión (pg Pool) y esquema Postgres
  queries.ts            Acceso a datos y agregados
  types.ts              Tipos compartidos
scripts/
  import-historicos.ts  Importación masiva desde data/historicos/
data/historicos/       Ficheros .txt históricos (fuente para la importación masiva)
```

## Despliegue en Vercel

La app es compatible con Vercel (funciones serverless) porque el almacenamiento es Postgres,
no un fichero local. Pasos:

1. Crea una base de datos Postgres accesible desde internet (Vercel Postgres, Neon, Supabase,
   etc.) y copia su cadena de conexión.
2. En el proyecto de Vercel, define la variable de entorno `DATABASE_URL` con esa cadena.
3. Despliega — el esquema de tablas se crea solo en la primera petición.
4. (Opcional) Ejecuta `npm run import:historicos` apuntando `DATABASE_URL` a esa misma base de
   datos para precargar el histórico antes de anunciar la URL a los usuarios.

### Con Supabase

1. En [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**, elige nombre,
   contraseña de base de datos y región. Espera ~2 min a que se aprovisione.
2. **Project Settings → Database → Connection string** → copia la de **Connection pooling**
   (modo *Transaction*, puerto `6543`). Es la recomendada para funciones serverless como las de
   Vercel, porque no agota las conexiones de Postgres.
3. En Vercel: **Settings → Environment Variables** → añade `DATABASE_URL` con esa cadena
   (marca al menos *Production*).
4. **Deployments → (último deploy) → Redeploy** — los cambios de variables de entorno no se
   aplican solos, hace falta un nuevo deploy.

`lib/db.ts` activa SSL automáticamente para cualquier `DATABASE_URL` que no sea local, así que
no hace falta ninguna configuración adicional para que funcione con Supabase.
