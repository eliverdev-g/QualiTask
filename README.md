# QualiTask

Aplicación para gestionar proyectos, tableros, tareas y equipos. Utiliza React y Vite en el frontend, Express en el backend y PostgreSQL como base de datos.

## Requisitos

- Node.js 22.12 o superior. El proyecto también admite Node.js 20.19 o superior dentro de la versión 20.
- pnpm instalado (`npm install -g pnpm`).
- PostgreSQL en ejecución y un usuario con permisos para crear la base de datos, las tablas y la extensión `uuid-ossp`.
- pgAdmin 4 o `psql` para ejecutar SQL.
- Un cliente OAuth web de Google, si se desea habilitar el inicio de sesión y registro con Google.

Ejecuta los comandos de esta guía desde la raíz del proyecto.

## 1. Instalar dependencias

```sh
pnpm install --frozen-lockfile
```

El repositorio incluye [pnpm-lock.yaml](./pnpm-lock.yaml). Si prefieres npm, puedes ejecutar `npm install` y sustituir `pnpm <script>` por `npm run <script>` en los pasos siguientes; utiliza un solo gestor para instalar dependencias.

## 2. Crear la base de datos

En pgAdmin, conéctate a PostgreSQL, abre Query Tool sobre la base `postgres` y ejecuta:

```sql
CREATE DATABASE qualitask_db;
```

Después abre Query Tool **sobre `qualitask_db`** y ejecuta el contenido completo de [server/schema.sql](./server/schema.sql). Este script crea las 9 tablas, las relaciones, los índices y el administrador inicial.

También puedes hacerlo con `psql`, si está disponible en el PATH:

```sh
psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE qualitask_db;"
psql -h localhost -p 5432 -U postgres -d qualitask_db -v ON_ERROR_STOP=1 -f server/schema.sql
```

Si la base ya existe, omite su creación. Los `CREATE TABLE IF NOT EXISTS` conservan las tablas existentes; no actualizan automáticamente sus columnas. Para una instalación anterior que todavía no tenga el estado de proyectos, ejecuta [server/project-status.sql](./server/project-status.sql). El backend también incorpora esa columna al iniciar.

El backend no crea la base de datos ni el esquema completo: deben existir antes de arrancarlo.

## 3. Configurar las variables de entorno

Copia [.env.example](./.env.example) a `.env` en la raíz. En PowerShell:

```powershell
Copy-Item .env.example .env
```

En macOS o Linux:

```sh
cp .env.example .env
```

Configura los valores para tu instalación:

```dotenv
PORT=5000
PGHOST=localhost
PGPORT=5432
PGDATABASE=qualitask_db
PGUSER=postgres
PGPASSWORD=tu_clave_de_postgresql
SESSION_SECRET=coloca_aqui_un_secreto_aleatorio_persistente

# Opcional: ambos deben identificar el mismo cliente web de Google.
VITE_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_ID=
```

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto del backend. El proxy de desarrollo apunta al puerto `5000`. |
| `PGHOST`, `PGPORT` | Dirección y puerto de PostgreSQL. |
| `PGDATABASE` | Base que contiene las tablas de QualiTask. |
| `PGUSER`, `PGPASSWORD` | Credenciales de PostgreSQL. |
| `SESSION_SECRET` | Secreto para firmar las sesiones. Usa un valor aleatorio persistente de al menos 32 caracteres. |
| `VITE_GOOGLE_CLIENT_ID` | Identificador público del cliente OAuth web, utilizado por el frontend. |
| `GOOGLE_CLIENT_ID` | Audiencia que valida el backend. Si se omite, utiliza `VITE_GOOGLE_CLIENT_ID`. |
| `DATABASE_URL` | Alternativa a los parámetros individuales de conexión; por ejemplo, `postgresql://usuario:clave@localhost:5432/qualitask_db`. |

Para generar un secreto de sesión:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Pega el resultado en `SESSION_SECRET`. Sin un secreto persistente, las sesiones dejarán de ser válidas al reiniciar el backend. No subas `.env` al repositorio. El flujo actual de QualiTask no requiere `GEMINI_API_KEY`.

### Configuración opcional de Google

1. Crea un cliente OAuth de tipo **Aplicación web** en tu proyecto de Google Cloud y configura la pantalla de consentimiento.
2. Autoriza el origen del frontend, por ejemplo `http://localhost:3000`. Si utilizas otra dirección o puerto, autoriza ese origen también.
3. Copia el ID del cliente en `VITE_GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_ID`.
4. Reinicia frontend y backend. Si la aplicación de Google está restringida a pruebas, utiliza una cuenta autorizada en esa configuración.

Se utiliza Google Identity Services con una credencial enviada al backend; este flujo no requiere configurar un secreto de cliente en el frontend ni una ruta de redirección en Express. Si no vas a utilizar Google, deja los dos identificadores vacíos y accede con correo y contraseña.

## 4. Iniciar la aplicación

Mantén abiertas dos terminales en la raíz del proyecto.

**Terminal 1 — backend:**

```sh
pnpm server
```

**Terminal 2 — frontend:**

```sh
pnpm dev
```

- Aplicación: [http://localhost:3000](http://localhost:3000).
- Estado del backend: [http://localhost:5000/api/health](http://localhost:5000/api/health).

El frontend envía las solicitudes `/api` al backend mediante el proxy de [vite.config.ts](./vite.config.ts). Si cambias `PORT`, actualiza también el destino del proxy. Usa el origen del frontend para iniciar sesión.

### Primer acceso

El esquema incluye esta cuenta:

| Campo | Valor |
| --- | --- |
| Correo | `admin@qualitask.com` |
| Contraseña inicial | `Admin123$` |
| Rol | `admin` |

La contraseña inicial se almacena como hash scrypt. El INSERT utiliza `ON CONFLICT (email) DO NOTHING`: si ese correo ya existe, conserva sus credenciales, rol y estado actuales.

Los registros nuevos, tanto manuales como con Google, reciben el rol `collaborator`. Desde el menú de usuario, el administrador puede cambiar roles y activar o desactivar cuentas. Desde el menú de proyectos puede inactivar un proyecto y volver a activarlo en **Proyectos inactivos → Activar**.

Los cambios de rol se transmiten a las sesiones abiertas aproximadamente cada segundo. La lista de proyectos se actualiza cada tres segundos. Inactivar un proyecto conserva sus tareas y tableros e impide modificarlos mientras permanezca inactivo.

## 5. Verificar y compilar

| Comando | Función |
| --- | --- |
| `pnpm lint` | Comprueba los tipos de TypeScript. |
| `pnpm test:auth` | Prueba autenticación, roles, sesiones y activación/inactivación de proyectos contra PostgreSQL. |
| `pnpm build` | Genera el frontend en `dist/`. |
| `pnpm preview` | Previsualiza el frontend compilado. |

Las pruebas requieren una base configurada con el esquema completo. Crean datos temporales dentro de una transacción que se revierte al finalizar. No verifican el flujo interactivo de Google con una cuenta real.

La compilación genera únicamente el frontend. Para un despliegue, también se necesita ejecutar el backend y enrutar `/api` hacia Express, incluyendo la conexión SSE de `/api/auth/events`. El proxy configurado en `server.proxy` es para desarrollo; `pnpm preview` no configura por sí solo esa conexión al backend. En producción, las sesiones utilizan cookies seguras y requieren HTTPS.

## Estructura del proyecto

```text
QualiTask/
├── public/                       Recursos estáticos
├── src/
│   ├── components/
│   │   ├── atoms/                Controles y componentes básicos
│   │   ├── molecules/            Componentes de interfaz compuestos
│   │   ├── organisms/            Formularios, navegación y diálogos
│   │   ├── pages/                Tablero y resumen
│   │   └── templates/            Distribución principal
│   ├── services/                 Acceso a la API y caché local
│   ├── types/                    Tipos del frontend
│   ├── App.tsx                   Sesión y sincronización de usuarios
│   └── main.tsx                  Entrada del frontend
├── server/
│   ├── routes/                   API de usuarios, autenticación, proyectos y tareas
│   ├── auth.integration.ts       Pruebas de integración
│   ├── db.ts                     Conexión y actualización del estado de proyectos
│   ├── index.ts                  Entrada del backend
│   ├── security.ts               Sesiones, contraseñas y permisos
│   ├── schema.sql                Esquema completo y administrador inicial
│   └── project-status.sql        Migración de estado de proyectos
├── .env.example                  Plantilla de configuración
├── package.json                  Dependencias y comandos
└── vite.config.ts                Configuración del frontend y proxy de desarrollo
```

## Estructura de la base de datos

El DDL completo, con tipos, valores predeterminados y restricciones, está en [server/schema.sql](./server/schema.sql).

### Tablas y campos

Los identificadores principales son `VARCHAR(50)`, salvo el de `password_resets`, que es `SERIAL`. Las fechas de registro y eventos son `TIMESTAMP WITH TIME ZONE`; las fechas de inicio y vencimiento de tareas son `DATE`.

| Tabla | Clave primaria | Campos restantes |
| --- | --- | --- |
| `users` | `id` | `email`, `full_name`, `role`, `department`, `avatar_url`, `status`, `password_hash`, `google_sub`, `created_at` |
| `password_resets` | `id` | `email`, `token`, `expires_at`, `created_at` |
| `projects` | `id` | `key`, `name`, `description`, `created_by`, `status`, `created_at` |
| `project_members` | `project_id`, `user_id` | `assigned_at` |
| `boards` | `id` | `project_id`, `name`, `created_at` |
| `tasks` | `id` | `project_id`, `board_id`, `title`, `description`, `type`, `priority`, `status`, `assignee_id`, `reporter_id`, `tags`, `start_date`, `due_date`, `qa_notes`, `completed_at`, `created_at`, `updated_at` |
| `subtasks` | `id` | `task_id`, `title`, `completed`, `order_index`, `created_at`, `completed_at` |
| `activity_logs` | `id` | `task_id`, `user_id`, `user_name`, `user_role`, `action`, `details`, `previous_value`, `new_value`, `timestamp` |
| `task_comments` | `id` | `task_id`, `user_id`, `user_name`, `user_role`, `content`, `is_qa_observation`, `created_at` |

### Relaciones

```mermaid
erDiagram
    users ||--o{ password_resets : recupera
    users o|--o{ projects : crea
    users ||--o{ project_members : participa
    projects ||--o{ project_members : incluye
    projects ||--o{ boards : contiene
    projects ||--o{ tasks : agrupa
    boards ||--o{ tasks : organiza
    users o|--o{ tasks : responsable_y_reportero
    tasks ||--o{ subtasks : contiene
    tasks ||--o{ activity_logs : registra
    tasks ||--o{ task_comments : recibe
    users o|--o{ activity_logs : realiza
    users o|--o{ task_comments : escribe
```

| Clave foránea | Referencia | Al eliminar el registro referenciado |
| --- | --- | --- |
| `password_resets.email` | `users.email` | Elimina sus solicitudes de recuperación. |
| `projects.created_by` | `users.id` | Conserva el proyecto y deja el creador en `NULL`. |
| `project_members.project_id`, `project_members.user_id` | `projects.id`, `users.id` | Elimina la membresía. |
| `boards.project_id` | `projects.id` | Elimina los tableros del proyecto. |
| `tasks.project_id`, `tasks.board_id` | `projects.id`, `boards.id` | Elimina las tareas relacionadas. |
| `tasks.assignee_id`, `tasks.reporter_id` | `users.id` | Conserva las tareas y deja la referencia en `NULL`. |
| `subtasks.task_id`, `activity_logs.task_id`, `task_comments.task_id` | `tasks.id` | Elimina los registros dependientes. |
| `activity_logs.user_id`, `task_comments.user_id` | `users.id` | Deja la referencia en `NULL` y conserva el nombre y rol registrados. |

Estas reglas describen eliminaciones físicas en SQL. La opción **Inactivar proyecto** solo modifica su estado; no ejecuta dichas eliminaciones.

### Valores y restricciones

| Campo | Valores permitidos o restricción |
| --- | --- |
| `users.role` | `admin`, `collaborator`; predeterminado: `collaborator`. |
| `users.status`, `projects.status` | `active`, `inactive`; predeterminado: `active`. |
| `tasks.type` | `task`, `bug`, `story`; predeterminado: `task`. |
| `tasks.priority` | `baja`, `media`, `alta`, `critica`; predeterminado: `media`. |
| `tasks.status` | `backlog`, `in_progress`, `in_qa`, `completed`; predeterminado: `backlog`. |
| `users.email`, `users.google_sub`, `projects.key` | Valores únicos; `google_sub` admite `NULL`. |
| `project_members` | Un usuario solo puede tener una membresía por proyecto. |
| `tasks.tags` | Arreglo de texto (`TEXT[]`). |
| `subtasks.completed`, `task_comments.is_qa_observation` | Booleanos; predeterminado: `FALSE`. |

El esquema incluye índices para tareas por tablero/estado, responsable y proyecto; subtareas por tarea/orden; actividades y comentarios por tarea/fecha; y tableros por proyecto.

## Solución de problemas

| Problema | Qué revisar |
| --- | --- |
| No conecta con PostgreSQL | Servicio de PostgreSQL, credenciales, puerto y nombre de base en `.env`. |
| Aparece `relation ... does not exist` | Ejecutar el esquema completo en la misma base configurada en `.env`. |
| El backend falla al actualizar el estado de proyectos | El usuario de conexión debe poder ejecutar `ALTER TABLE projects`, o el propietario debe ejecutar la migración previamente. |
| Fallan las llamadas a `/api` | Mantener el backend en ejecución y comprobar que su puerto coincide con el proxy de Vite. |
| Google no aparece o rechaza el acceso | Cliente web, origen autorizado, cuentas permitidas y coincidencia de ambos identificadores. Reiniciar tras cambiar las variables. |
| El administrador inicial no permite entrar | Verificar si el correo ya existía: volver a ejecutar el esquema no sustituye su contraseña ni reactiva su cuenta. |
| La sesión caduca al reiniciar | Configurar un `SESSION_SECRET` persistente y volver a iniciar sesión. |

La recuperación de contraseña actual devuelve el código temporal en la respuesta del servidor, con vigencia de 15 minutos. No tiene un servicio de envío de correo integrado; ese flujo debe adaptarse antes de publicar la aplicación para usuarios externos.

