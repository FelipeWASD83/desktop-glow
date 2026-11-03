// Efeitos de acabamento. Todos determinísticos (sem Math.random): o mesmo quadro sai sempre igual.
//   <Brilho>            glow por trás do conteúdo (texto, ícone, número)
//   <Particulas>        poeira, brasa, neve ou bokeh, com movimento orgânico (ruído)
//   <Luz>               luz vazada quente passando por cima (light leak)
//   <Aberracao>         separação de cor (RGB split), forca em px; animar a forca, não deixar fixa alta
//   <Gotas>             bolhas que se fundem (efeito líquido)
//   <Contador>          número que corre até o valor, com dígitos de largura fixa
//   <TextoMascara>      texto preenchido por um degradê (ou imagem) que anda
//   <Malha>             gradiente de malha vivo, para fundo de painel ou cena
//   <Morfo>             forma SVG que vira outra (interpolatePath)
//   <Rastro>            desfoque de movimento de câmera (pesa no render: só em movimento rápido)
import {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {interpolatePath} from '@remotion/paths';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {chave, type Curva} from '../movimento/chaves';
import {COR, FONTE_TITULO} from '../tema';
import {LINGUA} from '../textos';

const L = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const idSvg = (bruto: string) => bruto.replace(/[^a-zA-Z0-9]/g, '');

export const Brilho: React.FC<{children: React.ReactNode; raio?: number; forca?: number; pulso?: number; style?: React.CSSProperties}> = ({
  children,
  raio = 28,
  forca = 0.9,
  pulso = 0,
  style,
}) => {
  const f = useCurrentFrame();
  const k = Math.max(0, forca * (1 + pulso * Math.sin(f / 12)));
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{position: 'absolute', inset: 0, filter: `blur(${raio}px) brightness(1.4)`, opacity: Math.min(1, k), mixBlendMode: 'screen'}}>{children}</div>
      <div style={{position: 'relative'}}>{children}</div>
    </div>
  );
};

export type TipoParticula = 'poeira' | 'brasa' | 'neve' | 'bokeh';

export const Particulas: React.FC<{tipo?: TipoParticula; quantidade?: number; cor?: string; semente?: string}> = ({
  tipo = 'poeira',
  quantidade = 60,
  cor = COR.texto,
  semente = 'particulas',
}) => {
  const f = useCurrentFrame();
  const {width: w, height: h} = useVideoConfig();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {Array.from({length: quantidade}, (_, i) => {
        const r = (k: string) => random(`${semente}-${i}-${k}`);
        let x = r('x') * w;
        let y = r('y') * h;
        let tam = 2 + r('t') * 4;
        let borrao = 0;
        let alfa = 0.25 + 0.5 * (0.5 + 0.5 * noise2D(`${semente}-a`, i, f / 40));
        let brilho = 0;
        if (tipo === 'poeira') {
          x += noise2D(`${semente}-x`, i, f / 150) * 70;
          y += noise2D(`${semente}-y`, i, f / 170) * 70;
        } else if (tipo === 'brasa') {
          const vel = 0.8 + r('v') * 2.2;
          y = (((r('y') * (h + 80) - f * vel) % (h + 80)) + h + 80) % (h + 80) - 40;
          x += Math.sin(f / 25 + i) * 18 + noise2D(`${semente}-x`, i, f / 90) * 30;
          brilho = tam * 3;
        } else if (tipo === 'neve') {
          const vel = 0.6 + r('v') * 1.6;
          y = ((r('y') * (h + 40) + f * vel) % (h + 40)) - 20;
          x += Math.sin(f / 40 + i * 1.7) * 30;
        } else {
          tam = 40 + r('t') * 140;
          borrao = 6 + r('b') * 16;
          alfa = 0.06 + 0.12 * (0.5 + 0.5 * noise2D(`${semente}-a`, i, f / 90));
          x += noise2D(`${semente}-x`, i, f / 300) * 120;
          y += noise2D(`${semente}-y`, i, f / 320) * 90;
        }
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - tam / 2,
              top: y - tam / 2,
              width: tam,
              height: tam,
              borderRadius: '50%',
              background: cor,
              opacity: alfa,
              filter: borrao ? `blur(${borrao}px)` : undefined,
              boxShadow: brilho ? `0 0 ${brilho}px ${cor}` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Luz: React.FC<{intensidade?: number; cores?: string[]; semente?: string}> = ({
  intensidade = 0.5,
  cores = ['rgba(255,150,60,.9)', 'rgba(255,80,120,.7)', 'rgba(255,220,140,.8)'],
  semente = 'luz',
}) => {
  const f = useCurrentFrame();
  const {width: w, height: h} = useVideoConfig();
  const maior = Math.max(w, h);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', opacity: intensidade, pointerEvents: 'none'}}>
      {cores.map((cor, i) => {
        const x = (0.5 + 0.5 * noise2D(`${semente}-x`, i, f / 200)) * w;
        const y = (0.5 + 0.5 * noise2D(`${semente}-y`, i, f / 230)) * h;
        const r = maior * (0.25 + 0.15 * (0.5 + 0.5 * noise2D(`${semente}-r`, i, f / 160)));
        return <div key={i} style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, background: `radial-gradient(circle, ${cor} 0%, transparent 65%)`}} />;
      })}
    </AbsoluteFill>
  );
};

export const Aberracao: React.FC<{forca: number; children: React.ReactNode; style?: React.CSSProperties}> = ({forca, children, style}) => {
  const id = `rgb${idSvg(useId())}`;
  return (
    <div style={style}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={forca} dy={0} result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-forca} dy={0} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </svg>
      <div style={{filter: `url(#${id})`}}>{children}</div>
    </div>
  );
};

export const Gotas: React.FC<{quantidade?: number; raio?: number; cor?: string; semente?: string; tamanho?: number}> = ({
  quantidade = 7,
  raio = 70,
  cor = COR.destaque,
  semente = 'gotas',
  tamanho = 520,
}) => {
  const f = useCurrentFrame();
  const id = `goo${idSvg(useId())}`;
  const c = tamanho / 2;
  return (
    <svg width={tamanho} height={tamanho} style={{overflow: 'visible'}}>
      <defs>
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={raio * 0.28} result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        {Array.from({length: quantidade}, (_, i) => {
          const ang = (i / quantidade) * Math.PI * 2 + f / (60 + i * 7);
          const dist = c * 0.45 * (0.5 + 0.5 * noise2D(semente, i, f / 70));
          const r = raio * (0.6 + 0.4 * (0.5 + 0.5 * noise2D(`${semente}-r`, i, f / 50)));
          return <circle key={i} cx={c + Math.cos(ang) * dist} cy={c + Math.sin(ang) * dist} r={r} fill={cor} />;
        })}
        <circle cx={c} cy={c} r={raio * 1.2} fill={cor} />
      </g>
    </svg>
  );
};

export const Contador: React.FC<{
  ate: number;
  de?: number;
  inicio: number;
  duracao?: number;
  casas?: number;
  prefixo?: string;
  sufixo?: string;
  tamanho?: number;
  cor?: string;
  style?: React.CSSProperties;
}> = ({ate, de = 0, inicio, duracao = 40, casas = 0, prefixo = '', sufixo = '', tamanho = 160, cor = COR.texto, style}) => {
  const f = useCurrentFrame();
  // poly(4) chega exatamente no valor no último quadro (a curva exponencial para em 99,9%: 1.249 em vez de 1.250)
  const v = interpolate(f, [inicio, inicio + duracao], [de, ate], {...L, easing: Easing.out(Easing.poly(4))});
  const texto = v.toLocaleString(LINGUA === 'pt' ? 'pt-BR' : 'en-US', {minimumFractionDigits: casas, maximumFractionDigits: casas});
  return (
    <div style={{fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: tamanho, color: cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', ...style}}>
      {prefixo}
      {texto}
      {sufixo}
    </div>
  );
};

export const TextoMascara: React.FC<{texto: string; tamanho: number; fundo?: string; velocidade?: number; style?: React.CSSProperties}> = ({
  texto,
  tamanho,
  fundo = `linear-gradient(110deg, ${COR.destaque} 0%, ${COR.texto} 35%, ${COR.apoio} 65%, ${COR.destaque} 100%)`,
  velocidade = 2,
  style,
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: FONTE_TITULO,
        fontWeight: 800,
        fontSize: tamanho,
        letterSpacing: '-0.03em',
        backgroundImage: fundo,
        backgroundSize: '300% 100%',
        backgroundPosition: `${(f * velocidade) % 300}% 50%`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        ...style,
      }}
    >
      {texto}
    </div>
  );
};

export const Malha: React.FC<{cores?: string[]; semente?: string; style?: React.CSSProperties}> = ({
  cores = [COR.destaque, COR.apoio, COR.fundo2, COR.texto],
  semente = 'malha',
  style,
}) => {
  const f = useCurrentFrame();
  const camadas = cores.map((cor, i) => {
    const x = 50 + 40 * noise2D(`${semente}-x`, i, f / 180);
    const y = 50 + 40 * noise2D(`${semente}-y`, i, f / 200);
    return `radial-gradient(circle at ${x}% ${y}%, ${cor} 0%, transparent 55%)`;
  });
  return <AbsoluteFill style={{background: `${camadas.join(', ')}, ${COR.fundo}`, filter: 'saturate(1.1)', ...style}} />;
};

export const Morfo: React.FC<{formas: string[]; quadros: number[]; largura: number; altura: number; cor?: string; curva?: Curva}> = ({
  formas,
  quadros,
  largura,
  altura,
  cor = COR.destaque,
  curva = 'suave',
}) => {
  const f = useCurrentFrame();
  if (formas.length !== quadros.length || formas.length < 2) throw new Error('Morfo: formas e quadros com o mesmo tamanho, pelo menos 2');
  // posição contínua na lista de formas (0 = primeira, 1 = segunda...), com a curva entre cada par
  const pos = chave(f, quadros.map((q, i) => [q, i] as [number, number]), curva);
  const i = Math.min(formas.length - 2, Math.floor(pos));
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} style={{overflow: 'visible'}}>
      <path d={interpolatePath(pos - i, formas[i], formas[i + 1])} fill={cor} />
    </svg>
  );
};

// desfoque de movimento: tudo dentro dele é renderizado "samples" vezes por quadro. Usar só em trecho rápido.
export const Rastro: React.FC<{children: React.ReactNode; obturador?: number; amostras?: number}> = ({children, obturador = 180, amostras = 6}) => (
  <CameraMotionBlur shutterAngle={obturador} samples={amostras}>
    <AbsoluteFill>{children}</AbsoluteFill>
  </CameraMotionBlur>
);
