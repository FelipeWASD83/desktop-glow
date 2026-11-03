// Os estilos de vídeo: cada um é um vocabulário de movimento (família de transições, entradas, modos de texto,
// molas, grão e ritmo). Cor e fonte NÃO moram aqui: vêm da direção visual de cada vídeo (src/tema.ts).
// A receita completa de cada estilo (quando usar, efeito-assinatura, som, o que evitar) está em
// referencias/estilos.md da skill. O roteiro escolhe o estilo em "estilo". Módulo puro.
import type {TipoTransicao} from './transicoes-dados.ts';

export type TipoEntrada = 'mascara' | 'recorte' | 'mola' | 'foco' | 'desliza' | 'quica' | 'gira' | 'cresce' | 'ilumina' | 'degraus';
export type ModoTexto = 'sobe' | 'letra' | 'embaralha' | 'foco' | 'cai' | 'recorte';
export type Mola = {damping: number; mass: number; stiffness: number};

export type Estilo = {
  nome: string;
  transicoes: TipoTransicao[]; // família: o planejador escolhe daqui, sem repetir
  entradas: TipoEntrada[]; // useEntradas() gira por esta lista
  texto: ModoTexto[]; // modos de <Palavras>, na ordem de preferência
  molas: {seca: Mola; viva: Mola; quica: Mola};
  grao: number;
  bpm: number; // sugestão; o roteiro manda
};

const SECA: Mola = {damping: 200, mass: 0.6, stiffness: 180};
const VIVA: Mola = {damping: 14, mass: 0.7, stiffness: 140};
const QUICA: Mola = {damping: 8, mass: 0.6, stiffness: 160};

export const ESTILOS: Record<string, Estilo> = {
  cinetico: {
    nome: 'Tipografia cinética',
    transicoes: ['varredura', 'chicote', 'iris', 'blocos', 'empurra', 'corte'],
    entradas: ['mascara', 'recorte', 'mola', 'desliza', 'foco'],
    texto: ['sobe', 'letra', 'recorte', 'foco'],
    molas: {seca: SECA, viva: VIVA, quica: QUICA},
    grao: 0.06,
    bpm: 120,
  },
  explicativo: {
    nome: 'Explicativo flat',
    transicoes: ['iris', 'empurra', 'cortina', 'zoom', 'divide', 'corte'],
    entradas: ['mola', 'cresce', 'quica', 'desliza', 'gira'],
    texto: ['sobe', 'recorte'],
    molas: {seca: SECA, viva: {damping: 12, mass: 0.7, stiffness: 150}, quica: QUICA},
    grao: 0.03,
    bpm: 100,
  },
  produto: {
    nome: 'Produto e interface',
    transicoes: ['zoom', 'empurra', 'cortina', 'divide', 'iris', 'corte'],
    entradas: ['mola', 'desliza', 'foco', 'recorte', 'cresce'],
    texto: ['sobe', 'foco'],
    molas: {seca: {damping: 200, mass: 0.7, stiffness: 160}, viva: VIVA, quica: QUICA},
    grao: 0.03,
    bpm: 110,
  },
  editorial: {
    nome: 'Editorial de papel',
    transicoes: ['cortina', 'persiana', 'divide', 'empurra', 'corte'],
    entradas: ['recorte', 'mascara', 'desliza', 'gira'],
    texto: ['sobe', 'recorte', 'letra'],
    molas: {seca: SECA, viva: {damping: 18, mass: 0.8, stiffness: 120}, quica: QUICA},
    grao: 0.09,
    bpm: 96,
  },
  suico: {
    nome: 'Suíço e brutalista',
    transicoes: ['corte', 'persiana', 'blocos', 'empurra', 'divide'],
    entradas: ['mascara', 'recorte', 'cresce', 'degraus'],
    texto: ['sobe', 'recorte'],
    molas: {seca: {damping: 200, mass: 0.5, stiffness: 220}, viva: {damping: 30, mass: 0.6, stiffness: 200}, quica: QUICA},
    grao: 0,
    bpm: 128,
  },
  dados: {
    nome: 'Dados animados',
    transicoes: ['empurra', 'zoom', 'blocos', 'iris', 'corte'],
    entradas: ['cresce', 'mola', 'desliza', 'foco'],
    texto: ['sobe', 'embaralha'],
    molas: {seca: SECA, viva: VIVA, quica: QUICA},
    grao: 0.03,
    bpm: 110,
  },
  glitch: {
    nome: 'Glitch e tecnologia',
    transicoes: ['glitch', 'chicote', 'blocos', 'persiana', 'corte'],
    entradas: ['degraus', 'recorte', 'ilumina', 'desliza'],
    texto: ['embaralha', 'letra'],
    molas: {seca: {damping: 200, mass: 0.5, stiffness: 240}, viva: VIVA, quica: QUICA},
    grao: 0.1,
    bpm: 140,
  },
  organico: {
    nome: 'Orgânico e líquido',
    transicoes: ['liquido', 'iris', 'zoom', 'cortina', 'corte'],
    entradas: ['mola', 'quica', 'foco', 'cresce'],
    texto: ['foco', 'cai'],
    molas: {seca: {damping: 26, mass: 0.8, stiffness: 120}, viva: {damping: 10, mass: 0.8, stiffness: 120}, quica: QUICA},
    grao: 0.04,
    bpm: 90,
  },
  traco: {
    nome: 'Traço desenhado',
    transicoes: ['cortina', 'iris', 'empurra', 'divide', 'corte'],
    entradas: ['cresce', 'recorte', 'mascara', 'gira'],
    texto: ['letra', 'recorte'],
    molas: {seca: SECA, viva: VIVA, quica: QUICA},
    grao: 0.07,
    bpm: 100,
  },
  cinema: {
    nome: 'Abertura de cinema',
    transicoes: ['zoom', 'divide', 'iris', 'cortina', 'corte'],
    entradas: ['foco', 'ilumina', 'mascara', 'recorte'],
    texto: ['foco', 'letra'],
    molas: {seca: {damping: 200, mass: 1, stiffness: 90}, viva: {damping: 20, mass: 1, stiffness: 90}, quica: QUICA},
    grao: 0.08,
    bpm: 80,
  },
};
