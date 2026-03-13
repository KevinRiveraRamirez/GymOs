# 🏋️ GymOS — Sistema de Administración de Gimnasio (SaaS)

> Sistema web multi-tenant para digitalizar la gestión de gimnasios pequeños y medianos.  
> Stack: **React + Node.js + Express + PostgreSQL (Supabase)**

---

## 📋 Índice

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Estructura de carpetas](#estructura-de-carpetas)
4. [Base de datos](#base-de-datos)
5. [API — Endpoints](#api--endpoints)
6. [Frontend — Módulos](#frontend--módulos)
7. [Autenticación](#autenticación)
8. [Variables de entorno](#variables-de-entorno)
9. [Instalación local](#instalación-local)
10. [Despliegue en producción](#despliegue-en-producción)
11. [Modelo SaaS y multi-tenancy](#modelo-saas-y-multi-tenancy)
12. [Decisiones técnicas](#decisiones-técnicas)

---

## Descripción general

GymOS permite a los administradores de gimnasios gestionar:
- **Miembros** — registro, edición, bloqueo, eliminación
- **Asistencia** — control de entrada y salida diaria
- **Pagos** — registro de SINPE y Efectivo con descuentos
- **Cierre de caja** — reportes por día, semana y mes descargables en PDF
- **Alertas** — notificaciones de membresías próximas a vencer con envío por WhatsApp

El sistema es **multi-tenant**: cada gimnasio tiene sus datos completamente aislados mediante `gym_id` en todas las tablas.

---

## Arquitectura

```
Cliente (navegador)
        │
        ▼
React Frontend (Vite)  ─────────────►  Node.js + Express API
     puerto 5173                              puerto 3001
                                                   │
                                                   ▼
                                         PostgreSQL (Supabase)
                                         Session Pooler — SSL
```

- El frontend se comunica con el backend vía `axios` apuntando a `http://localhost:3001/api`
- El backend se conecta a Supabase usando el **Session Pooler** con SSL habilitado
- Toda autenticación es por **JWT** firmado con `JWT_SECRET`

---

## Estructura de carpetas

```
gymos-backend/
├── src/
│   ├── index.js                  # Servidor Express principal
│   ├── db/
│   │   ├── pool.js               # Conexión PostgreSQL con SSL
│   │   ├── migrate.js            # Crea las 5 tablas del sistema
│   │   ├── migrate_exit.js       # Agrega columna exit_at a attendance
│   │   └── seed.js               # Datos de prueba (gym + admin + miembros)
│   ├── middleware/
│   │   └── auth.js               # Verificación JWT + middleware adminOnly
│   └── routes/
│       ├── auth.js               # Login, perfil, cambio de contraseña
│       ├── members.js            # CRUD miembros + alertas
│       ├── payments.js           # Pagos + reporte de cierre de caja
│       ├── attendance.js         # Asistencia diaria + estadísticas
│       └── gyms.js               # Registro SaaS + gestión de staff
│
gymos-frontend/
└── src/
    ├── main.jsx                  # Punto de entrada React
    ├── App.jsx                   # Router principal (Login / Dashboard)
    ├── AuthContext.jsx           # Contexto de autenticación global
    ├── api.js                    # Instancia axios con interceptor JWT
    └── Dashboard.jsx             # Toda la UI del sistema (componente principal)
```

---

## Base de datos

### Tablas

#### `gyms`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| name | VARCHAR | Nombre del gimnasio |
| email | VARCHAR UNIQUE | Email de contacto |
| created_at | TIMESTAMP | Fecha de registro |

#### `users`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| email | VARCHAR UNIQUE | Email de login |
| password_hash | VARCHAR | Contraseña hasheada con bcrypt |
| role | VARCHAR | `admin` o `staff` |
| name | VARCHAR | Nombre del usuario |

#### `members`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| cedula | VARCHAR | Número de cédula (único por gym) |
| name | VARCHAR | Nombre completo |
| phone | VARCHAR | Teléfono (para WhatsApp) |
| plan | VARCHAR | `Mensual`, `Semanal`, o `Día` |
| status | VARCHAR | `active` o `inactive` |
| expires_at | DATE | Fecha de vencimiento del plan |
| joined_at | TIMESTAMP | Fecha de ingreso |
| blocked | BOOLEAN | Si está en lista negra |
| blacklist_reason | VARCHAR | Razón del bloqueo |
| family_group | VARCHAR | Grupo familiar (opcional) |
| notes | TEXT | Notas internas |

#### `payments`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| member_id | INTEGER FK | Miembro que pagó |
| member_name | VARCHAR | Nombre (copia para histórico) |
| plan | VARCHAR | Plan pagado |
| amount | NUMERIC | Monto cobrado |
| method | VARCHAR | `SINPE` o `Efectivo` |
| discount | INTEGER | Porcentaje de descuento aplicado |
| type | VARCHAR | `member` o `visitor` |
| paid_at | DATE | Fecha del pago (zona horaria CR) |
| created_by | INTEGER FK | Usuario que registró el pago |

#### `attendance`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| member_id | INTEGER FK | Miembro (null si es visitante) |
| member_name | VARCHAR | Nombre |
| plan | VARCHAR | Plan al momento de entrada |
| type | VARCHAR | `member` o `visitor` |
| attended_at | TIMESTAMP | Timestamp de entrada |
| exit_at | TIMESTAMP | Timestamp de salida (nullable) |
| date | DATE | Fecha del día (para filtros) |
| created_by | INTEGER FK | Usuario que marcó la entrada |

---

## API — Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login con email + password → JWT |
| GET | `/api/auth/me` | Perfil del usuario autenticado |
| PUT | `/api/auth/password` | Cambiar contraseña |

### Gimnasios
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/gyms/register` | Registrar nuevo gimnasio (SaaS) |
| GET | `/api/gyms/me` | Info del gimnasio actual |
| GET | `/api/gyms/me/users` | Usuarios/staff del gimnasio |
| POST | `/api/gyms/me/users` | Agregar staff |

### Miembros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/members` | Listar miembros (filtros: search, status, plan) |
| GET | `/api/members/alerts` | Miembros próximos a vencer (≤3 días, excluye plan Día) |
| GET | `/api/members/:id` | Detalle + historial de pagos y asistencia |
| POST | `/api/members` | Registrar nuevo miembro |
| PUT | `/api/members/:id` | Editar datos del miembro |
| PATCH | `/api/members/:id/block` | Bloquear / desbloquear (solo admin) |
| DELETE | `/api/members/:id` | Eliminar miembro (solo admin) |

### Pagos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/payments` | Historial de pagos |
| POST | `/api/payments` | Registrar pago |
| GET | `/api/payments/report` | Cierre de caja por `?period=day/week/month` |

**Nota sobre timezone:** El campo `paid_at` se inserta como `(NOW() AT TIME ZONE 'America/Costa_Rica')::date` para evitar desfases UTC.

### Asistencia
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/attendance` | Asistencia del día (`?date=YYYY-MM-DD`) |
| POST | `/api/attendance` | Registrar entrada |
| PATCH | `/api/attendance/:id/exit` | Registrar salida |
| GET | `/api/attendance/stats` | Estadísticas de la semana |

---

## Frontend — Módulos

El frontend vive casi en su totalidad en `Dashboard.jsx`. Los componentes principales son:

| Componente | Descripción |
|-----------|-------------|
| `Dashboard` | Componente raíz — maneja todo el estado global |
| `AttendanceModal` | Control de entrada y salida de miembros |
| `PaymentModal` | Registro de pagos con descuentos |
| `MemberModal` | Formulario de registro / edición de miembro |
| `CashReportModal` | Cierre de caja con descarga PDF (jsPDF) |
| `AlertListModal` | Lista de miembros por vencer con envío WhatsApp |
| `MemberSearch` | Buscador con debounce para seleccionar miembros |
| `Modal` | Componente base de modal reutilizable |
| `Btn` | Botón con variantes (green, ghost, etc.) |
| `Avatar` | Avatar con iniciales y color determinístico |
| `PlanTag` | Badge de plan con color por tipo |
| `StatusBadge` | Badge de estado activo/inactivo/vencido |

### Pestañas del sistema
- **Dashboard** — Resumen en tiempo real (actualización cada 30s)
- **Miembros** — Lista filtrable con búsqueda
- **Asistencia** — Control de entrada/salida del día
- **Pagos** — Historial del mes + cierre de caja
- **Lista Negra** — Miembros bloqueados

---

## Autenticación

- Login devuelve un **JWT** que se guarda en `localStorage`
- `AuthContext.jsx` expone `user`, `login()`, `logout()`
- `api.js` usa un interceptor de axios que adjunta `Authorization: Bearer <token>` en cada request
- El backend valida el token en el middleware `auth.js` y extrae `userId`, `gymId`, y `role`
- El middleware `adminOnly` bloquea operaciones sensibles (bloquear, eliminar) a usuarios con rol `staff`

---

## Variables de entorno

### Backend — `.env`
```env
DATABASE_URL=postgresql://postgres.XXXX:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=tu_clave_secreta_muy_larga
PORT=3001
```

### Frontend — `.env`
```env
VITE_API_URL=http://localhost:3001/api
```

---

## Instalación local

### Requisitos
- Node.js v18+
- Cuenta en [Supabase](https://supabase.com)

### Backend
```bash
cd gymos-backend
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET

# Crear tablas
node src/db/migrate.js

# Agregar columna exit_at (si no existe)
node src/db/migrate_exit.js

# Datos de prueba (opcional)
node src/db/seed.js

# Iniciar servidor
npm run dev
```

### Frontend
```bash
cd gymos-frontend
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar VITE_API_URL si el backend corre en otro puerto

npm run dev
```

### Credenciales de prueba
```
Email:    admin@gymos.com
Password: admin123
```

---

## Despliegue en producción

### Backend — opciones recomendadas
- **Railway** — conectá el repo, agregá las env vars, deploy automático
- **Render** — plan gratuito disponible, igual de simple
- **VPS (DigitalOcean/Hetzner)** — más control, desde $5/mes

### Frontend — opciones recomendadas
- **Vercel** — ideal para Vite/React, deploy en segundos desde Git
- **Netlify** — igual de simple

### Pasos básicos para producción
1. Subir backend a Railway o Render
2. Actualizar `VITE_API_URL` en el frontend con la URL del backend desplegado
3. Subir frontend a Vercel
4. Configurar CORS en el backend para aceptar el dominio de Vercel

---

## Modelo SaaS y multi-tenancy

Cada gimnasio se registra via `POST /api/gyms/register` y recibe su propio `gym_id`. **Todas** las tablas tienen `gym_id` como columna obligatoria y todos los queries filtran por él.

```
gym A (gym_id=1) ──► solo ve sus members, payments, attendance
gym B (gym_id=2) ──► solo ve sus members, payments, attendance
```

Es imposible que un gimnasio acceda a datos de otro porque el `gym_id` se extrae del JWT (no del request del cliente) en el middleware de autenticación.

### Capacidad estimada (Supabase plan gratuito)
| Plan Supabase | Storage | Filas aprox. | Gimnasios aprox. |
|--------------|---------|-------------|-----------------|
| Gratuito | 500 MB | ~500,000 | ~15 gyms activos |
| Pro ($25/mes) | 8 GB | Millones | Cientos de gyms |

---

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| Solo SINPE y Efectivo | Mercado CR, sin necesidad de datafono |
| Planes: Mensual / Semanal / Día | Cubre el 95% de gimnasios pequeños en CR |
| Montos editables manualmente | Flexibilidad para descuentos y casos especiales |
| `paid_at` como `DATE` con zona CR | Evita bugs de UTC al filtrar pagos del día |
| `TO_CHAR(expires_at, 'YYYY-MM-DD')` | Supabase devuelve timestamps completos; el string limpio permite comparaciones exactas |
| `exit_at` nullable en attendance | Permite saber quién está dentro del gym en tiempo real |
| jsPDF para reportes | Sin dependencia de servidor para generar PDFs, descarga directa en el cliente |
| Alertas solo para Mensual y Semanal | Plan Día no necesita avisos de vencimiento |
| WhatsApp via `wa.me` | Sin API de pago, abre directo en el teléfono del admin |

---

*GymOS — Desarrollado con Node.js, React y Supabase*
