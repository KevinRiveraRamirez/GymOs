# 💪 GymOS — Sistema de Administración de Gimnasio (SaaS)

> Sistema web multi-tenant para digitalizar la gestión de gimnasios pequeños y medianos.  
> Stack: **React + Node.js + Express + PostgreSQL (Supabase)**

🌐 **Producción:** https://gym-os-qtw7.vercel.app  
⚙️ **API:** https://gymos-production.up.railway.app  
📱 **Kiosko tablet:** https://gym-os-qtw7.vercel.app/kiosko/:gymId

---

## 📋 Índice

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Tecnologías](#tecnologías)
4. [Estructura de carpetas](#estructura-de-carpetas)
5. [Base de datos](#base-de-datos)
6. [API — Endpoints](#api--endpoints)
7. [Frontend — Módulos](#frontend--módulos)
8. [Pantalla Kiosko](#pantalla-kiosko)
9. [Autenticación y Seguridad](#autenticación-y-seguridad)
10. [Variables de entorno](#variables-de-entorno)
11. [Instalación local](#instalación-local)
12. [Despliegue en producción](#despliegue-en-producción)
13. [Flujo Git → Producción](#flujo-git--producción)
14. [Modelo SaaS y multi-tenancy](#modelo-saas-y-multi-tenancy)
15. [Decisiones técnicas](#decisiones-técnicas)

---

## Descripción general

GymOS permite a los administradores de gimnasios gestionar:

- **Miembros** — registro, edición, bloqueo, eliminación con 5 planes disponibles
- **Asistencia** — control de entrada y salida diaria desde el panel admin o desde la tablet kiosko
- **Pagos** — registro de SINPE y Efectivo con descuentos configurables
- **Cierre de caja** — reportes por día, semana y mes descargables en PDF
- **Alertas** — notificaciones de membresías próximas a vencer (≤3 días) con envío por WhatsApp
- **Lista negra** — bloqueo de miembros con registro de razón
- **Kiosko tablet** — pantalla dedicada para que los miembros marquen su propia asistencia

El sistema es **multi-tenant**: cada gimnasio tiene sus datos completamente aislados mediante `gym_id` en todas las tablas.

---

## Arquitectura

```
Tablet Kiosko ──────────────────────────────────────────┐
                                                         │
Navegador (Admin) ──► React Frontend (Vercel) ──► Node.js + Express (Railway)
                                                         │
                                                         ▼
                                               PostgreSQL (Supabase)
                                               Session Pooler — SSL
```

- El frontend se comunica con el backend vía `axios` con interceptor JWT automático
- El backend se conecta a Supabase usando el **Session Pooler** para compatibilidad IPv4
- Toda autenticación es por **JWT** firmado con `JWT_SECRET` (expiración 8h)
- El kiosko usa endpoints públicos sin JWT, filtrados por `gymId` en la URL

---

## Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 19 | Biblioteca principal de UI |
| Vite | 7 | Bundler y servidor de desarrollo |
| React Router DOM | 7 | Rutas SPA (Login, Dashboard, Kiosko) |
| Axios | 1.13 | Cliente HTTP con interceptor JWT |
| jsPDF | 2.5 | Generación de PDFs de cierre de caja en el cliente |

### Backend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | 22 | Runtime |
| Express | 4 | Framework web API REST |
| bcryptjs | — | Hash de contraseñas (12 rounds) |
| jsonwebtoken | — | JWT generación y verificación |
| pg | — | Cliente PostgreSQL con pool de conexiones |
| express-rate-limit | — | Protección fuerza bruta en login |
| cors | — | Whitelist de dominios permitidos |

### Infraestructura
| Servicio | Plan | Uso |
|---------|------|-----|
| Supabase | Gratuito (500MB) | PostgreSQL en la nube |
| Railway | Hobby | Hosting del backend Node.js |
| Vercel | Hobby | Hosting del frontend React |
| GitHub | Público | Control de versiones |

---

## Estructura de carpetas

```
GymOs/
├── gymos-backend/
│   ├── src/
│   │   ├── index.js              # Servidor Express — middlewares y rutas
│   │   ├── db/
│   │   │   ├── pool.js           # Conexión PostgreSQL con SSL
│   │   │   ├── migrate.js        # Crea las 5 tablas del sistema
│   │   │   ├── migrate_exit.js   # Agrega columna exit_at a attendance
│   │   │   └── seed.js           # Datos de prueba
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verification + adminOnly
│   │   └── routes/
│   │       ├── auth.js           # Login, perfil, contraseña
│   │       ├── members.js        # CRUD miembros + alertas
│   │       ├── payments.js       # Pagos + cierre de caja
│   │       ├── attendance.js     # Asistencia + estadísticas
│   │       ├── gyms.js           # Registro SaaS + staff
│   │       └── kiosko.js         # Endpoints públicos para tablet kiosko
│   └── package.json
│
├── gymos-frontend/
│   ├── src/
│   │   ├── main.jsx              # Punto de entrada React
│   │   ├── App.jsx               # Router: Login / Dashboard / Kiosko
│   │   ├── AuthContext.jsx       # Contexto de autenticación global
│   │   ├── api.js                # Axios con interceptor JWT
│   │   ├── Login.jsx             # Pantalla de login
│   │   ├── Dashboard.jsx         # UI completa del panel admin
│   │   └── Kiosko.jsx            # Pantalla tablet de asistencia
│   ├── dist/                     # Build de producción (generado con npm run build)
│   └── package.json
│
├── vercel.json                   # Config Vercel — outputDirectory + rewrites SPA
└── README.md
```

---

## Base de datos

### `gyms` — Gimnasios registrados
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| name | VARCHAR | Nombre del gimnasio |
| slug | VARCHAR | Identificador URL-friendly |
| owner_name | VARCHAR | Nombre del dueño |
| owner_email | VARCHAR | Email del dueño |
| country_code | VARCHAR | Código de país (CR) |
| plan | VARCHAR | Plan SaaS contratado |
| active | BOOLEAN | Si el gimnasio está activo |
| created_at | TIMESTAMP | Fecha de registro |

### `users` — Usuarios con acceso al sistema
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| name | VARCHAR | Nombre del usuario |
| email | VARCHAR UNIQUE | Email de login |
| password | VARCHAR | Contraseña hasheada (bcrypt 12 rounds) |
| role | VARCHAR | `admin` o `staff` |
| active | BOOLEAN | Si el usuario está activo |
| last_login | TIMESTAMP | Último inicio de sesión |

### `members` — Miembros del gimnasio
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| cedula | VARCHAR | Número de cédula (único por gym) |
| name | VARCHAR | Nombre completo |
| phone | VARCHAR | Teléfono (para WhatsApp) |
| plan | VARCHAR | `Día`, `Semanal`, `Quincenal`, `Mensual`, `Bimensual` |
| status | VARCHAR | `active` o `inactive` |
| joined_at | DATE | **Fecha de ingreso editable por el admin** |
| expires_at | DATE | Vencimiento calculado automáticamente desde joined_at + días del plan |
| blocked | BOOLEAN | Si está en lista negra |
| blacklist_reason | VARCHAR | Razón del bloqueo |
| family_group | VARCHAR | Grupo familiar (opcional) |
| notes | TEXT | Notas internas |

### `payments` — Registro de pagos
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

### `attendance` — Control de asistencia
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| gym_id | INTEGER FK | Gimnasio al que pertenece |
| member_id | INTEGER FK | Miembro (null si es visitante) |
| member_name | VARCHAR | Nombre |
| plan | VARCHAR | Plan al momento de entrada |
| type | VARCHAR | `member` o `visitor` |
| attended_at | TIMESTAMP | Timestamp de entrada |
| exit_at | TIMESTAMP | Timestamp de salida (nullable — null = dentro) |
| date | DATE | Fecha del día (para filtros) |
| created_by | INTEGER FK | Usuario que marcó (null si fue desde kiosko) |

---

## API — Endpoints

**Base URL:** `https://gymos-production.up.railway.app/api`

### Autenticación
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login con email + password → JWT |
| GET | `/auth/me` | JWT | Perfil del usuario autenticado |
| PUT | `/auth/password` | JWT | Cambiar contraseña propia |

### Gimnasios
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/gyms/register` | — | Registrar nuevo gimnasio (SaaS) |
| GET | `/gyms/me` | JWT | Info del gimnasio actual |
| GET | `/gyms/me/users` | JWT | Usuarios/staff del gimnasio |
| POST | `/gyms/me/users` | Admin | Agregar staff |

### Miembros
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/members` | JWT | Listar miembros (filtros: search, status, plan) |
| GET | `/members/alerts` | JWT | Miembros próximos a vencer (≤3 días) |
| GET | `/members/:id` | JWT | Detalle + historial pagos y asistencia |
| POST | `/members` | JWT | Registrar nuevo miembro |
| PUT | `/members/:id` | JWT | Editar miembro (incluye fecha de ingreso y plan) |
| PATCH | `/members/:id/block` | Admin | Bloquear / desbloquear |
| DELETE | `/members/:id` | Admin | Eliminar miembro |

### Pagos
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/payments` | JWT | Historial de pagos |
| POST | `/payments` | JWT | Registrar pago — extiende vencimiento automáticamente |
| GET | `/payments/report` | JWT | Cierre de caja `?period=day/week/month` |

### Asistencia
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/attendance` | JWT | Asistencia del día `?date=YYYY-MM-DD` |
| POST | `/attendance` | JWT | Registrar entrada desde panel admin |
| PATCH | `/attendance/:id/exit` | JWT | Registrar salida desde panel admin |
| GET | `/attendance/stats` | JWT | Estadísticas de la semana |

### Kiosko (público — sin JWT)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/kiosko/search?q=...&gymId=...` | Búsqueda en tiempo real por nombre o cédula |
| GET | `/kiosko/inside?memberId=...&gymId=...` | Verifica si el miembro ya está dentro |
| POST | `/kiosko/attendance` | Registrar entrada desde tablet |
| PATCH | `/kiosko/attendance/:id/exit` | Registrar salida desde tablet |

---

## Frontend — Módulos

### Pestañas del panel admin
| Pestaña | Descripción |
|---------|-------------|
| Dashboard | Resumen en tiempo real — actualización cada 3 segundos |
| Miembros | Lista filtrable por nombre, cédula, estado y plan |
| Asistencia | Control de entrada/salida del día |
| Pagos | Historial del mes + cierre de caja PDF |
| Lista Negra | Miembros bloqueados con razón |

### Componentes principales
| Componente | Descripción |
|-----------|-------------|
| `Dashboard` | Componente raíz — maneja todo el estado global |
| `MemberModal` | Registro/edición con fecha de ingreso y 5 planes |
| `AttendanceModal` | Control de entrada y salida con búsqueda |
| `PaymentModal` | Registro de pagos con montos sugeridos y descuentos |
| `CashReportModal` | Cierre de caja con descarga PDF (jsPDF) |
| `AlertListModal` | Alertas de vencimiento con envío masivo WhatsApp |
| `Avatar` | Avatar con iniciales y color determinístico |
| `PlanTag` | Badge de plan con color por tipo |
| `StatusBadge` | Badge de estado (Activo/Vencido/Inactivo/Bloqueado) |

### Planes disponibles
| Plan | Días | Color |
|------|------|-------|
| Día | 1 | Naranja |
| Semanal | 7 | Celeste |
| Quincenal | 15 | Verde |
| Mensual | 30 | Índigo |
| Bimensual | 60 | Violeta |

---

## Pantalla Kiosko

Pantalla dedicada para tablet en la entrada del gimnasio. Los miembros marcan su propia asistencia sin acceso al panel admin.

**URL:** `https://gym-os-qtw7.vercel.app/kiosko/:gymId`

- Cada gimnasio tiene su propia URL con su `gymId`
- Búsqueda en tiempo real por **nombre o cédula** con debounce de 300ms
- Muestra plan y estado del miembro al seleccionarlo
- **Activo** → puede marcar entrada (verde) o salida (naranja) según corresponda
- **Vencido** → muestra mensaje de pago requerido, sin botón de entrada
- **Bloqueado** → muestra mensaje de acceso restringido
- Vuelve automáticamente a la pantalla inicial después de 4 segundos
- No requiere JWT — endpoints públicos filtrados por gymId
- La asistencia marcada desde el kiosko aparece en el panel admin en ~3 segundos

---

## Autenticación y Seguridad

| Mecanismo | Descripción |
|-----------|-------------|
| JWT (8h) | Token firmado con JWT_SECRET, guardado en localStorage |
| bcrypt (12 rounds) | Hash seguro de contraseñas |
| AuthContext | Contexto global que expone user, login(), logout() |
| Interceptor Axios | Agrega Authorization: Bearer automáticamente |
| Middleware auth.js | Verifica JWT, extrae userId/gymId/role |
| adminOnly | Bloquea operaciones sensibles a usuarios staff |
| Rate limiting login | Máx 20 intentos cada 15 minutos |
| Rate limiting general | Máx 300 requests/minuto por IP |
| CORS whitelist | Solo acepta gym-os-qtw7.vercel.app y localhost:5173 |
| trust proxy | Configurado para Railway (proxy reverso) |

---

## Variables de entorno

### Backend — `gymos-backend/.env`
```env
DATABASE_URL=postgresql://postgres.XXXX:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=clave_secreta_muy_larga_y_aleatoria
PORT=3001
FRONTEND_URL=https://gym-os-qtw7.vercel.app
```

### Frontend — `gymos-frontend/.env`
```env
VITE_API_URL=https://gymos-production.up.railway.app/api
```

> ⚠️ **IMPORTANTE:** Los archivos `.env` están en `.gitignore` y nunca deben subirse al repositorio. Las variables de producción se configuran en Railway (backend) y están embebidas en el build de Vite (frontend).

---

## Instalación local

### Requisitos
- Node.js v18+
- Cuenta en [Supabase](https://supabase.com)

### Backend
```bash
cd gymos-backend
npm install

# Crear archivo .env con DATABASE_URL y JWT_SECRET
# Crear tablas
node src/db/migrate.js
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

# Crear archivo .env con VITE_API_URL=http://localhost:3001/api
npm run dev
```

### Credenciales de prueba
```
URL:      http://localhost:5173
Email:    admin@gymos.com
Password: admin123
Kiosko:   http://localhost:5173/kiosko/1
```

---

## Despliegue en producción

| Componente | Plataforma | URL |
|-----------|-----------|-----|
| Backend | Railway | gymos-production.up.railway.app |
| Frontend | Vercel | gym-os-qtw7.vercel.app |
| Base de datos | Supabase | aws-1-us-east-1.pooler.supabase.com |

### Variables en Railway
Configurar en el panel de Railway → Variables:
- `DATABASE_URL` — Session Pooler de Supabase
- `JWT_SECRET` — clave secreta
- `FRONTEND_URL` — URL de Vercel

### vercel.json (raíz del proyecto)
```json
{
  "buildCommand": "ls",
  "outputDirectory": "gymos-frontend/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Flujo Git → Producción

### Cambios en el backend
```bash
# Editás código en gymos-backend/src/
git add gymos-backend/
git commit -m "feat: descripción"
git push
# Railway redesplega automáticamente en ~2 minutos
```

### Cambios en el frontend
```bash
# Editás código en gymos-frontend/src/
cd gymos-frontend
npm run build          # Compilar dist
cd ..
git add .
git commit -m "feat: descripción"
git push
# Vercel redesplega automáticamente en ~1 minuto
```

---

## Modelo SaaS y multi-tenancy

Cada gimnasio se registra y recibe su propio `gym_id`. **Todas** las tablas tienen `gym_id` obligatorio y todos los queries filtran por él — el `gym_id` se extrae del JWT (no del request del cliente).

```
gym A (gym_id=1) ──► solo ve sus members, payments, attendance
gym B (gym_id=2) ──► solo ve sus members, payments, attendance
```

### Capacidad estimada
| Plan Supabase | Storage | Filas aprox. | Gymnasios aprox. |
|--------------|---------|-------------|-----------------|
| Gratuito | 500 MB | ~500,000 | ~15 gyms activos |
| Pro ($25/mes) | 8 GB | Millones | Cientos de gyms |

---

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| 5 planes (Día/Semanal/Quincenal/Mensual/Bimensual) | Cubre el 100% de modelos de gimnasios pequeños en CR |
| Fecha de ingreso editable | Permite migrar miembros existentes con sus fechas reales |
| Al pagar: `GREATEST(expires_at, HOY) + días` | El miembro no pierde días si paga antes de vencer |
| `paid_at` como `DATE` zona CR | Evita bugs de UTC al filtrar pagos del día |
| `TO_CHAR(expires_at, 'YYYY-MM-DD')` | Supabase devuelve timestamps completos; string limpio evita comparaciones incorrectas |
| `exit_at` nullable | `exit_at IS NULL` = miembro dentro del gym en tiempo real |
| Kiosko sin JWT | La tablet no necesita login — filtrado por gymId en URL |
| URL dinámica `/kiosko/:gymId` | Cada gym tiene su propio kiosko, datos aislados |
| Actualización cada 3s en panel admin | Refleja casi instantáneamente las entradas del kiosko |
| jsPDF en el cliente | Sin dependencia de servidor para PDFs |
| WhatsApp via `wa.me` | Sin API de pago, mensaje pre-escrito directo al teléfono |
| dist compilado en Git | Workaround para Vercel con monorepo |
| Session Pooler Supabase | Railway usa IPv4 — Direct connection no compatible sin add-on |
| trust proxy en Railway | Necesario para express-rate-limit con proxy reverso |

---

*GymOS v1.0 — Desarrollado por Kevin Rivera | Marzo 2026*