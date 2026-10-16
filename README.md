# PanStock 🥖

Sistema web para controlar el **stock y los vencimientos** de una franquicia de panaderías (Nombre de la franquicia). Registra cada ingreso por lote, descuenta las ventas con criterio **FEFO** (primero vence, primero sale) y avisa qué productos están por vencer para venderlos con promoción o descartarlos a tiempo.

<!-- link a la demo online publicada. -->
<!-- Agregá 2 o 3 capturas en docs/ (dashboard, vencimientos, promociones) y mostralas así: ![Dashboard](docs/dashboard.png) -->

## ¿Qué problema resuelve?

En una panadería, buena parte de la mercadería tiene fecha de vencimiento corta. Llevar ese control en papel o en planillas genera mermas que se detectan tarde. PanStock centraliza el inventario por lote y muestra, con un semáforo, qué hay que vender, rematar o descartar primero.

## Funcionalidades

- **Stock por lotes:** cada ingreso crea un lote con fecha de vencimiento, costo, precio y proveedor.
- **Ventas con FEFO:** la venta descuenta de los lotes que vencen antes, puede repartirse entre varios lotes y deja un movimiento por cada uno. Los lotes vencidos no se venden.
- **Vencimientos:** tablero con semáforo (vigente, por vencer, vencido) y alertas configurables.
- **Mermas:** registro de descartes con motivo. Cuando el sistema descarta lotes vencidos, un aviso pide confirmar el descarte físico.
- **Promociones:** para productos por vencer, el sistema sugiere un descuento según los días que faltan (20% si vence hoy o mañana, 10% si faltan más). El dueño las aprueba, las crea a mano o las cancela.
- **Reposición sugerida** según ventas y stock (solo dueño).
- **Reportes** (solo dueño): ventas por producto y categoría, saldo de stock, mermas por categoría y por proveedor.
- **Notificaciones** del navegador para avisar de vencimientos próximos.
- **Catálogo:** productos, categorías y proveedores, con baja lógica.
- **Gestión de empleados:** no hay registro abierto. El dueño crea las cuentas de sus empleados, les pasa el usuario y la contraseña inicial, y puede deshabilitarlos o volver a habilitarlos.

La API además expone ajustes manuales de stock, historial de movimientos, alertas y configuración, que todavía no tienen pantalla en el frontend.

## Roles

| | Dueño (`OWNER`) | Empleado (`EMPLOYEE`) |
|---|---|---|
| Ver dashboard, stock, lotes, vencimientos y mermas | ✅ | ✅ |
| Registrar ventas, ingresos de mercadería y mermas | ✅ | ✅ |
| Ver promociones activas | ✅ | ✅ |
| Crear, editar y desactivar productos, categorías y proveedores | ✅ | ❌ |
| Sugerencias y creación de promociones, cancelarlas | ✅ | ❌ |
| Reposición sugerida y reportes | ✅ | ❌ |
| Crear empleados, habilitarlos y deshabilitarlos | ✅ | ❌ |

Los permisos se validan en el backend; el frontend además oculta lo que cada rol no puede usar.

## Tecnologías

| Capa | Stack |
|---|---|
| Backend | Java 21, Spring Boot 4, Spring Security + JWT, Spring Data JPA (Hibernate 7), Bean Validation, Lombok |
| Base de datos | MySQL/MariaDB en local, PostgreSQL en producción |
| Frontend | React 19, Vite, Redux Toolkit, Redux Persist, React Router 7 |
| Infraestructura | Docker (build multi-stage para el backend) |

## Decisiones de diseño

- **Stock por lote, no por producto.** El stock de un producto es la suma de sus lotes: así cada unidad tiene su propio vencimiento y se puede aplicar FEFO.
- **Cada cambio deja un movimiento** (ingreso, venta, ajuste, descarte), por lo que el saldo se puede auditar.
- **Baja lógica** en el catálogo, para no perder el historial de ventas de un producto desactivado.
- **Seguridad:**
  - Autenticación con JWT y roles en la API. No hay registro abierto: solo un dueño crea empleados, y siempre con rol `EMPLOYEE`.
  - El autor de cada operación (ventas, mermas, promociones) sale del usuario autenticado, no del request.
  - Un empleado deshabilitado pierde el acceso en su próximo request, aunque su token no haya vencido.
  - Los secretos (contraseña de la base y clave JWT) nunca se versionan: viven en un archivo local ignorado por git o en variables de entorno.
- **Capas separadas:** controlador, servicio, repositorio, DTO y mapper, con un `GlobalExceptionHandler` que unifica las respuestas de error.
- **Zona horaria fija** (`America/Argentina/Buenos_Aires`), porque la validación de vencimientos depende de la fecha local.

## Estructura

```
MVP_React_Java/
├── Back/
│   ├── panstock-api/                  # API REST (Spring Boot)
│   │   ├── database/                  # script SQL: estructura y datos de ejemplo
│   │   └── src/main/
│   │       ├── java/com/panstock/api/ # controller, service, repository, entity, dto, mapper, exception
│   │       └── resources/             # application.properties y application-prod.properties
│   └── PanStock_API_Documentacion_para_armar_Frontend.md   # documentación de la API
└── Front/
    ├── Front.md                       # documentación del frontend
    └── panstock-client/               # SPA (React + Vite)
```

## Cómo correrlo en local

**Requisitos:** JDK 21, Node.js 20.19 o superior y MySQL o MariaDB.

### 1. Base de datos

Abrí `Back/panstock-api/database/panstock_schema_mock.sql` y reemplazá `panstock123` por la contraseña que quieras usar para el usuario `panstock_user`. Después ejecutalo desde MySQL Workbench o con:

```bash
mysql -u root -p < Back/panstock-api/database/panstock_schema_mock.sql
```

### 2. Backend

Creá el archivo `Back/panstock-api/src/main/resources/application-local.properties` (git lo ignora) con tres líneas:

```properties
spring.datasource.username=panstock_user
spring.datasource.password=LA_CONTRASEÑA_QUE_ELEGISTE
application.security.jwt.secretKey=UNA_CLAVE_ALEATORIA_DE_32_O_MAS_CARACTERES
```

Para generar la clave: `openssl rand -hex 48`. En lugar del archivo también podés definir las variables de entorno `DB_PASSWORD` y `JWT_SECRET`. Después:

```bash
cd Back/panstock-api
./mvnw spring-boot:run          # en Windows: .\mvnw.cmd spring-boot:run
```

La API queda en `http://localhost:8081`.

### 3. Frontend

```bash
cd Front/panstock-client
cp .env.example .env            # en Windows (PowerShell): Copy-Item .env.example .env
npm install
npm run dev
```

La app queda en `http://localhost:5173`. En desarrollo, Vite redirige `/api`, `/auth` y `/users` al backend indicado en `VITE_API_URL`.

### Usuarios de prueba

El script SQL crea estos usuarios, solo para desarrollo local (contraseña `1234` para todos):

| Usuario | Rol |
|---|---|
| `lorena` | Dueño |
| `gabriel` | Dueño |
| `martina` | Empleado |

## Tests

```bash
cd Back/panstock-api
./mvnw test
```

El test de contexto de Spring (`PanstockApiApplicationTests`) necesita la base de datos y la configuración local del paso 2.

## Producción

Se activa con `SPRING_PROFILES_ACTIVE=prod` y se configura solo con variables de entorno. Si falta alguna, la aplicación no arranca:

| Variable | Contenido |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://HOST:5432/BASE` |
| `SPRING_DATASOURCE_USERNAME` | usuario de la base |
| `DB_PASSWORD` | contraseña de la base |
| `JWT_SECRET` | clave JWT aleatoria, de 32 caracteres o más |
| `APP_CORS_ALLOWED_ORIGINS` | URL pública del frontend (varias, separadas por coma) |

Para el frontend, copiá `.env.prod.example` como `.env.production` y poné la URL pública de la API en `VITE_API_URL` antes de hacer `npm run build`.

## Próximos pasos

- [ ] Tests de la lógica de ventas con FEFO (venta en un lote, reparto entre lotes, stock insuficiente, lote vencido).
- [ ] Bloqueo de concurrencia al registrar ventas, para evitar vender de más.
- [ ] Generación programada de alertas (`@Scheduled`) en lugar de disparo manual.
- [ ] Pantallas para ajustes de stock, historial de movimientos y configuración.
- [ ] Pantalla de perfil para que cada usuario cambie su contraseña.
- [ ] Integración continua con GitHub Actions y una base de datos de prueba para los tests de contexto.
- [ ] Dividir las páginas más grandes del frontend en componentes.

