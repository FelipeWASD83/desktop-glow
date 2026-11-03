// A linha do tempo do vídeo: sai do roteiro (src/roteiro.json), da narração gerada (src/narracao.gerado.json) e do
// plano de transições (src/movimento/planejar.ts). Cena narrada dura a fala dela mais as folgas; cena sem fala dura
// os "segundos" do roteiro. Cada troca dura o que a transição escolhida pede.
// As cenas perguntam o tempo por useCena(): quando(marca) para a fala, batida(n) para a música.
import {createContext, useContext} from 'react';
import narracaoJson from './narracao.gerado.json';
import roteiroJson from './roteiro.json';
import {ESTILO} from './estilo';
import {planejar} from './movimento/planejar';
import {TIPOS_TRANSICAO, TRANSICOES, type TipoTransicao} from './movimento/transicoes-dados';
import {ANTES, DEPOIS, FPS, type Formato} from './tema';

export type CenaRoteiro = {id: string; fala?: string; segundos?: number; extra?: number; transicao?: TipoTransicao};
export type Roteiro = {
  titulo: string;
  estilo: string;
  bpm: number;
  formatos: string[];
  capa: number;
  legenda?: boolean;
  voz: {nome: string; velocidade: string};
  trilha: {volume: number; sobVoz: number};
  cenas: CenaRoteiro[];
};
export type Palavra = {t: number; d: number; texto: string};
export type FalaGerada = {fala: string; arquivo: string; duracao: number; palavras: Palavra[]; marcas: Record<string, number>};
export type Narracao = {voz: string | null; cenas: Record<string, FalaGerada>};

export const ROTEIRO = roteiroJson as Roteiro;
const NARRACAO = narracaoJson as Narracao;

// quadros por batida (120 BPM a 30 qps = 15)
export const QPB = (FPS * 60) / ROTEIRO.bpm;

export type Troca = {tipo: TipoTransicao; variante: number; dura: number; entra: number; som: string | null};

export type Cena = {
  id: string;
  indice: number;
  de: number; // quadro do vídeo em que a cena começa (o começo da troca que a traz)
  dura: number; // quadros até a próxima cena começar
  entra: number; // quadro (relativo à cena) em que ela aparece
  fala: number | null; // quadro (relativo) em que a voz começa
  falaDura: number; // quadros de fala
  arquivo: string | null; // mp3 da fala, em public/
  marcas: Record<string, number>; // quadro (relativo) de cada {marca} da fala
  palavras: {q: number; d: number; texto: string}[]; // cada palavra dita, em quadros relativos à cena
  trocaAntes: Troca | null; // a transição que traz esta cena
  trocaDepois: Troca | null; // a que leva à próxima
};

const montar = (): {cenas: Cena[]; trocas: Troca[]; duracao: number} => {
  if (!ROTEIRO.cenas.length) throw new Error('o roteiro não tem cenas');
  const ids = new Set<string>();
  for (const c of ROTEIRO.cenas) {
    if (ids.has(c.id)) throw new Error(`cena repetida no roteiro: ${c.id}`);
    ids.add(c.id);
    if (c.transicao && !TIPOS_TRANSICAO.includes(c.transicao)) {
      throw new Error(`transição desconhecida na cena ${c.id}: "${c.transicao}" (tem: ${TIPOS_TRANSICAO.join(', ')})`);
    }
  }
  if (ROTEIRO.cenas[0].transicao) throw new Error(`a primeira cena (${ROTEIRO.cenas[0].id}) não tem transição de entrada`);

  // troca i leva à cena i + 1; o pedido dela fica na cena que chega
  const plano = planejar(ROTEIRO.cenas.slice(1).map((c) => c.transicao), ESTILO.transicoes, ROTEIRO.titulo);
  const trocas: Troca[] = plano.map((e) => ({...e, dura: TRANSICOES[e.tipo].dura, entra: TRANSICOES[e.tipo].entra, som: TRANSICOES[e.tipo].som}));

  let de = 0;
  const cenas = ROTEIRO.cenas.map((c, indice): Cena => {
    const trocaAntes = indice === 0 ? null : trocas[indice - 1];
    const trocaDepois = indice < trocas.length ? trocas[indice] : null;
    const entra = trocaAntes ? Math.round(trocaAntes.dura * trocaAntes.entra) : 0;
    const extra = c.extra ?? 0;
    const minimo = Math.round((c.segundos ?? 0) * FPS);
    const base = {id: c.id, indice, de, entra, trocaAntes, trocaDepois};
    if (!c.fala) {
      if (!c.segundos) throw new Error(`a cena ${c.id} não tem "fala" nem "segundos" no roteiro`);
      const cena: Cena = {...base, dura: minimo + extra, fala: null, falaDura: 0, arquivo: null, marcas: {}, palavras: []};
      de += cena.dura;
      return cena;
    }
    const gerada = NARRACAO.cenas[c.id];
    if (!gerada || gerada.fala !== c.fala || NARRACAO.voz !== ROTEIRO.voz.nome) {
      throw new Error(`a fala da cena "${c.id}" mudou ou ainda não foi gerada: rode npm run narrar`);
    }
    // o vídeo abre já falando (gancho no primeiro quadro); as outras cenas esperam a troca assentar
    const fala = indice === 0 ? 2 : entra + ANTES;
    const falaDura = Math.ceil(gerada.duracao * FPS);
    const marcas: Record<string, number> = {};
    for (const [nome, t] of Object.entries(gerada.marcas)) marcas[nome] = fala + Math.round(t * FPS);
    const palavras = gerada.palavras.map((p) => ({q: fala + Math.round(p.t * FPS), d: Math.max(1, Math.round(p.d * FPS)), texto: p.texto}));
    const cena: Cena = {...base, dura: Math.max(fala + falaDura + DEPOIS, minimo) + extra, fala, falaDura, arquivo: gerada.arquivo, marcas, palavras};
    de += cena.dura;
    return cena;
  });
  return {cenas, trocas, duracao: de};
};

export const LINHA = montar();

export const acharCena = (id: string): Cena => {
  const c = LINHA.cenas.find((x) => x.id === id);
  if (!c) throw new Error(`cena desconhecida: ${id}`);
  return c;
};

// quadro do vídeo inteiro: em('ideia', 30) é o quadro 30 da cena "ideia"; marca('ideia', 'tempo') é a palavra marcada
export const em = (id: string, relativo: number) => acharCena(id).de + relativo;
export const marca = (id: string, nome: string) => {
  const q = acharCena(id).marcas[nome];
  if (q === undefined) throw new Error(`a cena ${id} não tem a marca {${nome}}`);
  return acharCena(id).de + q;
};

type Contexto = {cena: Cena; formato: Formato};
const CenaContexto = createContext<Contexto | null>(null);
export const CenaProvider = CenaContexto.Provider;

export const useCena = () => {
  const ctx = useContext(CenaContexto);
  if (!ctx) throw new Error('useCena fora de uma cena');
  const {cena, formato} = ctx;
  return {
    ...cena,
    // quadro (relativo) em que a cena some: o meio da troca seguinte, ou o fim do vídeo
    sai: cena.dura + (cena.trocaDepois ? Math.round(cena.trocaDepois.dura * cena.trocaDepois.entra) : 0),
    formato: {...formato, vertical: formato.altura > formato.largura},
    // quadro (relativo à cena) em que a palavra marcada com {nome} começa a ser dita
    quando: (nome: string): number => {
      const q = cena.marcas[nome];
      if (q === undefined) throw new Error(`a cena ${cena.id} não tem a marca {${nome}} (ou não tem fala)`);
      return q;
    },
    // quadro (relativo) da batida n contada a partir de quando a cena aparece
    batida: (n: number): number => cena.entra + Math.round(n * QPB),
  };
};
