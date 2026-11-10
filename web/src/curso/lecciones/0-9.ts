// 0.9 · Git básico. Zonas, commits, ramas, merge, remoto, y cómo deshacer sin miedo.
import type { Leccion } from './tipos';

const L = 'n0-9a-historia';
const PRACTICA = 'n0-9-git';
const zonas = { t: 'git-zonas', sonda: 'zonas', tras: 'status' };
const grafo = { t: 'git-grafo', sonda: 'grafo', tras: 'commit' };

export const leccion: Leccion = {
  id: '0.9',
  titulo: 'Git básico',
  minutos: 40,
  resumen: 'Sabes guardar fotos de tu proyecto con git, trabajar en ramas, unirlas, subirlas a un remoto y arreglar los líos más típicos.',
  pasos: [
    {
      titulo: 'Fotos de tu proyecto',
      lab: L,
      w: [
        { t: 'analogia', icono: 'history', de: 'git', es: 'guarda fotos de tu proyecto con fecha, autor y motivo. Puedes volver a cualquiera.' },
        { t: 'texto', md: 'A cada foto se le llama **commit**. Toda la configuración de los servidores, el código y casi todo lo que verás en DevOps vive en git.' },
        { t: 'haz', paso: 'version', md: 'Comprueba que git está instalado con `git --version`.' },
      ],
    },
    {
      titulo: 'Tres sitios',
      w: [
        { t: 'texto', md: 'git trabaja con tres sitios. Tu carpeta, donde editas. La zona de preparado, donde eliges qué entra en la próxima foto. Y la historia, con todas las fotos.' },
        { t: 'haz', paso: 'init', md: 'Entra en `proyecto` con `cd proyecto` y escribe `git init`. Eso empieza la historia.' },
      ],
    },
    {
      titulo: 'Preparar',
      w: [
        zonas,
        { t: 'texto', md: '`git status` te dice qué ha cambiado.' },
        { t: 'haz', paso: 'status', md: 'Escribe `git status`. Tus ficheros salen en rojo porque git todavía no los guarda.' },
        { t: 'texto', md: '`git add` pasa ficheros a preparado. Un punto quiere decir todos.' },
        { t: 'haz', paso: 'add', md: 'Escribe `git add .` y mira cómo saltan los ficheros.' },
      ],
    },
    {
      titulo: 'La primera foto',
      w: [
        zonas,
        { t: 'haz', paso: 'commit', md: 'Escribe `git commit -m "Primera versión"`. El mensaje cuenta qué hiciste.' },
        grafo,
      ],
    },
    {
      titulo: 'Otra foto',
      w: [
        { t: 'haz', paso: 'segundo', md: 'Cambia algo, por ejemplo `echo "<p>Abrimos a las 9</p>" >> index.html`, y haz otro commit.', pista: 'git add . && git commit -m "Horario"' },
        zonas,
        grafo,
        { t: 'texto', md: '`git log --oneline` enseña la historia en la terminal. Cada commit lleva un código único, su hash.' },
      ],
    },
    {
      titulo: 'Ramas',
      w: [
        { t: 'analogia', icono: 'git-branch', de: 'Una rama', es: 'es una etiqueta que apunta a un commit. Te deja probar cosas sin tocar la versión buena.' },
        { t: 'texto', md: '`git switch -c ofertas` crea la rama ofertas y te pasa a ella. La rama de siempre se llama main.' },
        { t: 'haz', paso: 'rama', md: 'Crea la rama `ofertas`, cambia algo y haz un commit en ella.', pista: 'git switch -c ofertas, luego echo "<p>Ofertas</p>" >> index.html, git add . y git commit -m "Ofertas"' },
        grafo,
      ],
    },
    {
      titulo: 'Unir la rama',
      w: [
        { t: 'texto', md: 'Para traer lo de ofertas a main, te pones en main y haces merge.' },
        { t: 'haz', paso: 'merge', md: 'Escribe `git switch main` y luego `git merge ofertas`.' },
        { t: 'texto', md: 'Como main no había cambiado, git solo tiene que mover la etiqueta main hasta tu último commit de ofertas. Por eso dice *Fast-forward*.' },
        grafo,
      ],
    },
    {
      titulo: 'El remoto',
      w: [
        { t: 'texto', md: 'Hasta ahora todo está en tu máquina. Un **remoto** es otra copia del repositorio, en un servidor, para el equipo. Aquí hay uno en `/srv/git/tienda.git`.' },
        { t: 'anatomia', partes: [['git remote add', 'apunta un remoto'], ['origin', 'su nombre de siempre'], ['/srv/git/tienda.git', 'dónde está']] },
        { t: 'texto', md: 'La `-u` deja apuntado que tu main va con el main de origin. Así, la próxima vez, basta con `git push` o `git pull` a secas.' },
        { t: 'haz', paso: 'push', md: 'Apunta el remoto y sube main con `git push -u origin main`.', pista: 'git remote add origin /srv/git/tienda.git && git push -u origin main' },
        grafo,
      ],
    },
    {
      titulo: 'Bajar y copiar',
      w: [
        { t: 'tabla', cab: ['Comando', 'Hace'], filas: [['`git clone ruta carpeta`', 'copia un remoto entero a una carpeta nueva'], ['`git pull`', 'trae lo nuevo del remoto'], ['`git push`', 'sube lo tuyo']] },
        { t: 'texto', md: 'Si alguien subió algo antes que tú, tu push se rechaza. Primero `git pull`, luego push.' },
        { t: 'haz', paso: 'clone', md: 'Haz una copia del remoto en otra carpeta con `git clone /srv/git/tienda.git /root/copia`. Así trabajaría otra persona del equipo.' },
      ],
    },
    {
      titulo: 'Conflictos',
      w: [
        { t: 'texto', md: 'Si tú y otra persona cambiáis la misma línea, git no sabe con cuál quedarse. Te lo marca en el fichero y decides tú.' },
        { t: 'codigo', codigo: '<<<<<<< HEAD\n<p>Horario: lunes a viernes</p>\n=======\n<p>Horario: 9:00-18:00</p>\n>>>>>>> origin/main', notas: { 1: 'Desde aquí, lo tuyo.', 3: 'La raya separa lo tuyo de lo del otro.', 5: 'Hasta aquí, lo que vino del remoto.' } },
        { t: 'texto', md: 'Lo arreglas a mano. Dejas la línea buena, quitas las marcas, y luego `git add` y `git commit`.' },
        { t: 'haz', paso: 'diff', md: 'Antes de un conflicto siempre hay un cambio. Añade una línea con `echo hola >> index.html` y mira la diferencia con `git diff`.' },
      ],
    },
    {
      titulo: 'Deshacer con cuidado',
      w: [
        { t: 'tabla', cab: ['Comando', 'Hace', 'Cuidado'], filas: [['`git restore f`', 'deja f como en el último commit', 'pierdes los cambios de f'], ['`git rm --cached f`', 'saca f de git sin borrarlo del disco', ''], ['`git commit --amend`', 'rehace el último commit', 'solo si no lo has subido'], ['`git branch nombre`', 'pone una etiqueta donde estás', ''], ['`git reset --hard origin/main`', 'deja tu rama igual que el remoto', 'pierdes lo que no estaba subido']] },
        { t: 'haz', paso: 'restore', md: 'Estropea `index.html` a propósito con `echo roto >> index.html`, míralo con `git status` y déjalo como estaba con `git restore index.html`.' },
        { t: 'texto', md: 'El fichero `.gitignore` lista lo que git no debe guardar nunca, como contraseñas. Ojo, solo sirve para lo que aún no está en un commit. Lo que ya guardaste sigue en la historia aunque luego lo pongas ahí.' },
      ],
    },
    {
      titulo: 'Ordena el flujo',
      w: [
        { t: 'ordena', md: 'De un cambio a que lo vea el equipo.', items: ['editar el fichero', '`git add`', '`git commit -m`', '`git push`'] },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'El repositorio de un equipo, con remoto de verdad.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Viernes por la tarde. Algo ha salido mal en el repositorio.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'chuleta', items: [['git init · clone', 'empezar'], ['git status · log --oneline', 'mirar'], ['git add · commit -m', 'guardar una foto'], ['git switch -c · merge', 'ramas'], ['git push · pull', 'remoto'], ['git rm --cached · .gitignore', 'que algo no se guarde'], ['git commit --amend', 'rehacer el último'], ['git reset --hard origin/main', 'volver a lo del remoto']] },
        { t: 'texto', md: 'Con esto acabas el cinturón blanco. Lo siguiente es administrar Linux de verdad.' },
      ],
    },
  ],
};
