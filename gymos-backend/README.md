# GymOS Backend API

Backend Node.js + Express + PostgreSQL para el sistema GymOS SaaS.

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)

## Setup en 5 pasos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear proyecto en Supabase
1. Entrá a https://supabase.com y creá una cuenta
2. Nuevo proyecto → anotá la contraseña
3. Settings → Database → Connection string → URI
4. Copiá la URI (se ve así: `postgresql://postgres:[TU-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editá el .env con tu DATABASE_URL de Supabase y un JWT_SECRET seguro
```

Generar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Correr migraciones y seed
```bash
npm run db:migrate   # Crea todas las tablas
npm run db:seed      # Crea un gimnasio demo con usuario admin
```

### 5. Arrancar el servidor
```bash
npm run dev    # Desarrollo (con hot reload)
npm start      # Producción
```

---

## Endpoints

```
POST   /api/gyms/register          Registrar nuevo gimnasio (SaaS)
POST   /api/auth/login             Login → devuelve JWT
GET    /api/auth/me                Perfil del usuario actual

GET    /api/members                Lista de miembros (?search=&status=&plan=)
GET    /api/members/alerts         Alertas de vencimiento
GET    /api/members/:id            Perfil + historial de pagos
POST   /api/members                Registrar miembro
PUT    /api/members/:id            Editar miembro
PATCH  /api/members/:id/block      Bloquear / desbloquear

GET    /api/payments               Historial (?period=day|week|month)
GET    /api/payments/report        Cierre de caja
POST   /api/payments               Registrar pago

GET    /api/attendance             Asistencia (?date=YYYY-MM-DD)
GET    /api/attendance/stats       Estadísticas de la semana
POST   /api/attendance             Registrar entrada

GET    /api/gyms/me                Info del gimnasio
GET    /api/gyms/me/users          Usuarios/staff
POST   /api/gyms/me/users          Crear usuario staff
```

---

## Deploy en Railway

1. Creá cuenta en https://railway.app
2. New Project → Deploy from GitHub → seleccioná este repo
3. Add Variables → copiá las del .env
4. Railway detecta automáticamente que es Node.js y lo despliega

---

## Multi-tenant (SaaS)

Cada gimnasio tiene su propio `gym_id`. Todos los endpoints filtran
automáticamente por `req.user.gymId` extraído del JWT — ningún gimnasio
puede ver datos de otro.

Flujo de onboarding de nuevo cliente:
```
POST /api/gyms/register → crea gym + admin user
POST /api/auth/login    → obtiene JWT con gym_id
Todo lo demás funciona aislado por ese gym_id
```
