// Entradas (e saídas) de elementos. Não existe entrada "só fade": opacidade aparece só como apoio de um movimento
// de verdade (máscara, recorte, escala, desfoque, rotação), e por poucos quadros. O conferir.py barra fade solto
// nas cenas e entrada que se repete demais.
//
//   <Entra tipo="recorte" inicio={quando('preco')} direcao="dir">...</Entra>
//   const proxima = useEntradas();  <Entra tipo={proxima()} ...>   gira pelas entradas do estilo, sem repetir em seguida
//
// direcao é para onde o elemento anda ao entrar: "cima" (vem de baixo), "baixo", "esq", "dir".
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {ESTILO, MOLA_QUICA, MOLA_VIVA} from '../estilo';
import {useCena} from '../linha';
import type {TipoEntrada} from '../movimento/estilos';

export type Direcao = 'cima' | 'baixo' | 'esq' | 'dir';

const L = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lim = (t: number) => Math.min(1, Math.max(0, t));
// na saída o progresso volta de 1 a 0 com a origem invertida: o elemento continua andando no mesmo sentido e sai
// pelo outro lado, em vez de voltar por onde veio
const OPOSTA: Record<Direcao, Direcao> = {cima: 'baixo', baixo: 'cima', esq: 'dir', dir: 'esq'};
// vetor de onde o elemento começa (oposto ao sentido em que anda)
const ORIGEM: Record<Direcao, [number, number]> = {cima: [0, 1], baixo: [0, -1], esq: [1, 0], dir: [-1, 0]};

type Visual = {fora?: React.CSSProperties; dentro: React.CSSProperties};

// q: progresso já com curva (0 a 1; mola pode passar de 1)
export const visualDaEntrada = (tipo: TipoEntrada, q: number, direcao: Direcao, distancia: number): Visual => {
  const [ox, oy] = ORIGEM[direcao];
  const r = 1 - q;
  switch (tipo) {
    case 'mascara':
      return {fora: {overflow: 'hidden'}, dentro: {transform: `translate(${ox * r * 110}%, ${oy * r * 110}%)`}};
    case 'recorte': {
      const corte = `${lim(r) * 100}%`;
      const inset = {dir: `inset(0 ${corte} 0 0)`, esq: `inset(0 0 0 ${corte})`, cima: `inset(${corte} 0 0 0)`, baixo: `inset(0 0 ${corte} 0)`}[direcao];
      return {dentro: {clipPath: inset, transform: `translate(${ox * r * 28}px, ${oy * r * 28}px)`}};
    }
    case 'mola':
      return {dentro: {transform: `translate(${ox * r * distancia}px, ${oy * r * distancia}px) scale(${0.82 + 0.18 * q})`, opacity: lim(q * 4)}};
    case 'foco':
      return {dentro: {filter: `blur(${lim(r) * 26}px)`, transform: `scale(${1.14 - 0.14 * q})`, opacity: lim(q * 3)}};
    case 'desliza': {
      const lado = ox !== 0 ? ox : oy;
      return {dentro: {transform: `translate(${ox * r * distancia * 1.6}px, ${oy * r * distancia * 1.6}px) rotate(${r * -7 * lado}deg)`, opacity: lim(q * 3)}};
    }
    case 'quica': {
      const sobra = Math.max(0, q - 1);
      return {
        dentro: {
          transform: `translateY(${-r * 240}px) scale(${1 + sobra * 0.5}, ${1 - sobra * 0.5})`,
          transformOrigin: 'bottom center',
          opacity: lim(q * 6),
        },
      };
    }
    case 'gira': {
      const eixo = oy !== 0 ? `rotateX(${-oy * r * 95}deg)` : `rotateY(${ox * r * 95}deg)`;
      const origem = {cima: 'bottom center', baixo: 'top center', esq: 'center right', dir: 'center left'}[direcao];
      return {fora: {perspective: 1000}, dentro: {transform: eixo, transformOrigin: origem, opacity: lim(q * 2.5)}};
    }
    case 'cresce': {
      const horizontal = ox !== 0;
      const origem = {dir: 'left center', esq: 'right center', cima: 'center bottom', baixo: 'center top'}[direcao];
      return {dentro: {transform: horizontal ? `scaleX(${lim(q)})` : `scaleY(${lim(q)})`, transformOrigin: origem}};
    }
    case 'ilumina':
      return {dentro: {filter: `brightness(${1 + lim(r) * 3}) blur(${lim(r) * 12}px)`, transform: `scale(${1.06 - 0.06 * q})`, opacity: lim(q * 2.5)}};
    case 'degraus': {
      const s = q >= 1 ? 1 : Math.floor(q * 5) / 5;
      return {dentro: {clipPath: `inset(0 0 ${(1 - s) * 100}% 0)`, transform: `translateY(${(1 - s) * 30}px)`}};
    }
  }
};

const MOLAS: Partial<Record<TipoEntrada, typeof MOLA_VIVA>> = {mola: MOLA_VIVA, quica: MOLA_QUICA};
const CURVA: Partial<Record<TipoEntrada, (t: number) => number>> = {foco: Easing.out(Easing.exp), ilumina: Easing.out(Easing.exp)};

type Props = {
  tipo: TipoEntrada;
  inicio: number;
  duracao?: number;
  direcao?: Direcao;
  distancia?: number; // px que mola e desliza percorrem
  saida?: number; // quadro em que sai (a mesma entrada ao contrário, 2/3 do tempo, acelerando)
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const progressoDaEntrada = (tipo: TipoEntrada, f: number, fps: number, inicio: number, duracao: number): number => {
  const mola = MOLAS[tipo];
  if (mola) return spring({frame: f - inicio, fps, config: mola, durationInFrames: duracao + 8});
  return interpolate(f, [inicio, inicio + duracao], [0, 1], {...L, easing: CURVA[tipo] ?? Easing.out(Easing.cubic)});
};

export const Entra: React.FC<Props> = ({tipo, inicio, duracao = 18, direcao = 'cima', distancia = 60, saida, style, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  let q = progressoDaEntrada(tipo, f, fps, inicio, duracao);
  let dir = direcao;
  if (saida !== undefined && f >= saida) {
    const k = interpolate(f, [saida, saida + Math.max(4, Math.round(duracao * 0.66))], [0, 1], {...L, easing: Easing.in(Easing.cubic)});
    q = 1 - k;
    dir = OPOSTA[direcao];
  }
  const {fora, dentro} = visualDaEntrada(tipo, q, dir, distancia);
  return (
    <div style={{...fora, ...style}}>
      <div style={dentro}>{children}</div>
    </div>
  );
};

// gira pelas entradas do estilo começando num ponto diferente em cada cena: cenas vizinhas não abrem iguais
export const useEntradas = (): (() => TipoEntrada) => {
  const {indice} = useCena();
  const lista = ESTILO.entradas;
  let i = 0;
  return () => lista[(indice * 2 + i++) % lista.length];
};
