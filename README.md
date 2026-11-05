# Barber Club - API REST & Base de Datos Local

Proyecto de aplicación web para la gestión administrativa de la barbería MVP Barber Club. El sistema combina el consumo de APIs externas para agendamiento con persistencia de datos local mediante **TypeORM** y **SQLite**, ofreciendo un flujo CRUD completo y arquitectura escalable.

---

## 🛠️ Tecnologías e Infraestructura
- **Backend:** Node.js con Express.
- **Base de Datos Local:** SQLite administrada a través de **TypeORM** (generación de esquemas y tablas sin SQL manual).
- **Frontend:** Interfaz web interactiva estructurada en HTML5/CSS3 y manipulación dinámica del DOM con `fetch` API.
- **Integraciones Externas:** Consumo de la API de Cal.com (servicios y citas) y JSONPlaceholder (clientes de prueba).

---

## 🚀 Endpoints e Interfaz de Aplicaciones (API REST)

### 1. Servicios Externos (Reto 1)
- `GET /servicios`: Consulta y retorna la lista de servicios agendables desde la API de Cal.com.
- `GET /citas`: Obtiene la lista de citas programadas desde la plataforma Cal.com.
- `GET /clientes`: Retorna datos sintéticos de prueba obtenidos desde JSONPlaceholder.

### 2. Persistencia y CRUD Local (Reto 2)
- **Gestión de Servicios Locales (`/servicios-locales`):**
  - `GET /servicios-locales`: Consulta todos los servicios guardados localmente en SQLite.
  - `POST /servicios-locales`: Crea un nuevo servicio local formateando el precio.
  - `PUT /servicios-locales/:id`: Actualiza los datos de un servicio mediante su identificador único.
  - `DELETE /servicios-locales/:id`: Elimina un registro de servicio de la base de datos local.

- **Gestión de Clientes y Reservas (`/clientes-locales`, `/reservas`):**
  - `GET /reservas` / `POST /reservas`: Operaciones de consulta y agendamiento local.
  - `PUT /reservas/:id` / `DELETE /reservas/:id`: Actualización y cancelación de citas guardadas en SQLite.

---

## 📊 Diagrama de Flujo del Sistema

```mermaid
flowchart TD
    subgraph Frontend [Cliente / Navegador]
        UI[Interfaz Web HTML/JS]
        Form[Formulario de Gestión]
    end

    subgraph Backend [Servidor Express.js]
        API_Routes[Rutas API REST /app.js]
        Ctrl_Ext[Controlador APIs Externas]
        Ctrl_Res[Controlador Reservas]
        ORM[TypeORM / AppDataSource]
    end

    subgraph External [Servicios Externos]
        Cal[API Cal.com]
        JSONP[JSONPlaceholder]
    end

    subgraph Database [Persistencia]
        DB[(Base de Datos SQLite / barberia.sqlite)]
    end

    %% Flujos de lectura (GET)
    UI -->|GET /servicios| API_Routes
    UI -->|GET /citas| API_Routes
    UI -->|GET /clientes| API_Routes
    
    API_Routes --> Ctrl_Ext
    Ctrl_Ext -->|Consulta Cal.com| Cal
    Ctrl_Ext -->|Consulta JSONPlaceholder| JSONP

    %% Flujos CRUD Local (POST / PUT / DELETE)
    UI -->|GET/POST/PUT/DELETE /servicios-locales| API_Routes
    UI -->|GET/POST/PUT/DELETE /clientes-locales| API_Routes
    UI -->|POST /reservas| Form
    Form --> API_Routes

    API_Routes --> Ctrl_Res
    API_Routes --> ORM
    
    ORM -->|Guarda / Modifica / Elimina| DB
    DB -->|Retorna Datos SQLite| ORM ```