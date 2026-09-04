<div align="center">
  <img src="./gymtactik-logo-original-transparente.png" alt="GymTactik" width="420" />

  <h1>GymTactik</h1>
  <p><strong>Gestiona. Analiza. Crece.</strong></p>
  <p>Plataforma SaaS multi-tenant para administrar gimnasios de forma simple, centralizada y basada en datos.</p>

  <p>
    <img alt="Estado" src="https://img.shields.io/badge/estado-en%20producci%C3%B3n-08A36A" />
    <img alt="Miembros" src="https://img.shields.io/badge/miembros-450%2B-155EEF" />
    <img alt="Frontend" src="https://img.shields.io/badge/frontend-React%2019-61DAFB" />
    <img alt="Backend" src="https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933" />
    <img alt="Base de datos" src="https://img.shields.io/badge/database-PostgreSQL-4169E1" />
  </p>
</div>

---

## Descripción

GymTactik digitaliza la operación diaria de gimnasios pequeños y medianos. Integra miembros, membresías, asistencia, pagos, analítica, reportes y avisos de vencimiento dentro de una sola plataforma.

El sistema está actualmente **en producción**, gestiona **más de 450 miembros** y utiliza aislamiento multi-tenant para separar los datos de cada gimnasio.

### Enlaces oficiales

| Servicio | Dirección |
|---|---|
| Landing page | [gymtactik.com](https://gymtactik.com) |
| Aplicación administrativa | [app.gymtactik.com](https://app.gymtactik.com) |
| Kiosco por gimnasio | `https://kiosko.gymtactik.com/kiosko/:gymId` |
| API | [gymos-production.up.railway.app](https://gymos-production.up.railway.app) |

> El identificador del kiosco cambia por gimnasio. Por ejemplo: `/kiosko/1`, `/kiosko/2`, etc. Debe utilizarse siempre el `gymId` asignado por la base de datos.

---

## Funcionalidades

- **Dashboard:** indicadores de miembros activos, asistencia, ingresos y alertas.
- **Miembros:** registro, edición, filtros, planes, grupos familiares, notas y estado de membresía.
- **Asistencia:** entradas, salidas, visitantes y registro desde panel administrativo o kiosco.
- **Pagos:** SINPE, efectivo, descuentos, edición controlada e historial mensual.
- **Analítica:** miembros, ingresos, asistencia, distribución por planes y comparativas.
- **Alertas de vencimiento:** identificación de membresías que vencen hoy o en los próximos días.
- **WhatsApp:** preparación de avisos personalizados de vencimiento.
- **Reportes:** pagos, asistencia y cierres de caja exportables en PDF.
- **Lista negra:** bloqueo de miembros con registro del motivo.
- **Kiosco multi-gimnasio:** experiencia de autoservicio filtrada por `gymId`.
- **Multi-tenancy:** datos aislados por gimnasio mediante `gym_id`.

---

## Vista del producto

### Panel administrativo

![Dashboard de GymTactik](./02-dashboard.png)

### Analítica

![Analítica de GymTactik](./03-analitica.png)

### Asistencia

![Control de asistencia](./04-asistencia.png)

### Reportes

![Reportes de GymTactik](./05-reportes.png)

### Registro y avisos por WhatsApp

![Registro de miembros y avisos](./06-registro-whatsapp.png)

---

## Arquitectura

```text
┌─────────────────────────┐       ┌─────────────────────────┐
│ Panel administrativo    │       │ Kiosco por gimnasio     │
│ app.gymtactik.com       │       │ kiosko.gymtactik.com    │
└────────────┬────────────┘       └────────────┬────────────┘
             │ HTTPS                  HTTPS                  │ HTTPS
             └──────────────────┬────────────────────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │ React + Vite            │
                    │ Vercel                  │
                    └────────────┬────────────┘
                                 │ Axios / REST
                                 ▼
                    ┌─────────────────────────┐
                    │ Node.js + Express       │
                    │ Railway                 │
                    └────────────┬────────────┘
                                 │ SSL / Session Pooler
                                 ▼
                    ┌─────────────────────────┐
                    │ PostgreSQL              │
                    │ Supabase                │
                    └─────────────────────────┘
```

### Flujo principal

1. El frontend consume la API mediante Axios.
2. El panel protegido envía un JWT en `Authorization: Bearer <token>`.
3. El backend obtiene `userId`, `gymId` y `role` desde el token.
4. Las consultas protegidas filtran los registros mediante `gym_id`.
5. El kiosco utiliza rutas públicas específicas y recibe el `gymId` asignado al gimnasio.
6. Las fechas operativas utilizan la zona horaria `America/Costa_Rica`.

---

## Tecnologías

### Frontend

| Tecnología | Uso |
|---|---|
| React 19 | Interfaz de usuario |
| Vite 7 | Desarrollo y compilación |
| React Router DOM 7 | Navegación SPA y rutas del kiosco |
| Axios | Cliente HTTP e interceptor JWT |
| jsPDF | Exportación de reportes PDF |

### Backend

| Tecnología | Uso |
|---|---|
| Node.js 22 | Entorno de ejecución |
| Express 4 | API REST |
| PostgreSQL / `pg` | Persistencia y pool de conexiones |
| bcryptjs | Hash de contraseñas |
| jsonwebtoken | Autenticación JWT |
| express-rate-limit | Limitación de solicitudes |
| cors | Lista de orígenes permitidos |

### Infraestructura

| Plataforma | Responsabilidad |
|---|---|
| Vercel | Frontend y dominios personalizados |
| Railway | Backend Node.js |
| Supabase | PostgreSQL administrado |
| GitHub | Código fuente y despliegue continuo |

---

## Estructura del proyecto

```text
GymOs/
├── gymos-backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   ├── migrate.js
│   │   │   ├── migrate_exit.js
│   │   │   └── seed.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── members.js
│   │       ├── payments.js
│   │       ├── attendance.js
│   │       ├── analytics.js
│   │       ├── gyms.js
│   │       └── kiosko.js
│   └── package.json
│
├── gymos-frontend/
│   ├── public/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── AuthContext.jsx
│   │   ├── api.js
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Analytics.jsx
│   │   └── Kiosko.jsx
│   ├── package.json
│   └── vite.config.js
│
├── vercel.json
└── README.md
```

---

## Modelo multi-tenant

Las entidades operativas contienen un `gym_id` que relaciona cada registro con su gimnasio.

| Entidad | Alcance |
|---|---|
| `gyms` | Organización principal |
| `users` | Usuarios administrativos por gimnasio |
| `members` | Miembros aislados por gimnasio |
| `payments` | Pagos aislados por gimnasio |
| `attendance` | Asistencia aislada por gimnasio |

En las rutas administrativas, el backend debe obtener el gimnasio desde el JWT y no confiar en un `gymId` enviado libremente por el navegador.

### Planes de membresía

| Plan | Duración |
|---|---:|
| Día | 1 día |
| Semanal | 7 días |
| Quincenal | 15 días |
| Mensual | 30 días |
| Bimensual | 60 días |

---

## API

**URL base:** `https://gymos-production.up.railway.app/api`

### Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | Público | Iniciar sesión y obtener JWT |
| `GET` | `/auth/me` | JWT | Consultar el perfil autenticado |
| `PUT` | `/auth/password` | JWT | Cambiar la contraseña propia |

### Gimnasios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/gyms/register` | Público/controlado | Registrar un gimnasio |
| `GET` | `/gyms/me` | JWT | Consultar el gimnasio actual |
| `GET` | `/gyms/me/users` | JWT | Listar usuarios del gimnasio |
| `POST` | `/gyms/me/users` | Administrador | Agregar personal |

### Miembros

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/members` | JWT | Listar miembros y calcular su estado |
| `GET` | `/members/alerts` | JWT | Consultar próximos vencimientos |
| `GET` | `/members/:id` | JWT | Consultar detalle e historial |
| `POST` | `/members` | JWT | Registrar miembro |
| `PUT` | `/members/:id` | JWT | Actualizar miembro |
| `PATCH` | `/members/:id/block` | Administrador | Bloquear o desbloquear |
| `DELETE` | `/members/:id` | Administrador | Eliminar miembro |

### Pagos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/payments` | JWT | Consultar historial |
| `POST` | `/payments` | JWT | Registrar pago y extender membresía |
| `PUT` | `/payments/:id` | Administrador | Editar un pago |
| `GET` | `/payments/report` | JWT | Generar datos de cierre de caja |

### Asistencia

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/attendance` | JWT | Consultar asistencia por fecha |
| `POST` | `/attendance` | JWT | Registrar entrada |
| `PATCH` | `/attendance/:id/exit` | JWT | Registrar salida |
| `GET` | `/attendance/stats` | JWT | Consultar estadísticas |

### Kiosco

Estas rutas son públicas para permitir el funcionamiento de la tablet. Todas deben aplicar validación de datos, limitación de solicitudes y aislamiento por gimnasio.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/kiosko/search?q=...&gymId=...` | Buscar por nombre o cédula |
| `GET` | `/kiosko/member?cedula=...&gymId=...` | Consultar un miembro |
| `GET` | `/kiosko/inside?memberId=...&gymId=...` | Verificar una entrada abierta |
| `POST` | `/kiosko/attendance` | Registrar entrada |
| `PATCH` | `/kiosko/attendance/:id/exit` | Registrar salida |
| `POST` | `/kiosko/denied` | Registrar acceso rechazado |

---

## Kiosco de asistencia

El kiosco permite que los miembros registren su entrada o salida desde una tablet ubicada en la recepción.

```text
https://kiosko.gymtactik.com/kiosko/:gymId
```

Ejemplos:

```text
Demo:     https://kiosko.gymtactik.com/kiosko/1
Cliente:  https://kiosko.gymtactik.com/kiosko/2
```

Características:

- Búsqueda por nombre o cédula con debounce.
- Validación del estado de la membresía.
- Entrada para miembros activos.
- Salida para miembros que ya se encuentran dentro.
- Rechazo para membresías vencidas o bloqueadas.
- Registro de intentos denegados.
- Reinicio automático de la interfaz después de cada operación.
- Sincronización con el panel administrativo.

> No se debe calcular manualmente el próximo `gymId`; siempre debe utilizarse el identificador real generado por la base de datos.

---

## Seguridad

- Contraseñas protegidas con bcrypt.
- Sesiones administrativas mediante JWT con expiración.
- Roles `admin` y `staff`.
- Middleware de autenticación para rutas protegidas.
- Operaciones sensibles restringidas a administradores.
- Limitación de intentos de inicio de sesión y solicitudes generales.
- CORS restringido a los dominios oficiales.
- Conexión PostgreSQL mediante SSL.
- Secretos administrados mediante variables de entorno.
- Archivos `.env` excluidos del repositorio.

### Orígenes CORS de producción

```text
https://app.gymtactik.com
https://kiosko.gymtactik.com
```

El dominio anterior de Vercel puede mantenerse temporalmente durante la migración, pero debe retirarse cuando deje de ser necesario.

### Recomendaciones pendientes

- Sustituir el identificador numérico público del kiosco por un token o slug no predecible.
- Aplicar rate limiting específico a búsquedas y registros del kiosco.
- Validar que la asistencia modificada pertenezca al mismo gimnasio solicitado.
- Implementar auditoría para cambios administrativos sensibles.
- Evitar exponer nombres completos o cédulas innecesariamente en endpoints públicos.
- Incorporar rotación de secretos, copias de seguridad y monitoreo de errores.

---

## Variables de entorno

### Backend

Crea `gymos-backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_LARGO_Y_ALEATORIO
PORT=3001
FRONTEND_URL=https://app.gymtactik.com
```

La lista CORS del backend también debe incluir `https://kiosko.gymtactik.com`.

### Frontend

Crea `gymos-frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

En Vercel, configura la variable de producción con la dirección pública de la API.

> Nunca publiques valores reales de `DATABASE_URL`, `JWT_SECRET`, contraseñas, tokens o credenciales de prueba.

---

## Instalación local

### Requisitos

- Node.js 22 o compatible.
- npm.
- PostgreSQL accesible mediante `DATABASE_URL`.

### Backend

```bash
cd gymos-backend
npm install
cp .env.example .env
npm run dev
```

Ejecuta las migraciones únicamente según el procedimiento definido para el proyecto. Evita ejecutarlas directamente contra producción sin una copia de seguridad.

### Frontend

```bash
cd gymos-frontend
npm install
cp .env.example .env
npm run dev
```

Aplicación local:

```text
http://localhost:5173
```

Kiosco local:

```text
http://localhost:5173/kiosko/1
```

### Compilación

```bash
cd gymos-frontend
npm run build
```

Antes de publicar cambios, comprueba que la compilación termine correctamente y que no existan errores en la consola del navegador.

---

## Despliegue

### Frontend — Vercel

- Dominio administrativo: `app.gymtactik.com`.
- Dominio del kiosco: `kiosko.gymtactik.com`.
- Los dos dominios apuntan al mismo proyecto frontend.
- Cada actualización de la rama de producción genera un nuevo despliegue.

### Backend — Railway

- Servicio público: `gymos-production.up.railway.app`.
- Railway despliega automáticamente los cambios del repositorio conectado.
- Las variables sensibles se administran desde el panel de Railway.

### Base de datos — Supabase

- PostgreSQL administrado.
- Conexión desde Railway mediante Session Pooler y SSL.
- Las migraciones deben versionarse y probarse antes de producción.

---

## Flujo de trabajo recomendado

```bash
git checkout -b feat/nombre-del-cambio
git add .
git commit -m "feat: descripción breve"
git push -u origin feat/nombre-del-cambio
```

1. Crear una rama de trabajo.
2. Probar frontend y backend localmente.
3. Abrir un pull request.
4. Revisar el despliegue de vista previa en Vercel.
5. Fusionar en la rama de producción.
6. Verificar Vercel, Railway y los flujos críticos.

### Verificación posterior al despliegue

- Inicio de sesión en `app.gymtactik.com`.
- Consulta y registro de miembros.
- Registro y edición de pagos.
- Entrada y salida desde el panel.
- Kioscos de al menos dos gimnasios diferentes.
- Aislamiento correcto de datos entre gimnasios.
- Exportación de reportes.
- Consola del navegador sin errores CORS.

---

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Estado calculado desde `expires_at` | Evita inconsistencias entre la base de datos y la interfaz |
| Renovación desde la fecha mayor entre vencimiento y hoy | Conserva los días restantes cuando el miembro paga anticipadamente |
| Zona horaria de Costa Rica | Evita registros asignados al día incorrecto por UTC |
| Session Pooler de Supabase | Proporciona compatibilidad de conexión desde Railway |
| Rutas del kiosco por `gymId` | Permite operar múltiples gimnasios desde un mismo frontend |
| Avisos secuenciales de WhatsApp | Reduce bloqueos del navegador al abrir múltiples conversaciones |
| Despliegue continuo | Mantiene Vercel y Railway sincronizados con GitHub |

---

## Hoja de ruta

- [ ] Identificadores públicos seguros para kioscos.
- [ ] Tokens revocables por dispositivo.
- [ ] Auditoría completa de acciones administrativas.
- [ ] Pruebas automatizadas de aislamiento multi-tenant.
- [ ] Monitoreo centralizado de errores y disponibilidad.
- [ ] Copias de seguridad y procedimiento documentado de recuperación.
- [ ] Configuración personalizable por gimnasio.
- [ ] Automatización ampliada de notificaciones.

---

## Estado del producto

GymTactik se encuentra en producción y continúa evolucionando a partir de uso real.

| Indicador | Estado |
|---|---|
| Plataforma | En producción |
| Miembros gestionados | 450+ |
| Arquitectura | SaaS multi-tenant |
| Panel administrativo | Operativo |
| Kiosco de asistencia | Operativo por `gymId` |
| Dominios personalizados | Configurados |

---

## Autoría

Desarrollado por **Kevin Rivera** e **Ignacio Rodríguez**.

© 2026 GymTactik. Todos los derechos reservados.