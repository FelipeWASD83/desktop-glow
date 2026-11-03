// Peças pequenas que quase toda cena usa: Respira (a câmera aproxima devagar no tempo parado), Traco (um caminho SVG
// que se desenha) e Guias (a zona segura, só para conferir). Para entrada de elemento, usar <Entra> (Entra.tsx).
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {useCena} from '../linha';
import {COR, FONTE_APOIO, type Formato} from '../tema';

const L = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Respira: React.FC<{children: React.ReactNode; quanto?: number}> = ({children, quanto = 0.03}) => {
  const f = useCurrentFrame();
  const cena = useCena();
  const s = interpolate(f, [cena.entra, cena.sai], [1, 1 + quanto], L);
  return <AbsoluteFill style={{transform: `scale(${s})`}}>{children}</AbsoluteFill>;
};

type PropsTraco = {
  d: string;
  largura: number;
  altura: number;
  inicio: number;
  duracao?: number;
  cor?: string;
  espessura?: number;
  style?: React.CSSProperties;
};

export const Traco: React.FC<PropsTraco> = ({d, largura, altura, inicio, duracao = 18, cor = COR.destaque, espessura = 8, style}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [inicio, inicio + duracao], [0, 1], {...L, easing: Easing.inOut(Easing.cubic)});
  const {strokeDasharray, strokeDashoffset} = evolvePath(p, d);
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} style={{overflow: 'visible', ...style}}>
      <path d={d} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" />
    </svg>
  );
};

export const Guias: React.FC<{formato: Formato}> = ({formato}) => {
  const {topo, dir, base, esq} = formato.seguro;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: esq, top: topo, right: dir, bottom: base, border: '4px dashed rgba(255,70,70,.85)'}} />
      <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(255,70,70,.35)'}} />
      <div style={{position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(255,70,70,.35)'}} />
      <div style={{position: 'absolute', left: esq + 12, top: topo + 8, fontFamily: FONTE_APOIO, fontSize: 28, color: 'rgba(255,70,70,.95)'}}>
        zona segura {formato.id}
      </div>
    </AbsoluteFill>
  );
};
