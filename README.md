# Almacén Pro — versión consolidada y reforzada

Esta versión deja el proyecto más limpio y sólido para seguir creciendo sin arrastrar restos de etapas anteriores.

## Qué mejoró en esta entrega

### Limpieza del proyecto
- se eliminaron archivos viejos de SQLite que ya no formaban parte del stack actual
- se dejó el repo alineado a **MongoDB + Node + Express**
- se ajustó `.gitignore` para no volver a subir artefactos que ya no sirven

### Robustez del backend
- creación segura de colecciones e índices faltantes
- auditoría desacoplada: si falla el log de auditoría no rompe la operación principal
- refuerzo de validaciones para productos, proveedores y compras
- mayor consistencia en operaciones sensibles sobre stock, lotes y compras

### Operaciones críticas más seguras
- el alta de compras ahora protege mejor la integridad del sistema
- si una compra falla durante la aplicación de stock/lotes/ajustes, intenta **revertir** los cambios ya hechos
- las compras en estado `pending` ya no impactan stock hasta quedar aplicadas

### Más trabajo resuelto desde Mongo
- productos: filtros, búsqueda, orden y paginación desde backend
- proveedores: filtros, búsqueda, orden y paginación desde backend
- compras: filtros, fechas, orden y paginación desde backend
- lotes: filtros, búsqueda, orden y paginación desde backend
- audit logs: filtros y paginación desde backend

## Requisitos

- Node.js 20+
- MongoDB local o Atlas

## Instalación

```bash
npm install
```

Copiá `.env.example` a `.env` y completá tus valores.

## Variables de entorno

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=almacen_pro
```

## Desarrollo

```bash
npm run dev
```

Abrí:

```txt
http://localhost:3000
```

## Reset de demo

```powershell
Invoke-RestMethod -Method POST http://localhost:3000/api/reset-demo
```

## Chequeos útiles

### Sintaxis

```bash
npm run check
```

### Tests

```bash
npm test
```

## Endpoints principales

- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/reset-demo`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/products/:id/reorder-suggestion`
- `GET /api/providers`
- `POST /api/providers`
- `PUT /api/providers/:id`
- `DELETE /api/providers/:id`
- `GET /api/purchases`
- `GET /api/purchases/:id`
- `POST /api/purchases`
- `GET /api/lots`
- `POST /api/lots/:id/mark-expired`
- `POST /api/lots/:id/waste`
- `POST /api/lots/:id/promotion`
- `GET /api/alerts`
- `POST /api/alerts/:key/resolve`
- `POST /api/alerts/:key/reopen`
- `GET /api/audit-logs`

## Ejemplos de query params

### Productos

`GET /api/products?page=1&limit=12&sort=name&order=asc&q=leche&category=Lácteos&status=low`

### Proveedores

`GET /api/providers?page=1&limit=10&sort=name&order=asc&q=distribuidora`

### Compras

`GET /api/purchases?page=1&limit=10&sort=purchasedAt&order=desc&status=received&providerId=...&dateFrom=2026-04-01&dateTo=2026-04-30`

### Lotes

`GET /api/lots?page=1&limit=10&sort=expiry&order=asc&status=urgente&days=30&q=leche`

### Auditoría

`GET /api/audit-logs?page=1&limit=25&sort=createdAt&order=desc&entityType=product&q=actualizó`

## Respuesta de ejemplo

Los listados principales devuelven una estructura como esta:

```json
{
  "items": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasPrevPage": false,
    "hasNextPage": false,
    "sort": "name",
    "order": "asc"
  }
}
```

## Qué conviene hacer a partir de esta base

Ahora que el proyecto quedó más limpio y más seguro, el camino recomendable es:

1. **tests de integración reales sobre rutas**
   - `POST /api/products`
   - `POST /api/providers`
   - `POST /api/purchases`
   - `POST /api/lots/:id/waste`
   - `POST /api/alerts/:key/resolve`

2. **acciones más robustas sobre compras pendientes**
   - recibir una compra pendiente
   - cancelar compra pendiente
   - convertir compra pendiente en aplicada

3. **reportes de negocio**
   - compras por período
   - stock bajo
   - lotes por vencer
   - pérdidas por merma/vencimiento

4. **cierre operativo**
   - historial más rico de acciones
   - más trazabilidad sobre quién hizo qué
   - exportes y reportes administrativos

## Nota

En este entorno pude validar la sintaxis y los tests unitarios locales. La prueba completa contra MongoDB real sigue dependiendo de tu entorno local y de tu base.


## Tests de integración

Con MongoDB local corriendo, podés ejecutar pruebas de integración de rutas y flujo de compras pendientes con:

```bash
npm run test:integration
```

Si querés correr todo junto:

```bash
npm run test:all
```

Estas pruebas levantan la app contra una base de datos temporal y validan:
- alta de proveedores y productos
- compra pendiente
- recepción de compra pendiente
- cancelación de compra pendiente
- lotes y alertas básicas


## Flujo de compras pendientes

La API ahora soporta un flujo más seguro para compras pendientes:

- `POST /api/purchases` con `status: "pending"` guarda la compra sin tocar inventario.
- `POST /api/purchases/:id/receive` aplica stock, crea lotes y deja la compra como recibida.
- `POST /api/purchases/:id/cancel` cancela una compra pendiente sin modificar stock.
