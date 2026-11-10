-- Cuentas de relavops. Fechas en milisegundos desde 1970 (Date.now()). Días en AAAA-MM-DD, en UTC.

-- Usuarios. El nombre es único sin mirar mayúsculas (nombre_min). El correo es opcional para
-- los alumnos que entran con el código de una clase o que crea un profe.
CREATE TABLE usuarios (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  nombre_min    TEXT NOT NULL UNIQUE,
  correo        TEXT UNIQUE,
  clave         TEXT NOT NULL,                      -- pbkdf2-sha256$vueltas$sal$hash
  rol           TEXT NOT NULL DEFAULT 'alumno' CHECK (rol IN ('alumno', 'profe', 'admin')),
  estado        TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'bloqueado')),
  correo_ok     INTEGER NOT NULL DEFAULT 0,
  pide_profe    INTEGER NOT NULL DEFAULT 0,         -- quiere ser profe y espera a un admin
  origen        TEXT NOT NULL DEFAULT 'libre',      -- libre, clase, profe o creado (por un profe)
  creado        INTEGER NOT NULL,
  ultimo_acceso INTEGER,
  entradas      INTEGER NOT NULL DEFAULT 0,
  pais          TEXT
);
CREATE INDEX usuarios_creado ON usuarios (creado);
CREATE INDEX usuarios_acceso ON usuarios (ultimo_acceso);
CREATE INDEX usuarios_rol ON usuarios (rol);

-- Sesiones abiertas. El id es el sha256 del valor de la cookie, así una copia de la base no sirve para entrar.
CREATE TABLE sesiones (
  id      TEXT PRIMARY KEY,
  usuario TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  creada  INTEGER NOT NULL,
  vista   INTEGER NOT NULL,
  caduca  INTEGER NOT NULL,
  dura    INTEGER NOT NULL,                         -- lo que se alarga al usarla
  ip      TEXT,
  agente  TEXT,
  pais    TEXT
);
CREATE INDEX sesiones_usuario ON sesiones (usuario);
CREATE INDEX sesiones_caduca ON sesiones (caduca);

-- Clases de un profe. El código es lo que reparte a sus alumnos.
CREATE TABLE clases (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  codigo      TEXT NOT NULL UNIQUE,
  profe       TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  abierta     INTEGER NOT NULL DEFAULT 1,           -- acepta alumnos nuevos con el código
  creada      INTEGER NOT NULL
);
CREATE INDEX clases_profe ON clases (profe);

CREATE TABLE miembros (
  clase   TEXT NOT NULL REFERENCES clases (id) ON DELETE CASCADE,
  usuario TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  unido   INTEGER NOT NULL,
  PRIMARY KEY (clase, usuario)
);
CREATE INDEX miembros_usuario ON miembros (usuario);

-- El progreso del curso. Es el mismo JSON que guarda el navegador, mezclado entre dispositivos.
CREATE TABLE progreso (
  usuario     TEXT PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  datos       TEXT NOT NULL,
  xp          INTEGER NOT NULL DEFAULT 0,
  modulos     INTEGER NOT NULL DEFAULT 0,           -- módulos con el boss vencido
  actualizado INTEGER NOT NULL
);

-- Un día por usuario con actividad. De aquí salen los activos por día, semana y mes.
CREATE TABLE dias_activos (
  dia     TEXT NOT NULL,
  usuario TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  PRIMARY KEY (dia, usuario)
);

-- Enlaces de un solo uso que van por correo (confirmar el correo, cambiar la contraseña).
CREATE TABLE tokens (
  id      TEXT PRIMARY KEY,                         -- sha256 del token
  usuario TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('verificar', 'recuperar')),
  caduca  INTEGER NOT NULL
);

-- Servidores de labs (labd). Cada uno manda un latido con su foto del momento.
CREATE TABLE nodos (
  id     TEXT PRIMARY KEY,
  visto  INTEGER NOT NULL,
  estado TEXT NOT NULL                              -- JSON del último latido
);

-- Una fila por servidor y minuto. Se guardan 30 días.
CREATE TABLE metricas (
  nodo        TEXT NOT NULL,
  minuto      INTEGER NOT NULL,                     -- Date.now() / 60000
  sesiones    INTEGER NOT NULL,
  cpu_pct     REAL NOT NULL,
  ram_mb      INTEGER NOT NULL,
  ram_total   INTEGER NOT NULL,
  disco_pct   REAL NOT NULL,
  carga       REAL NOT NULL,
  labs_cpu    REAL NOT NULL,                        -- núcleos que gastan los labs
  labs_ram_mb INTEGER NOT NULL,
  PRIMARY KEY (nodo, minuto)
);

-- Cada sesión de lab que se cierra.
CREATE TABLE usos_lab (
  id         TEXT PRIMARY KEY,
  nodo       TEXT NOT NULL,
  usuario    TEXT,
  lab        TEXT NOT NULL,
  inicio     INTEGER NOT NULL,
  fin        INTEGER NOT NULL,
  segundos   INTEGER NOT NULL,
  cpu_s      REAL NOT NULL DEFAULT 0,               -- segundos de CPU que gastó
  ram_max_mb INTEGER NOT NULL DEFAULT 0,
  pasos      INTEGER NOT NULL DEFAULT 0,
  motivo     TEXT
);
CREATE INDEX usos_lab_inicio ON usos_lab (inicio);
CREATE INDEX usos_lab_usuario ON usos_lab (usuario);

-- Órdenes del panel para un servidor (cerrar una sesión, echar a alguien). Se entregan en el siguiente latido.
CREATE TABLE ordenes (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nodo   TEXT NOT NULL,
  tipo   TEXT NOT NULL,
  datos  TEXT NOT NULL DEFAULT '{}',
  creada INTEGER NOT NULL
);
CREATE INDEX ordenes_nodo ON ordenes (nodo);

-- Lo que pasa en las cuentas. Altas, entradas, fallos, cambios del admin.
CREATE TABLE actividad (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  cuando  INTEGER NOT NULL,
  usuario TEXT,
  tipo    TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  ip      TEXT,
  pais    TEXT
);
CREATE INDEX actividad_cuando ON actividad (cuando);
CREATE INDEX actividad_usuario ON actividad (usuario);
CREATE INDEX actividad_tipo ON actividad (tipo, cuando);

CREATE TABLE ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT INTO ajustes (clave, valor) VALUES
  ('registro', 'abierto'),        -- abierto, solo_clase o cerrado
  ('profes', 'aprobacion'),       -- abierto o aprobacion
  ('verificar_correo', '0'),      -- 1 manda el correo de confirmación (necesita el envío de correo)
  ('aviso', '');                  -- una línea que ven todos arriba de la página
