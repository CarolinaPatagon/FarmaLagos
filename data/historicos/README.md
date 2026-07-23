# Ficheros históricos de pedidos

Coloca aquí los ficheros `.txt` de pedidos que quieras importar en bloque con:

```
npm run import:historicos
```

## Convención de nombre

Cada fichero debe nombrarse así:

```
<nombre-o-referencia-del-pedido>__<AAAA-MM-DD>.txt
```

Ejemplo:

```
PEDIDO_FARMACIA_CENTRAL__2026-07-20.txt
```

- La parte antes de `__` es el nombre/referencia del pedido (los guiones bajos se convierten en espacios).
- La parte después de `__` es la fecha del pedido, en formato `AAAA-MM-DD`.

Si un fichero ya existe con el mismo nombre y fecha, se reemplaza con el contenido nuevo.

También puedes importar pedidos uno a uno desde la web, en **Importar pedido**.

## `pendiente-fecha/`

Contiene pedidos históricos reales (ficheros `PED#####.TXT`) subidos por el usuario cuyo
nombre de fichero solo incluye un número de pedido secuencial, sin fecha. Antes de poder
importarlos hay que confirmar la fecha real de cada uno y renombrarlos siguiendo la
convención `<nombre>__<AAAA-MM-DD>.txt` en esta misma carpeta (o en la carpeta padre).
