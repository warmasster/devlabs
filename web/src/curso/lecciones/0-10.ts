// 0.10 · Git básico. Zonas, commits, ramas, merge, remoto, conflictos y cómo deshacer sin miedo.
import type { Leccion } from './tipos';

const L = 'n0-10a-historia';
const PRACTICA = 'n0-10-git';
const zonas = { t: 'git-zonas', sonda: 'zonas', tras: 'status' };
const grafo = { t: 'git-grafo', sonda: 'grafo', tras: 'commit' };

export const leccion: Leccion = {
  id: '0.10',
  titulo: 'Git básico',
  minutos: 50,
  resumen: 'Sabes guardar fotos de tu proyecto con git, trabajar en ramas, unirlas, resolver un conflicto, subirlas a un remoto y arreglar los líos más típicos.',
  pasos: [
    {
      titulo: 'Fotos de tu proyecto',
      lab: L,
      w: [
        { t: 'analogia', icono: 'history', de: 'git', es: 'guarda fotos de tu proyecto con fecha, autor y motivo. Puedes volver a cualquiera.' },
        { t: 'texto', md: 'A cada foto se le llama **commit**. Toda la configuración de los servidores, el código y casi todo lo que verás en DevOps vive en git.' },
        { t: 'comando', cmd: 'git', hace: 'El programa que guarda la historia de un proyecto. Detrás lleva siempre una orden, como `git status`.', ops: [['--version', 'dice qué versión de git hay instalada']] },
        { t: 'haz', paso: 'version', md: 'Comprueba que git está instalado con `git --version`.' },
      ],
    },
    {
      titulo: 'Tres sitios',
      w: [
        { t: 'texto', md: 'git trabaja con tres sitios. Tu carpeta, donde editas. La zona de preparado, donde eliges qué entra en la próxima foto. Y la historia, con todas las fotos.' },
        { t: 'comando', cmd: 'git init', hace: 'Empieza la historia de git en la carpeta donde estás.', uso: 'git init' },
        { t: 'haz', paso: 'init', md: 'Entra en `proyecto` con `cd proyecto` y escribe `git init`.' },
      ],
    },
    {
      titulo: 'Preparar',
      w: [
        zonas,
        { t: 'comando', cmd: 'git status', hace: 'Dice qué ha cambiado y en cuál de los tres sitios está cada fichero.', uso: 'git status' },
        { t: 'haz', paso: 'status', md: 'Escribe `git status`. Tus ficheros salen en rojo porque git todavía no los guarda.' },
        { t: 'comando', cmd: 'git add', hace: 'Pasa ficheros a la zona de preparado, listos para la próxima foto.', ops: [['.', 'un punto quiere decir todo lo que ha cambiado']], uso: 'git add .' },
        { t: 'haz', paso: 'add', md: 'Escribe `git add .` y mira cómo saltan los ficheros.' },
      ],
    },
    {
      titulo: 'La primera foto',
      w: [
        zonas,
        { t: 'comando', cmd: 'git commit', hace: 'Hace la foto con lo que hay preparado y la guarda en la historia.', ops: [['-m "mensaje"', 'el mensaje que cuenta qué hiciste']], uso: 'git commit -m "Primera versión"' },
        { t: 'haz', paso: 'commit', md: 'Escribe `git commit -m "Primera versión"`.' },
        grafo,
      ],
    },
    {
      titulo: 'Otra foto',
      w: [
        { t: 'haz', paso: 'segundo', md: 'Cambia algo, por ejemplo con `echo "<p>Abrimos a las 9</p>" >> index.html`, y haz otro commit.', pista: 'git add . && git commit -m "Horario"' },
        zonas,
        grafo,
        { t: 'comando', cmd: 'git log', hace: 'Enseña la historia. Cada commit lleva un código único, su hash.', ops: [['--oneline', 'un commit por línea'], ['--graph', 'dibuja las ramas con rayas'], ['--all', 'todas las ramas, no solo la tuya']] },
        { t: 'haz', paso: 'log', md: 'Escribe `git log --oneline`.' },
      ],
    },
    {
      titulo: 'Ramas',
      w: [
        { t: 'analogia', icono: 'git-branch', de: 'Una rama', es: 'es una etiqueta que apunta a un commit. Te deja probar cosas sin tocar la versión buena.' },
        { t: 'comando', cmd: 'git switch', hace: 'Te cambia de rama. La rama de siempre se llama main.', ops: [['-c nombre', 'crea esa rama y te pasa a ella']], uso: 'git switch -c ofertas' },
        { t: 'haz', paso: 'rama', md: 'Crea la rama `ofertas`, cambia algo y haz un commit en ella.', pista: 'Primero `git switch -c ofertas`. Luego `echo "<p>Ofertas</p>" >> index.html`, `git add .` y `git commit -m "Ofertas"`.' },
        grafo,
      ],
    },
    {
      titulo: 'Unir la rama',
      w: [
        { t: 'comando', cmd: 'git merge', hace: 'Trae a la rama donde estás los commits de otra rama.', partes: [['git merge', 'une'], ['ofertas', 'qué rama traes']] },
        { t: 'haz', paso: 'merge', md: 'Ponte en main con `git switch main` y luego escribe `git merge ofertas`.' },
        { t: 'texto', md: 'Como main no había cambiado, git solo tiene que mover la etiqueta main hasta tu último commit de ofertas. Por eso dice *Fast-forward*.' },
        grafo,
      ],
    },
    {
      titulo: 'El remoto',
      w: [
        { t: 'texto', md: 'Hasta ahora todo está en tu máquina. Un **remoto** es otra copia del repositorio, en un servidor, para el equipo. Aquí hay uno en `/srv/git/tienda.git`.' },
        { t: 'comando', cmd: 'git remote', hace: 'Apunta dónde está el remoto y le pone un nombre. El nombre de siempre es origin.', partes: [['git remote add', 'apunta un remoto'], ['origin', 'su nombre'], ['/srv/git/tienda.git', 'dónde está']] },
        { t: 'comando', cmd: 'git push', hace: 'Sube tus commits al remoto.', ops: [['-u origin main', 'la primera vez. Deja apuntado que tu main va con el main de origin. Después basta `git push`']] },
        { t: 'haz', paso: 'push', md: 'Apunta el remoto con `git remote add origin /srv/git/tienda.git` y sube main con `git push -u origin main`.' },
        grafo,
      ],
    },
    {
      titulo: 'Bajar y copiar',
      w: [
        { t: 'comando', cmd: 'git clone', hace: 'Copia un remoto entero, con toda su historia, a una carpeta nueva.', partes: [['git clone', 'copia'], ['/srv/git/tienda.git', 'qué remoto'], ['/root/copia', 'a qué carpeta']] },
        { t: 'comando', cmd: 'git pull', hace: 'Trae del remoto los commits que tú no tienes y los une a tu rama.', uso: 'git pull' },
        { t: 'texto', md: 'Si alguien subió algo antes que tú, tu push se rechaza. Primero `git pull`, luego `git push`.' },
        { t: 'haz', paso: 'clone', md: 'Haz una copia del remoto en otra carpeta con `git clone /srv/git/tienda.git /root/copia`. Así trabajaría otra persona del equipo.' },
      ],
    },
    {
      titulo: 'Ver y deshacer un cambio',
      w: [
        { t: 'comando', cmd: 'git diff', hace: 'Enseña línea a línea lo que has cambiado y aún no has preparado.', uso: 'git diff' },
        { t: 'haz', paso: 'diff', md: 'Estropea `index.html` a propósito con `echo roto >> index.html` y mira la diferencia con `git diff`.' },
        { t: 'comando', cmd: 'git restore', hace: 'Deja un fichero como estaba en el último commit. Pierdes los cambios de ese fichero.', partes: [['git restore', 'deshaz los cambios de'], ['index.html', 'este fichero']] },
        { t: 'haz', paso: 'restore', md: 'Déjalo como estaba con `git restore index.html`.' },
      ],
    },
    {
      titulo: 'Conflictos',
      w: [
        { t: 'texto', md: 'Si dos ramas cambian lo mismo, git no sabe con cuál quedarse. Te lo marca en el fichero y decides tú.' },
        { t: 'codigo', codigo: '<<<<<<< HEAD\n<p>De 16 a 20</p>\n=======\n<p>De 9 a 14</p>\n>>>>>>> horario', notas: { 1: 'Desde aquí, lo de la rama donde estás.', 3: 'La raya separa lo tuyo de lo de la otra rama.', 5: 'Hasta aquí, lo que viene de la otra rama.' } },
        { t: 'texto', md: 'Se arregla a mano. Abres el fichero, dejas lo bueno, quitas las tres marcas, y luego `git add` y `git commit`.' },
        { t: 'quiz', q: '¿Qué tienes que quitar del fichero para resolver un conflicto?', ops: ['Solo la línea de la otra rama', 'Las tres líneas de marcas, y dejar el texto como debe quedar', 'Nada, git lo arregla con otro merge'], ok: 1, porque: 'Las marcas `<<<<<<<`, `=======` y `>>>>>>>` no son parte de tu fichero. Tú decides qué texto queda.' },
      ],
    },
    {
      titulo: 'Un conflicto de verdad',
      w: [
        { t: 'texto', md: 'Vas a provocar uno. Dos ramas crean el mismo fichero con textos distintos. Ve línea a línea.' },
        { t: 'tabla', cab: ['Paso', 'Escribes'], filas: [
          ['1. Una rama nueva', '`git switch -c horario`'],
          ['2. Su versión', '`echo "<p>De 9 a 14</p>" > horario.html`'],
          ['3. La guardas', '`git add .` y `git commit -m "Horario de mañana"`'],
          ['4. Vuelves a main', '`git switch main`'],
          ['5. Otra versión', '`echo "<p>De 16 a 20</p>" > horario.html`'],
          ['6. La guardas', '`git add .` y `git commit -m "Horario de tarde"`'],
          ['7. Unes', '`git merge horario`. Git avisa del conflicto'],
          ['8. Lo arreglas', '`nano horario.html`. Deja las dos líneas de horario y quita las tres marcas'],
          ['9. Lo cierras', '`git add .` y `git commit -m "Horario completo"`'],
        ] },
        { t: 'haz', paso: 'conflicto', md: 'Haz los nueve pasos. Se da por bueno cuando el merge está guardado y `horario.html` ya no tiene marcas.' },
        grafo,
      ],
    },
    {
      titulo: 'Se te ha colado un secreto',
      w: [
        { t: 'texto', md: 'Pasa mucho. Haces un commit y dentro va un fichero con una contraseña. Si todavía no lo has subido, tiene arreglo.' },
        { t: 'comando', cmd: 'git rm', hace: 'Saca un fichero de git.', ops: [['--cached', 'lo saca de git pero lo deja en tu disco']], uso: 'git rm --cached secreto.txt' },
        { t: 'comando', cmd: 'git commit', ops: [['--amend', 'rehace el último commit con lo que hay preparado ahora. Solo si no lo has subido']] },
        { t: 'tabla', cab: ['Paso', 'Escribes'], filas: [
          ['1. El despiste', '`echo clave=1234 > secreto.txt`, `git add .` y `git commit -m "Ajustes"`'],
          ['2. Lo sacas de git', '`git rm --cached secreto.txt`'],
          ['3. Que no vuelva a entrar', '`echo secreto.txt >> .gitignore` y `git add .`'],
          ['4. Rehaces el commit', '`git commit --amend -m "Ajustes"`'],
        ] },
        { t: 'haz', paso: 'amend', md: 'Haz los cuatro pasos. Al acabar, `secreto.txt` sigue en tu carpeta pero no está en ningún commit.' },
        { t: 'texto', md: 'El fichero `.gitignore` lista lo que git no debe guardar nunca. Ojo, solo sirve para lo que aún no está en un commit.' },
      ],
    },
    {
      titulo: 'Volver a lo del remoto',
      w: [
        { t: 'texto', md: 'Tienes en main commits que no has subido y que tenían que ir en otra rama. Una rama es solo una etiqueta, así que se arregla con dos órdenes.' },
        { t: 'comando', cmd: 'git branch', hace: 'Pone una rama nueva justo donde estás, sin moverte de la tuya.', partes: [['git branch', 'crea la etiqueta'], ['pruebas', 'su nombre']] },
        { t: 'comando', cmd: 'git reset', hace: 'Mueve tu rama a otro commit.', ops: [['--hard origin/main', 'deja tu rama igual que la del remoto. Pierdes lo que no esté guardado en otra rama']] },
        { t: 'haz', paso: 'mover', md: 'Guarda lo que llevas en una rama con `git branch pruebas`. Luego devuelve main a su sitio con `git reset --hard origin/main`.' },
        grafo,
        { t: 'aviso', tipo: 'mal', md: '`git reset --hard` tira lo que no esté en un commit de alguna rama. Guarda antes con `git branch`.' },
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
        { t: 'chuleta' },
        { t: 'texto', md: 'Con esto acabas el cinturón blanco. Lo siguiente es administrar Linux de verdad.' },
      ],
    },
  ],
};
