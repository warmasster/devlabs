-- Quién creó cada cuenta de alumno (las de "cuentas en bloque" del profe), para contar cuántas crea
-- cada profe al día.
ALTER TABLE usuarios ADD COLUMN creado_por TEXT;
CREATE INDEX usuarios_creado_por ON usuarios (creado_por, creado);

-- Ser profe deja crear cuentas en bloque, así que por defecto los profes nuevos esperan a que el
-- admin los apruebe. Se puede volver a abrir en el panel de admin, en Ajustes.
UPDATE ajustes SET valor = 'aprobacion' WHERE clave = 'profes';
