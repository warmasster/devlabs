// Datos del sitio que salen en todas las páginas públicas, en el sitemap y en los datos para Google.
// Si cambia el dominio o el nombre, se cambia aquí y nada más.

export const SITIO = {
  url: 'https://relavops.org',
  nombre: 'relavops',
  lema: 'Linux, redes y DevOps con máquinas de verdad',
  descripcion:
    'Curso gratis de Linux, redes y DevOps en español. Cada lección trae su propia máquina Linux y comprueba lo que escribes en la terminal. Sin instalar nada.',
  // Quien firma los artículos. Su página es /sobre. Con perfiles (LinkedIn, GitHub, YouTube…) Google
  // ata la firma a la persona y se fía más de lo que escribe (E-E-A-T).
  autor: { nombre: 'Fernando Hernández', url: 'https://relavops.org/sobre', perfiles: [] as string[] },
  // Clave de IndexNow (Bing, Yandex, Seznam, Naver). Se publica en /<clave>.txt. Ver seo/LEEME.md.
  indexnow: 'bcfe7302b3a8cfd077efed764e77ae66',
  // Código de la etiqueta meta de Search Console, solo si no se verifica por DNS. Vacío: no se pone.
  google: '',
  // Código de la etiqueta meta de Bing Webmaster Tools, solo si no se importa desde Search Console.
  bing: '',
};

export const url = (ruta: string) => SITIO.url + (ruta === '/' ? '/' : ruta);
