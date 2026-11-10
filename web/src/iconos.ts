// Sistema de iconos: Lucide (ISC). Nada de emojis en la interfaz.
// - En HTML:          <i data-ic="shield"></i>
// - En texto generado: «ic:shield»  (log, chips, botones… se sustituye solo)
// - En SVG (mapas):    icSvg('ghost', x, y, tamaño)
import {
  Activity, AppWindow, Apple, ArrowRight, Award, Ban, Brain, BrickWall, Brush, Bug, Castle, ChartColumn, Check, ChevronLeft,
  CircleCheck, CircleHelp, CircleX, Clipboard, CloudFog, Cog, Container, Crown, Eye, EyeOff, Flag, FlaskConical, Flame,
  Gamepad2, Ghost, Gift, Globe, HardDrive, Headphones, Heart, Keyboard, KeyRound, Lightbulb, Lock, LockOpen, Map as Mapa,
  MapPin, Maximize, Package, Palette, Pause, PenLine, Play, Radar, RotateCcw, RotateCw, Scale, Shield, ShoppingCart, Skull,
  Snail, Sparkles, Square, Star, Swords, Terminal, Thermometer, Timer, TrendingDown, TrendingUp, TriangleAlert, Trophy,
  UserRound, Volume2, Vote, Waves, Wrench, X, Zap, Biohazard, Smile, Angry, Rocket, Type,
  FileText, Monitor, Folder, Link, File, DoorOpen, DoorClosed, GitCommitHorizontal, Server, Cpu, MemoryStick, Network, House, Mail,
  User, Users, Hash, Binary, Search, Save, Pencil, Undo2, GitBranch, GitMerge, Laptop, Router, Cable, Workflow, Funnel, Scissors,
  Clock, Repeat, Code, Eraser, Copy, Trash2, FolderPlus, FilePlus, ArrowDown, Box, Layers, Gauge, History, Book, Route, Signal, Hand,
  Plug, Puzzle, Footprints, Sun, Moon, Download, GraduationCap, ShieldCheck,
} from 'lucide-static';

export const ICONOS: Record<string, string> = {
  activity: Activity, 'app-window': AppWindow, apple: Apple, 'arrow-right': ArrowRight, award: Award, ban: Ban, brain: Brain,
  'brick-wall': BrickWall, brush: Brush, bug: Bug, castle: Castle, 'chart-column': ChartColumn, check: Check,
  'chevron-left': ChevronLeft, 'circle-check': CircleCheck, 'circle-help': CircleHelp, 'circle-x': CircleX, clipboard: Clipboard,
  'cloud-fog': CloudFog, cog: Cog, container: Container, crown: Crown, eye: Eye, 'eye-off': EyeOff, flag: Flag,
  'flask-conical': FlaskConical, flame: Flame, 'gamepad-2': Gamepad2, ghost: Ghost, gift: Gift, globe: Globe,
  'hard-drive': HardDrive, headphones: Headphones, heart: Heart, keyboard: Keyboard, 'key-round': KeyRound, lightbulb: Lightbulb,
  lock: Lock, 'lock-open': LockOpen, map: Mapa, 'map-pin': MapPin, maximize: Maximize, package: Package, palette: Palette,
  pause: Pause, 'pen-line': PenLine, play: Play, radar: Radar, 'rotate-ccw': RotateCcw, 'rotate-cw': RotateCw, scale: Scale,
  shield: Shield, 'shopping-cart': ShoppingCart, skull: Skull, snail: Snail, sparkles: Sparkles, square: Square, star: Star,
  swords: Swords, terminal: Terminal, thermometer: Thermometer, timer: Timer, 'trending-down': TrendingDown,
  'trending-up': TrendingUp, 'triangle-alert': TriangleAlert, trophy: Trophy, 'user-round': UserRound, 'volume-2': Volume2,
  vote: Vote, waves: Waves, wrench: Wrench, x: X, zap: Zap, biohazard: Biohazard, smile: Smile, angry: Angry, rocket: Rocket, type: Type,
  'file-text': FileText, monitor: Monitor, folder: Folder, link: Link, file: File, 'door-open': DoorOpen, 'door-closed': DoorClosed,
  'git-commit': GitCommitHorizontal, server: Server, cpu: Cpu, 'memory-stick': MemoryStick, network: Network, house: House, mail: Mail,
  user: User, users: Users, hash: Hash, binary: Binary, search: Search, save: Save, pencil: Pencil, undo: Undo2, 'git-branch': GitBranch,
  'git-merge': GitMerge, laptop: Laptop, router: Router, cable: Cable, workflow: Workflow, funnel: Funnel, scissors: Scissors, clock: Clock,
  repeat: Repeat, code: Code, eraser: Eraser, copy: Copy, trash: Trash2, 'folder-plus': FolderPlus, 'file-plus': FilePlus,
  'arrow-down': ArrowDown, box: Box, layers: Layers, gauge: Gauge, history: History, book: Book, route: Route, signal: Signal, hand: Hand,
  plug: Plug, puzzle: Puzzle, footprints: Footprints, sun: Sun, moon: Moon, download: Download, 'graduation-cap': GraduationCap,
  'shield-check': ShieldCheck,
};

// SVG en línea, del tamaño del texto y del color del texto (currentColor).
export function ic(nombre: string, clase = ''): string {
  const s = ICONOS[nombre];
  if (!s) return '';
  return s.replace('<svg', `<svg aria-hidden="true" class="ic ${clase}"`).replace(/width="24"/, 'width="1em"').replace(/height="24"/, 'height="1em"');
}

// Para dibujar dentro de otro SVG (los mapas): un <svg> anidado en (x, y).
export function icSvg(nombre: string, x: number, y: number, tam: number, color = 'currentColor'): string {
  const s = ICONOS[nombre];
  if (!s) return '';
  return s.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" x="${x - tam / 2}" y="${y - tam / 2}" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`);
}

export const TOKEN = /«ic:([a-z0-9-]+)»/g;
export const sinIconos = (t: string) => t.replace(TOKEN, '').replace(/\s{2,}/g, ' ').trim();
export const nombreIcono = (t: string) => /«ic:([a-z0-9-]+)»/.exec(t)?.[1];

// Sustituye <i data-ic> y los «ic:…» que aparezcan en el texto, ahora y cuando cambie la página.
export function pintarIconos(raiz: ParentNode = document.body) {
  raiz.querySelectorAll?.('i[data-ic]:not([data-ok])').forEach((el) => {
    el.innerHTML = ic((el as HTMLElement).dataset.ic!);
    el.setAttribute('data-ok', '');
  });
  const w = document.createTreeWalker(raiz as Node, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue?.includes('«ic:') && !(n.parentElement?.closest('svg, script, style, .xterm, textarea, pre.tokens')) ? 1 : 2),
  });
  const textos: Text[] = [];
  while (w.nextNode()) textos.push(w.currentNode as Text);
  for (const t of textos) {
    const span = document.createElement('span');
    span.innerHTML = (t.nodeValue ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!).replace(TOKEN, (_, n) => ic(n));
    t.replaceWith(...span.childNodes);
  }
}

if (typeof document !== 'undefined') {
  const arrancar = () => {
    pintarIconos();
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData' && m.target.nodeValue?.includes('«ic:')) pintarIconos(m.target.parentNode as ParentNode);
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) pintarIconos(n as Element);
          else if (n.nodeType === 3 && n.nodeValue?.includes('«ic:') && n.parentNode) pintarIconos(n.parentNode as ParentNode);
        });
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) arrancar(); else addEventListener('DOMContentLoaded', arrancar);
}
