# Almacén Pro

Sistema administrativo para un almacén con **frontend web**, **backend en Node.js + Express** y **MongoDB** como base de datos.

Esta versión está preparada para:
- usar `index.html` en la raíz del proyecto
- publicar el frontend en **GitHub Pages**
- correr el backend por separado en local o desplegado
- trabajar con módulos de negocio reales del almacén

---

## Qué incluye hoy

- Gestión de productos
- Gestión de proveedores
- Registro de compras
- Lotes con vencimiento
- Alertas automáticas por stock y vencimiento
- Acciones sobre lotes y alertas
- Auditoría básica
- Tests de validadores y utilidades
- Branding visual con favicon e identidad de almacén

---

## Tecnologías

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Base de datos:** MongoDB
- **Arquitectura:** capas (`routes`, `controllers`, `services`, `repositories`, `validators`, `middlewares`)

---

## Estructura del proyecto

```text
almacen/
├── index.html
├── 404.html
├── MANUAL_DE_USUARIO.md
├── public/
│   ├── styles.css
│   ├── script.js
│   ├── favicon.ico
│   └── assets/
├── scripts/
│   └── check-syntax.mjs
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── errors/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Requisitos

- **Node.js 20 o superior**
- **MongoDB** local o en Atlas
- npm

---

## Instalación

```bash
npm install
```

---

## Configuración del entorno

Copiá `.env.example` a `.env` y completalo.

Ejemplo:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=almacen_pro
```

---

## Cómo levantar el proyecto

### Desarrollo

```bash
npm run dev
```

Abrí:

```text
http://localhost:3000
```

### Producción/local simple

```bash
npm start
```

---

## Scripts disponibles

```bash
npm run dev
npm start
npm run check
npm test
npm run test:watch
```

### Qué hace cada uno

- `npm run dev`: arranca el servidor con recarga automática
- `npm start`: arranca el servidor normal
- `npm run check`: revisa sintaxis del proyecto
- `npm test`: corre los tests
- `npm run test:watch`: corre tests en modo watch

---

## Manual de usuario

Se incluye un archivo aparte pensado para usuarios no técnicos:

- `MANUAL_DE_USUARIO.md`

Ese archivo explica cómo operar el sistema completo como si lo usara un cliente o empleado por primera vez.

---

## Cómo funciona GitHub Pages en este proyecto

Este proyecto quedó preparado para que **el frontend** pueda publicarse en GitHub Pages porque:

- `index.html` está en la raíz
- `404.html` replica la entrada principal para tolerar recargas
- los assets cargan desde `./public/...`

### Importante

**GitHub Pages no ejecuta Node.js ni MongoDB.**

Eso significa:

- **sí** podés publicar la interfaz
- **no** podés ejecutar el backend completo dentro de GitHub Pages

Si querés que el sistema completo funcione online, necesitás:

- frontend en GitHub Pages
- backend desplegado aparte
- MongoDB accesible desde ese backend

---

## Publicar el frontend en GitHub Pages

1. Subí este proyecto a GitHub.
2. Entrá al repositorio.
3. Andá a **Settings > Pages**.
4. En **Build and deployment**, elegí:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/root`
5. Guardá.

Después de unos minutos, GitHub te va a dar una URL pública.

---

## Cómo usarlo localmente con MongoDB

1. Levantá MongoDB.
2. Ejecutá `npm run dev`.
3. Entrá a `http://localhost:3000`.
4. Si querés volver a datos demo:

```powershell
Invoke-RestMethod -Method POST http://localhost:3000/api/reset-demo
```

---

## Endpoints principales

### Salud y dashboard
- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/reset-demo`

### Productos
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Proveedores
- `GET /api/providers`
- `POST /api/providers`
- `PUT /api/providers/:id`
- `DELETE /api/providers/:id`

### Compras
- `GET /api/purchases`
- `GET /api/purchases/:id`
- `POST /api/purchases`

### Lotes y alertas
- `GET /api/lots`
- `GET /api/alerts`

### Auditoría
- `GET /api/audit-logs`

---

## Filtros y paginación desde backend

### Productos
```text
GET /api/products?page=1&limit=12&sort=name&order=asc&q=leche&category=Lácteos&status=low
```

### Proveedores
```text
GET /api/providers?page=1&limit=10&sort=name&order=asc&q=distribuidora
```

### Compras
```text
GET /api/purchases?page=1&limit=10&sort=purchasedAt&order=desc&status=received&providerId=...&dateFrom=2026-04-01&dateTo=2026-04-30
```

### Lotes
```text
GET /api/lots?page=1&limit=10&sort=expiry&order=asc&status=urgente&days=30&q=leche
```

### Alertas
```text
GET /api/alerts?page=1&limit=10&sort=priority&order=desc&type=low_stock&priority=high&days=30
```

---

## Estado actual del proyecto

Esta base ya permite trabajar con:

- productos
- proveedores
- compras
- lotes
- alertas
- acciones sobre lotes/alertas
- auditoría básica
- frontend listo para publicación del lado cliente

---

## Recomendaciones para seguir

Si después de subir esta versión querés seguir mejorándola, el camino más lógico es:

1. **Tests de integración reales**
2. **Flujo más completo de compras pendientes**
3. **Reportes administrativos**
4. **Despliegue del backend** en Render, Railway o VPS
5. **Conectar el frontend publicado** a una API online

---

## Cierre

Esta versión está pensada como una base estable para subir el proyecto y seguir evolucionándolo sin perder orden.
