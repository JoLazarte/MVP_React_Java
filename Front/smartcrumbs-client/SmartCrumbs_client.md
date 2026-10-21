# SmartCrumbs — Cliente web

Interfaz de SmartCrumbs (control de stock y vencimientos). Construida con **React 19, Vite, Redux Toolkit, Redux Persist y React Router 7**.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + Vite |
| Estado global | Redux Toolkit |
| Persistencia local | Redux Persist (localStorage) |
| Routing | React Router 7 |
| Estilos | CSS-in-JS inline (un bloque `<style>` dentro de cada componente) |
| Fuentes | Playfair Display + DM Sans (Google Fonts) |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build para probarlo |
| `npm run lint` | Revisa el código con ESLint |

## Requisitos previos

- Node.js 20.19 o superior.
- Backend SmartCrumbs corriendo (por defecto en `http://localhost:8081`).

## Instalación y ejecución

```bash
cd Front/smartcrumbs-client
cp .env.example .env     # en Windows (PowerShell): Copy-Item .env.example .env
npm install
npm run dev
```

## Variables de entorno

| Archivo | Uso |
|---|---|
| `.env` | Desarrollo. `VITE_API_URL` es la URL del backend; Vite redirige `/api`, `/auth` y `/users` hacia ahí. |
| `.env.production` | Build de producción. Copiá `.env.prod.example` y poné la URL pública de la API. |

Ambos archivos están ignorados por git; solo se versionan los `*.example`.

## Estructura de carpetas

```
src/
├── components/
│   ├── AutoWasteModal.jsx        # Aviso global de lotes vencidos descartados automáticamente
│   ├── ProtectedRoute.jsx        # Protege rutas por sesión y por rol (prop requiredRole)
│   ├── catalog/                  # CategoryForm, ProductForm
│   ├── layout/AppTopbar.jsx      # Barra de navegación superior
│   ├── notifications/            # NotificationBell, NotificationSettingsModal
│   ├── stock/                    # StockEntryForm (ingreso), StockSaleForm (venta), StockAdjustmentForm (ajuste)
│   ├── ui/                       # CatalogUI (Modal, ConfirmDialog, badges), FormField (Input, Button, Alert)
│   ├── users/EmployeeForm.jsx    # Alta de empleados (solo dueño)
│   └── waste/WasteForm.jsx       # Registro de mermas
├── features/                     # Un slice de Redux por dominio
│   ├── alerts/                   # alertsSlice (alertas del backend)
│   ├── auth/                     # Login, logout, perfil
│   ├── catalog/                  # categoriesSlice, productsSlice, suppliersSlice
│   ├── movements/                # movementsSlice (historial de movimientos)
│   ├── notifications/            # notificationsSlice + hook useNotifications
│   ├── promotions/               # promotionsSlice
│   ├── reports/                  # reportsSlice
│   ├── settings/                 # settingsSlice (configuración del dueño)
│   ├── stock/                    # stockSlice, expirationSlice, restockSlice
│   ├── users/                    # usersSlice (empleados)
│   └── waste/                    # wasteSlice, autoWasteNotificationSlice
├── pages/                        # Una página por ruta
├── services/                     # authService, catalogService, stockService, userService, alertService, settingsService
├── utils/format.js               # Formato de números, moneda y fechas (es-AR)
├── store/store.js                # Configuración de Redux + persistencia
├── App.jsx                       # Rutas principales
├── main.jsx                      # Punto de entrada
└── index.css                     # Variables CSS globales y animaciones
```
El service worker de las notificaciones está en `public/sw.js`.

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/login` | LoginPage | Público |
| `/dashboard` | DashboardPage | Autenticado |
| `/stock` | StockPage | Autenticado |
| `/movements` | MovementsPage | Autenticado (se llega desde Stock) |
| `/alerts` | AlertsPage | Autenticado |
| `/settings` | SettingsPage | Solo OWNER |
| `/waste` | WastePage | Autenticado |
| `/expiration` | ExpirationPage | Autenticado |
| `/promotions` | PromotionsPage | Autenticado (el dueño ve más pestañas) |
| `/products` | ProductsPage | Autenticado |
| `/categories` | CategoriesPage | Autenticado |
| `/suppliers` | SuppliersPage | Autenticado |
| `/restock` | RestockPage | Solo OWNER |
| `/reports` | ReportsPage | Solo OWNER |
| `/users` | UsersPage | Solo OWNER |

Las rutas protegidas redirigen a `/login` si no hay sesión. Si el token JWT expiró, `TokenGuard` (dentro de `App.jsx`) lo detecta y hace logout. Las rutas de dueño usan `<ProtectedRoute requiredRole="OWNER">`.

## Roles y permisos

El frontend respeta el rol devuelto por el backend al iniciar sesión y oculta lo que no corresponde. **La validación final de permisos siempre la hace el backend.**

| Acción | OWNER | EMPLOYEE |
|---|---|---|
| Ver dashboard, stock, lotes, vencimientos y mermas | ✅ | ✅ |
| Registrar ingreso de mercadería, venta manual y mermas | ✅ | ✅ |
| Ajustar el stock de un lote y ver el historial de movimientos | ✅ | ✅ |
| Ver alertas y resolverlas | ✅ | ✅ |
| Configurar los días de aviso de vencimiento y de sugerencia de promoción | ✅ | ❌ |
| Ver promociones activas | ✅ | ✅ |
| Ver productos, categorías y proveedores | ✅ | ✅ |
| Crear, editar y desactivar productos, categorías y proveedores | ✅ | ❌ |
| Retirar un producto de la venta (desde Vencimientos) | ✅ | ❌ |
| Ver sugerencias de promociones, crearlas y cancelarlas | ✅ | ❌ |
| Reposición sugerida y reportes | ✅ | ❌ |
| Crear empleados, habilitarlos y deshabilitarlos | ✅ | ❌ |

## Autenticación

El flujo usa JWT. **No hay registro abierto:** solo un dueño crea cuentas de empleado desde la pantalla Empleados y les pasa el usuario y la contraseña inicial. Al iniciar sesión, el backend devuelve un `access_token` que se guarda en Redux y persiste en localStorage vía Redux Persist.

Cada request autenticado envía el header:

```
Authorization: Bearer <token>
```

`TokenGuard` decodifica el JWT localmente y fuerza logout si está vencido. Si un dueño deshabilita a un empleado, el backend rechaza sus próximos requests (401) aunque su token no haya vencido.

**Usuarios de prueba** (requieren el SQL mock cargado; solo para desarrollo local):

| Usuario | Contraseña | Rol |
|---|---|---|
| lorena | 1234 | OWNER |
| gabriel | 1234 | OWNER |
| martina | 1234 | EMPLOYEE |

## Estado global (Redux)

- **Persisten en localStorage:** `auth` (token, usuario, sesión), `categories`, `products` y `suppliers` (la lista de items, que se recarga al entrar a cada página), `waste` (lista de usuarios para el filtro), `notifications` (preferencias), `autoWasteNotification` y `reports` (rangos de fechas).
- **No persisten:** `stock`, `expiration`, `promotions`, `restock` y `users`. Se cargan siempre desde el servidor al entrar a la página.

## Módulos

### Login
Inicio de sesión con usuario y contraseña, y validación en el cliente antes de enviar. El mensaje de error del backend se muestra tal cual. No hay pantalla de registro.

### Dashboard
Saludo con el rol del usuario, semáforo de vencimientos con contadores y accesos directos a los módulos.

### Stock (`/stock`)
Accesible para ambos roles. Acciones principales:

- **Registrar ingreso** (`POST /api/stock/entries`): selector de producto activo, proveedor por defecto del producto, fecha de ingreso y de vencimiento (obligatoria si el producto es perecedero), cantidad, almacenamiento y observaciones. Los precios son opcionales; si no se envían, usa los del producto.
- **Registrar venta** (`POST /api/stock/sales`): el backend aplica FEFO (descuenta primero del lote más próximo a vencer). No se venden lotes vencidos ni productos inactivos. Al terminar muestra qué lotes se descontaron y en qué cantidad.
- **Ajustar stock** (`POST /api/stock/adjustments`): desde el detalle de un lote (vista de lotes). Corrige la diferencia entre el stock del sistema y el recuento físico: suma o resta unidades de ese lote y exige un motivo. No se ajustan lotes vencidos (se descartan desde Mermas) ni descartados. Para una venta se usa la venta, para una pérdida Mermas y para mercadería nueva el ingreso.

Incluye vista de resumen y vista de lotes, con filtros por estado y búsqueda por nombre. Cada lote tiene el atajo **Ver movimientos**, y el botón **Historial de movimientos** abre `/movements`.

### Historial de movimientos (`/movements`)
Accesible para ambos roles, desde Stock (no tiene lugar propio en la barra superior). Lista cada ingreso, venta, merma y ajuste (`GET /api/stock/movements`), del más reciente al más antiguo, con tipo, producto, lote, cantidad, fecha y quién lo hizo (un movimiento sin usuario es del sistema, por ejemplo un descarte automático). Los filtros (tipo, producto, fechas y lote) se aplican en el servidor; por defecto muestra los últimos 30 días, y si se llega desde un lote muestra todo su historial. Se cargan 50 movimientos por vez. El detalle de una merma (motivo y costo) sigue estando en Mermas.

### Mermas (`/waste`)
Listado con filtros y formulario de registro con motivo. Cuando el sistema descarta lotes vencidos automáticamente, `AutoWasteModal` aparece en cualquier pantalla y pide confirmar que el descarte físico se hizo.

### Vencimientos (`/expiration`)
Semáforo con contadores (vencido, vence hoy, vence pronto, en buen estado), filtro por estado, búsqueda por producto y agrupación por producto con todos sus lotes. El dueño puede retirar un producto de la venta desde esta pantalla.

### Promociones (`/promotions`)
Todos ven las promociones activas. El dueño además ve las sugerencias del sistema (según los días que faltan para el vencimiento), puede crear una promoción manual y cancelar las activas. Los estados son activa, cancelada y vencida.

### Reposición (`/restock`) y Reportes (`/reports`)
Solo dueño. Reposición sugerida según ventas y stock. Reportes de ventas (resumen, por categoría y por producto), saldo de stock y mermas (resumen, por categoría y por proveedor).

### Empleados (`/users`)
Solo dueño. Lista de usuarios con rol y estado, búsqueda, alta de empleados en un modal (nombre, apellido, email, usuario y contraseña inicial de 8 a 72 caracteres) y botones para habilitar o deshabilitar con confirmación. A los dueños no se los puede deshabilitar.

### Alertas (`/alerts`)
Accesible para ambos roles (ítem **Alertas** de la barra superior). Lista las alertas del backend (`GET /api/alerts`): lotes por vencer, vencidos y productos bajo el stock mínimo, con pestañas Activas y Resueltas. El servidor las genera solo, de forma periódica, y las cierra cuando el problema se arregla; también se pueden resolver a mano y pedir una revisión con **Actualizar**. Si el stock sigue bajo el mínimo, la alerta de stock bajo reaparece.

### Configuración (`/settings`)
Solo dueño. Dos ajustes del sistema (`/api/settings`), de 1 a 30 días: los **días de aviso de vencimiento** (definen el amarillo del semáforo, las alertas y las notificaciones, para todos los usuarios) y los **días para sugerir promociones** (20% si el lote vence hoy y 10% si faltan de 1 a N días). Se llega desde el modal de la campana o desde Alertas.

### Notificaciones
Campana en la barra superior con un modal de preferencias **de este dispositivo**, válido para todos los roles: activar las notificaciones, el canal y la frecuencia de chequeo. Cada chequeo consulta el semáforo y avisa una vez por día de cada lote en amarillo o rojo; el servicio worker (`public/sw.js`) muestra la notificación. Los días de aviso ya no se configuran acá sino en Configuración, para que coincidan en toda la app. Por ahora las notificaciones locales solo llegan con la app abierta; el canal Push real está en desarrollo.

### Productos, Categorías y Proveedores
- **Productos:** listado con filtros por categoría, origen y estado, y panel expandible con el detalle.
- **Categorías:** listado con chips de color.
- **Proveedores:** listado con filtro por tipo (Franquicia, Mayorista, Externo).

En los tres, el dueño crea, edita y desactiva (baja lógica) y el empleado solo consulta.

## Patrones de diseño

**Mobile first.** Los layouts usan flex y grid con breakpoints entre 480 y 780px. La barra superior colapsa las etiquetas en pantallas chicas y muestra solo íconos.

**Baja lógica.** Los `DELETE` del backend no eliminan registros: ponen `active = false`. El frontend actualiza el item en el store local sin un re-fetch completo.

**Errores del backend.** Los formularios muestran el campo `message` de la respuesta de error (y `error` si no hay `message`) en un banner.

**Variables CSS globales.** La paleta (espresso, amber, cream, etc.), los espaciados, radios y sombras están definidos como variables en `index.css`.

## Pendiente de implementar

- Notificaciones push reales (Web Push), que lleguen con la app cerrada, y el selector de canal funcionando.
- Pantalla de perfil para que cada usuario cambie su contraseña.
- Tests del frontend.