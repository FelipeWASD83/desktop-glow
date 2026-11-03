// The visual direction of the pack's videos: the ilha family (true black, white ink, pills, Quicksand), with each app
// in the color of its own icon. Movement comes from the style in the script (src/estilo.ts).
import {continueRender, delayRender, staticFile} from 'remotion';
import roteiro from './roteiro.json';

// Local fonts: Quicksand (OFL, the clock's and Fundo Vivo's) and the Anurati the clock draws its day with. The Anurati
// is free for personal use only, so it never goes to git: ferramentas/capturas.py copies it into public/gerado/.
const carregar = (familia: string, arquivo: string, peso: number) => {
  if (typeof FontFace === 'undefined') return;
  const espera = delayRender(`font ${familia} ${peso}`);
  const fonte = new FontFace(familia, `url(${staticFile(arquivo)})`, {weight: String(peso)});
  fonte
    .load()
    .then(() => {
      document.fonts.add(fonte);
      continueRender(espera);
    })
    .catch((e) => {
      console.error(`font ${arquivo} did not load`, e);
      continueRender(espera);
    });
};
carregar('Quicksand', 'fontes/Quicksand-Light.ttf', 300);
carregar('Quicksand', 'fontes/Quicksand-Regular.ttf', 400);
carregar('Quicksand', 'fontes/Quicksand-Medium.ttf', 500);
carregar('Quicksand', 'fontes/Quicksand-Bold.ttf', 700);
carregar('Anurati', 'gerado/fontes/Anurati-Regular.otf', 400);

export const FONTE_TITULO = 'Quicksand, "Segoe UI Variable Display", "Segoe UI", sans-serif';
export const FONTE_APOIO = '"Segoe UI Variable Text", "Segoe UI", sans-serif';
export const FONTE_DIA = 'Anurati, Quicksand, sans-serif';

export type App = 'ilha' | 'relogio' | 'fundovivo' | 'cursores';
export const APPS: App[] = ['ilha', 'relogio', 'fundovivo', 'cursores'];

// each app's accent, taken from its icon
export const COR_APP: Record<App, string> = {
  ilha: '#8f86ff',
  relogio: '#9fb6ff',
  fundovivo: '#ff8f70',
  cursores: '#5fe0c4',
};

const appDoRoteiro = (roteiro as {app?: string}).app as App | 'todos' | undefined;
const destaque = appDoRoteiro && appDoRoteiro !== 'todos' ? COR_APP[appDoRoteiro] : '#f5f5f7';

export const COR = {
  fundo: '#000000',
  fundo2: '#09090c',
  texto: '#f5f5f7',
  textoSuave: '#a1a1a8',
  textoFraco: '#6c6c74',
  superficie: '#111114',
  linha: '#2a2a2f',
  destaque,
  apoio: '#30d158',
  luz1: 'rgba(143,134,255,.16)',
  luz2: 'rgba(255,143,112,.12)',
};

export const FPS = 30;

// The formats a script can ask for. The short side is always 1080, so px sizes hold for all.
// "seguro" is the margin where text and logos do not go (referencias/som-e-entrega.md).
export type Formato = {
  id: string;
  largura: number;
  altura: number;
  seguro: {topo: number; dir: number; base: number; esq: number};
};
export const FORMATOS: Record<string, Formato> = {
  '16x9': {id: '16x9', largura: 1920, altura: 1080, seguro: {topo: 54, dir: 96, base: 54, esq: 96}},
  '9x16': {id: '9x16', largura: 1080, altura: 1920, seguro: {topo: 250, dir: 150, base: 350, esq: 65}},
  '1x1': {id: '1x1', largura: 1080, altura: 1080, seguro: {topo: 60, dir: 60, base: 60, esq: 60}},
  '4x5': {id: '4x5', largura: 1080, altura: 1350, seguro: {topo: 70, dir: 70, base: 120, esq: 70}},
};

// Gaps of a narrated scene (these videos have no narration; kept for the timeline code).
export const ANTES = 6;
export const DEPOIS = 20;
