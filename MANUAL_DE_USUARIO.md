# Manual de usuario — Almacén Pro

## 1. ¿Qué es este sistema?

**Almacén Pro** es un sistema web para organizar un almacén o negocio similar. Permite trabajar con:

- productos
- proveedores
- compras
- lotes con vencimiento
- alertas automáticas
- acciones correctivas sobre lotes y alertas
- auditoría básica de operaciones

La idea principal es que cualquier persona pueda entrar, ver qué está pasando en el negocio y operar el sistema sin depender de conocimientos técnicos.

---

## 2. Cómo entrar al sistema

### Uso local

1. Abrí una terminal en la carpeta del proyecto.
2. Ejecutá:

```bash
npm run dev
```

3. Abrí el navegador en:

```text
http://localhost:3000
```

### Qué deberías ver

Al abrir el sistema vas a encontrar:

- un **menú lateral** con las secciones principales
- una **pantalla principal** con tarjetas, tablas y botones
- un diseño oscuro con navegación tipo panel administrativo

---

## 3. Estructura general de la pantalla

### Menú lateral

Desde el menú lateral se accede a las secciones principales:

- **Dashboard**
- **Productos**
- **Compras**
- **Proveedores**
- **Lotes**
- **Alertas**

También puede haber botones de acceso rápido como:

- nuevo producto
- nueva compra
- nuevo proveedor
- ver lotes
- restaurar demo

### Encabezado superior

En la parte superior se muestran:

- el nombre de la sección actual
- una breve descripción
- botones de acción rápida, por ejemplo **Actualizar datos** o **Nuevo producto**

---

## 4. Dashboard

El **Dashboard** es la vista general del negocio.

### Qué muestra

Normalmente vas a ver:

- cantidad de productos
- unidades totales en stock
- productos bajo mínimo
- valor estimado del stock
- cantidad de proveedores
- cantidad de compras registradas
- productos críticos
- lotes por vencer
- últimas compras

### Para qué sirve

Sirve para tener un resumen rápido de la situación actual y detectar problemas sin entrar a cada módulo por separado.

---

## 5. Productos

La sección **Productos** sirve para ver y administrar el catálogo general.

### Qué podés hacer

- ver el listado de productos
- buscar por nombre, proveedor, código o ubicación
- filtrar por categoría
- filtrar por estado
- ordenar la lista
- crear un producto nuevo
- editar un producto existente
- eliminar un producto

### Datos típicos de un producto

Un producto puede tener:

- nombre
- categoría
- proveedor
- ubicación
- stock actual
- stock mínimo
- precio
- estado

### Cómo crear un producto

1. Entrá a **Productos**.
2. Tocá **Nuevo producto**.
3. Completá los campos del formulario.
4. Tocá **Guardar**.

### Cómo editar un producto

1. Buscá el producto en la tabla.
2. Tocá **Editar**.
3. Cambiá los datos que necesites.
4. Tocá **Guardar**.

### Cómo eliminar un producto

1. Buscá el producto en la tabla.
2. Tocá **Eliminar**.
3. Confirmá la acción si el sistema lo pide.

### Importante

Algunos productos pueden no poder borrarse si están relacionados con compras o lotes. Eso es normal y protege la integridad de los datos.

---

## 6. Proveedores

La sección **Proveedores** sirve para administrar a quiénes le comprás mercadería.

### Qué podés hacer

- ver la lista de proveedores
- crear un proveedor nuevo
- editar datos de un proveedor
- eliminar proveedores sin relaciones activas

### Datos típicos de un proveedor

- nombre
- contacto
- teléfono
- email
- observaciones
- cantidad de compras relacionadas
- cantidad de productos asociados

### Cómo crear un proveedor

1. Entrá a **Proveedores**.
2. Tocá **Nuevo proveedor**.
3. Completá los datos.
4. Tocá **Guardar**.

### Recomendación

Mantené los nombres de proveedores claros y consistentes para evitar duplicados.

---

## 7. Compras

La sección **Compras** sirve para registrar ingresos de mercadería.

### Qué podés hacer

- ver compras existentes
- crear una compra nueva
- revisar detalle de una compra
- usar filtros y búsqueda
- trabajar con compras pendientes, recibidas o canceladas, según la versión activa

### Qué pasa cuando registrás una compra

Según el flujo configurado:

- se guarda la compra
- se actualiza el stock del producto
- se pueden crear lotes con vencimiento
- se registra auditoría interna

### Cómo registrar una compra

1. Entrá a **Compras**.
2. Tocá **Nueva compra**.
3. Elegí el proveedor.
4. Completá el comprobante o referencia.
5. Cargá una o más líneas de compra.
6. Indicá cantidad, costo y vencimiento si corresponde.
7. Guardá.

### Resultado esperado

Después de guardar:

- la compra aparece en el listado
- el producto puede subir su stock
- si cargaste vencimiento, puede aparecer un lote nuevo

---

## 8. Lotes

La sección **Lotes** sirve para controlar mercadería por vencimiento.

### Qué es un lote

Un lote representa una porción de mercadería ingresada con:

- producto
- cantidad
- cantidad restante
- vencimiento
- proveedor
- compra asociada

### Qué podés hacer

- ver todos los lotes
- filtrar por estado
- filtrar por días de vencimiento
- ordenar por vencimiento, producto o cantidad
- aplicar acciones correctivas

### Estados comunes

Un lote puede estar:

- normal
- próximo a vencer
- vencido
- promocionado
- afectado por merma

### Para qué sirve

Te ayuda a evitar pérdidas y a identificar mercadería que necesita atención antes de que se venza.

---

## 9. Alertas

La sección **Alertas** es uno de los módulos más importantes del sistema.

### Qué hace

Muestra problemas que el sistema detecta automáticamente.

### Tipos de alertas comunes

- producto con stock bajo
- producto sin stock
- lote por vencer
- lote vencido

### Qué podés hacer desde una alerta

Según el tipo de alerta, puede haber botones para:

- marcar como atendida
- reabrir la alerta
- ir al lote
- registrar vencido
- mover a promoción
- generar reposición

### Cómo usar bien este módulo

La idea no es solo leer la alerta, sino **resolverla desde ahí** cuando el sistema ofrece esa acción.

---

## 10. Acciones sobre lotes y alertas

En algunos casos podés operar directamente sobre los lotes o las alertas.

### Acciones frecuentes

- marcar lote como vencido
- registrar merma
- mover a promoción
- resolver una alerta
- reabrir una alerta
- generar sugerencia de reposición

### Qué efecto tienen

Estas acciones pueden:

- cambiar el estado del lote
- descontar stock
- cerrar una alerta
- generar registros de auditoría
- actualizar la situación del producto

### Recomendación

Antes de aplicar una acción, verificá que realmente querés hacer ese cambio, porque puede impactar inventario y alertas.

---

## 11. Restaurar demo

El botón o endpoint **Restaurar demo** deja el sistema con datos de ejemplo.

### Cuándo usarlo

- cuando querés probar el sistema desde cero
- cuando hiciste muchas pruebas y querés volver a una base limpia
- cuando querés mostrar el sistema con datos ya cargados

### Qué hace

- borra datos de prueba anteriores
- vuelve a sembrar productos, proveedores, compras y lotes demo

### Cómo ejecutarlo por terminal

```powershell
Invoke-RestMethod -Method POST http://localhost:3000/api/reset-demo
```

---

## 12. Cómo probar que algo quedó guardado

Si querés confirmar que el sistema guarda de verdad:

1. hacé una acción, por ejemplo crear un producto
2. verificá que aparezca en pantalla
3. refrescá el navegador
4. revisá si sigue ahí

Si sigue estando, entonces quedó guardado correctamente.

---

## 13. Errores comunes y qué hacer

### La página no abre

Revisá que el backend esté levantado con:

```bash
npm run dev
```

### La página abre pero no carga datos

Probá:

- recargar con `Ctrl + F5`
- revisar que MongoDB esté corriendo
- mirar si la terminal muestra errores

### Un botón no hace nada

Revisá dos cosas:

- la consola del navegador
- la terminal donde corre `npm run dev`

### No puedo borrar un registro

Puede estar relacionado con otras entidades. Por ejemplo:

- un producto con compras asociadas
- un proveedor con productos o compras asociadas

Eso normalmente es una protección del sistema.

### El sistema quedó raro después de muchas pruebas

Usá **Restaurar demo** y empezá otra vez desde una base limpia.

---

## 14. Buenas prácticas de uso

- cargá productos con nombres claros
- usá proveedores reales y consistentes
- registrá compras apenas ingresan
- revisá lotes y alertas seguido
- no ignores alertas de vencimiento
- hacé pruebas primero con datos demo si no estás seguro

---

## 15. Recomendación operativa

Si una persona nueva va a usar el sistema, el orden más lógico es este:

1. mirar **Dashboard**
2. revisar **Alertas**
3. entrar a **Productos**
4. revisar **Lotes**
5. cargar **Compras** cuando entra mercadería
6. mantener **Proveedores** ordenados

Ese flujo ya alcanza para operar el sistema de forma bastante cómoda.

---

## 16. Alcance actual del sistema

Hoy el sistema ya está preparado para trabajar con:

- catálogo de productos
- proveedores
- compras
- lotes
- alertas
- acciones correctivas
- auditoría básica

No es solo una maqueta visual: es una base funcional con persistencia real sobre MongoDB.

---

## 17. Cierre

Si este manual lo agarra alguien que nunca vio el proyecto, debería poder:

- abrir el sistema
- identificar las secciones
- cargar productos y proveedores
- registrar compras
- entender lotes y alertas
- operar acciones básicas sin tocar código

Si más adelante el proyecto crece, conviene mantener este manual actualizado junto con el README.
