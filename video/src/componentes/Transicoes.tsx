// O desenho das transições (o catálogo está em movimento/transicoes-dados.ts e a escolha em movimento/planejar.ts).
// As cenas são transparentes sobre o fundo contínuo. Cada transição diz duas coisas:
//   visualDaCena(): como a cena que sai e a que entra aparecem durante a troca (esconder, mover, recortar,
//                   desfocar, ou dividir em partes);
//   <Cobertura>:    o que passa por cima no momento da troca (faixa, painel, blocos, tinta, aro, faixas de glitch).
// "variante" (0 a 7, do planejador) muda direção, ângulo ou ponto de origem, para a mesma transição nunca vir igual.
import {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Troca} from '../linha';
import {COR} from '../tema';

export type Visual = {oculta?: boolean; estilo?: React.CSSProperties; partes?: React.CSSProperties[]};

const L = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lim = (t: number) => Math.min(1, Math.max(0, t));
const IN_OUT = Easing.inOut(Easing.cubic);
const IN_OUT_FORTE = Easing.inOut(Easing.poly(5));
const ENTRA = Easing.in(Easing.cubic);
const SAI = Easing.out(Easing.cubic);

// [x, y]: de que lado a cena nova vem
const DIRECOES: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// pontos de origem (fração da tela) para íris e afins
const ORIGENS: [number, number][] = [[0.5, 0.5], [0.22, 0.3], [0.78, 0.7], [0.5, 0.82], [0.18, 0.78], [0.82, 0.22], [0.5, 0.18], [0.32, 0.62]];
const CANTOS: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]];

const raioAteCanto = (x: number, y: number, w: number, h: number) => Math.max(...CANTOS.map(([a, b]) => Math.hypot(a * w - x, b * h - y)));

export const visualDaCena = (t: Troca, papel: 'entra' | 'sai', p: number, w: number, h: number): Visual => {
  const v = t.variante;
  switch (t.tipo) {
    case 'iris': {
      const [ox, oy] = ORIGENS[v % ORIGENS.length];
      const x = ox * w;
      const y = oy * h;
      const r = IN_OUT(lim(p)) * raioAteCanto(x, y, w, h) * 1.02;
      if (papel === 'entra') return {estilo: {clipPath: `circle(${r}px at ${x}px ${y}px)`}};
      const mascara = `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 1}px)`;
      return {estilo: {maskImage: mascara, WebkitMaskImage: mascara}};
    }
    case 'empurra': {
      const [dx, dy] = DIRECOES[v % 4];
      const e = IN_OUT_FORTE(lim(p));
      const borrao = `blur(${Math.sin(Math.PI * lim(p)) * 10}px)`;
      if (papel === 'sai') return {estilo: {transform: `translate(${-dx * e * 100}%, ${-dy * e * 100}%)`, filter: borrao}};
      return {estilo: {transform: `translate(${dx * (1 - e) * 100}%, ${dy * (1 - e) * 100}%)`, filter: borrao}};
    }
    case 'chicote': {
      const lado = v % 2 === 0 ? 1 : -1;
      if (papel === 'sai') {
        if (p >= 0.5) return {oculta: true};
        const k = interpolate(p, [0, 0.5], [0, 1], {...L, easing: ENTRA});
        return {estilo: {transform: `translateX(${-lado * k * 70}%) skewX(${lado * k * 8}deg)`, filter: `blur(${k * 48}px)`}};
      }
      if (p < 0.5) return {oculta: true};
      const k = interpolate(p, [0.5, 1], [1, 0], {...L, easing: SAI});
      return {estilo: {transform: `translateX(${lado * k * 70}%) skewX(${lado * k * 8}deg)`, filter: `blur(${k * 48}px)`}};
    }
    case 'zoom': {
      const [ox, oy] = ORIGENS[v % ORIGENS.length];
      const origem = `${ox * 100}% ${oy * 100}%`;
      if (papel === 'sai') {
        if (p >= 0.5) return {oculta: true};
        const s = interpolate(p, [0, 0.5], [1, 3.2], {...L, easing: ENTRA});
        return {estilo: {transform: `scale(${s})`, transformOrigin: origem, filter: `blur(${interpolate(p, [0, 0.5], [0, 26], L)}px)`, opacity: interpolate(p, [0.25, 0.5], [1, 0], L)}};
      }
      if (p < 0.4) return {oculta: true};
      const s = interpolate(p, [0.4, 1], [0.55, 1], {...L, easing: SAI});
      return {estilo: {transform: `scale(${s})`, filter: `blur(${interpolate(p, [0.4, 1], [22, 0], {...L, easing: SAI})}px)`, opacity: interpolate(p, [0.4, 0.55], [0, 1], L)}};
    }
    case 'divide': {
      const vertical = v % 2 === 0; // racha na horizontal: metade de cima sobe, a de baixo desce
      if (papel === 'sai') {
        const e = interpolate(p, [0, 1], [0, 62], {...L, easing: ENTRA});
        return vertical
          ? {partes: [{clipPath: 'inset(0 0 50% 0)', transform: `translateY(${-e}%)`}, {clipPath: 'inset(50% 0 0 0)', transform: `translateY(${e}%)`}]}
          : {partes: [{clipPath: 'inset(0 50% 0 0)', transform: `translateX(${-e}%)`}, {clipPath: 'inset(0 0 0 50%)', transform: `translateX(${e}%)`}]};
      }
      if (p < 0.2) return {oculta: true};
      return {
        estilo: {
          transform: `scale(${interpolate(p, [0.2, 1], [0.88, 1], {...L, easing: SAI})})`,
          filter: `blur(${interpolate(p, [0.2, 0.8], [12, 0], L)}px)`,
        },
      };
    }
    case 'glitch': {
      const q = Math.floor(p * t.dura);
      const forca = Math.sin(Math.PI * lim(p));
      const dx = (random(`glitch-${v}-${papel}-${q}`) - 0.5) * 2 * forca * 70;
      const rgb = forca * 14;
      const estilo: React.CSSProperties = {
        transform: `translateX(${dx}px)`,
        filter: `drop-shadow(${rgb}px 0 0 rgba(255,40,80,.85)) drop-shadow(${-rgb}px 0 0 rgba(40,220,255,.85))`,
      };
      if (papel === 'sai') return p >= 0.5 ? {oculta: true} : {estilo};
      return p < 0.5 ? {oculta: true} : {estilo};
    }
    default: {
      // as que cobrem o corte (varredura, cortina, persiana, blocos, liquido) e o corte seco: troca no meio
      if (papel === 'sai') return p >= 0.5 ? {oculta: true} : {};
      return p < 0.5 ? {oculta: true} : {};
    }
  }
};

const Varredura: React.FC<{p: number; v: number}> = ({p, v}) => {
  const {width, height} = useVideoConfig();
  const angulos = [-28, 28, -62, 62, 152, -152, 118, -118];
  const diag = Math.hypot(width, height);
  const espessura = diag * 1.2;
  const curso = espessura / 2 + diag / 2;
  const d = interpolate(IN_OUT(p), [0, 1], [curso, -curso]);
  return (
    <div
      style={{
        position: 'absolute',
        left: width / 2 - diag * 1.5,
        top: height / 2 - espessura / 2,
        width: diag * 3,
        height: espessura,
        background: COR.destaque,
        transform: `rotate(${angulos[v % angulos.length]}deg) translateY(${d}px)`,
      }}
    />
  );
};

const Cortina: React.FC<{p: number; v: number}> = ({p, v}) => {
  const [dx, dy] = DIRECOES[v % 4];
  const k = p < 0.5 ? interpolate(p, [0, 0.5], [1, 0], {...L, easing: SAI}) : interpolate(p, [0.5, 1], [0, -1], {...L, easing: ENTRA});
  // o painel anda sempre no mesmo sentido (entra por um lado, sai pelo outro): o filete fica na borda da frente
  const borda: React.CSSProperties =
    dx !== 0 ? {top: 0, bottom: 0, width: 8, [dx > 0 ? 'left' : 'right']: 0} : {left: 0, right: 0, height: 8, [dy > 0 ? 'top' : 'bottom']: 0};
  return (
    <AbsoluteFill style={{background: COR.fundo2, transform: `translate(${dx * k * 100}%, ${dy * k * 100}%)`}}>
      <div style={{position: 'absolute', background: COR.destaque, ...borda}} />
    </AbsoluteFill>
  );
};

const Persiana: React.FC<{p: number; v: number}> = ({p, v}) => {
  const n = 7;
  const s = 0.2 / (n - 1);
  const deitada = v % 2 === 0;
  return (
    <AbsoluteFill style={{flexDirection: deitada ? 'column' : 'row'}}>
      {Array.from({length: n}, (_, i) => {
        const entrando = p < 0.5;
        const k = entrando ? IN_OUT(lim((p - i * s) / 0.3)) : 1 - IN_OUT(lim((p - 0.5 - i * s) / 0.3));
        const origem = entrando ? (deitada ? 'left' : 'top') : deitada ? 'right' : 'bottom';
        return (
          <div
            key={i}
            style={{
              flex: 1,
              margin: deitada ? '-1px 0' : '0 -1px',
              background: i % 2 ? COR.destaque : COR.fundo2,
              transform: deitada ? `scaleX(${k})` : `scaleY(${k})`,
              transformOrigin: origem,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Blocos: React.FC<{p: number; v: number}> = ({p, v}) => {
  const {width, height} = useVideoConfig();
  const cols = width >= height ? 12 : 7;
  const lado = width / cols;
  const lins = Math.ceil(height / lado);
  const [ox, oy] = CANTOS[v % 4];
  const dist = (c: number, l: number, x: number, y: number) => Math.hypot(c / (cols - 1) - x, l / (lins - 1) - y) / Math.SQRT2;
  const celulas = [];
  for (let l = 0; l < lins; l++) {
    for (let c = 0; c < cols; c++) {
      const k = p < 0.5 ? SAI(lim((p - dist(c, l, ox, oy) * 0.25) / 0.25)) : 1 - ENTRA(lim((p - 0.5 - dist(c, l, 1 - ox, 1 - oy) * 0.25) / 0.25));
      if (k <= 0) continue;
      celulas.push(
        <div
          key={`${c}-${l}`}
          style={{position: 'absolute', left: c * lado - 1, top: l * lado - 1, width: lado + 2, height: lado + 2, background: (c + l) % 5 === 0 ? COR.destaque : COR.fundo2, transform: `scale(${k})`}}
        />,
      );
    }
  }
  return <AbsoluteFill>{celulas}</AbsoluteFill>;
};

const Liquido: React.FC<{p: number; v: number}> = ({p, v}) => {
  const {width: w, height: h} = useVideoConfig();
  const id = `goo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const camada = (atraso: number, cor: string, fase: number) => {
    const q = lim(p - atraso);
    const topo = h * (1 - IN_OUT(lim(q / 0.5)) * 1.18);
    const base = h * (1.18 - IN_OUT(lim((q - 0.5) / 0.5)) * 1.36);
    const onda = (x: number, y0: number, f: number) =>
      y0 + h * 0.05 * Math.sin((x / w) * Math.PI * 2 * 1.3 + f + p * 9) + h * 0.025 * Math.sin((x / w) * Math.PI * 2 * 3.1 + f * 2 - p * 7);
    const pts = 28;
    let d = '';
    for (let i = 0; i <= pts; i++) {
      const x = (i / pts) * w;
      d += `${i === 0 ? 'M' : 'L'} ${x} ${onda(x, topo, fase)} `;
    }
    for (let i = pts; i >= 0; i--) {
      const x = (i / pts) * w;
      d += `L ${x} ${onda(x, base, fase + 2)} `;
    }
    const gotas = Array.from({length: 7}, (_, i) => {
      const gx = w * ((i + 0.5) / 7 + (random(`gota-${v}-${i}`) - 0.5) * 0.08);
      const sobe = Math.sin(Math.PI * lim(q / 0.55)) * h * (0.06 + random(`gota-a-${v}-${i}`) * 0.08);
      return <circle key={i} cx={gx} cy={onda(gx, topo, fase) - sobe} r={h * (0.025 + random(`gota-r-${v}-${i}`) * 0.025)} fill={cor} />;
    });
    return (
      <g filter={`url(#${id})`}>
        <path d={d + 'Z'} fill={cor} />
        {q < 0.55 && gotas}
      </g>
    );
  };
  return (
    <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={h * 0.012} result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </defs>
      {camada(0, COR.apoio, v)}
      {camada(0.06, COR.destaque, v + 1.7)}
    </svg>
  );
};

const AroIris: React.FC<{p: number; v: number}> = ({p, v}) => {
  const {width: w, height: h} = useVideoConfig();
  const [ox, oy] = ORIGENS[v % ORIGENS.length];
  const x = ox * w;
  const y = oy * h;
  const r = IN_OUT(lim(p)) * raioAteCanto(x, y, w, h) * 1.02;
  return (
    <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={COR.destaque} strokeWidth={10} />
    </svg>
  );
};

const FaixasGlitch: React.FC<{p: number; v: number; dura: number}> = ({p, v, dura}) => {
  const {width: w, height: h} = useVideoConfig();
  const q = Math.floor(p * dura);
  const forca = Math.sin(Math.PI * lim(p));
  const cores = [COR.destaque, COR.texto, COR.apoio];
  return (
    <AbsoluteFill style={{mixBlendMode: 'difference'}}>
      {Array.from({length: 7}, (_, i) => {
        const r = (k: string) => random(`faixa-${v}-${q}-${i}-${k}`);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: r('y') * h,
              left: r('x') * w * 0.4,
              width: w * (0.3 + r('w') * 0.7),
              height: (4 + r('h') * 50) * forca,
              background: cores[i % 3],
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Cobertura: React.FC<{troca: Troca}> = ({troca}) => {
  const f = useCurrentFrame();
  const p = lim(f / troca.dura);
  if (p <= 0 || p >= 1) return null;
  const v = troca.variante;
  let conteudo: React.ReactNode = null;
  if (troca.tipo === 'varredura') conteudo = <Varredura p={p} v={v} />;
  else if (troca.tipo === 'cortina') conteudo = <Cortina p={p} v={v} />;
  else if (troca.tipo === 'persiana') conteudo = <Persiana p={p} v={v} />;
  else if (troca.tipo === 'blocos') conteudo = <Blocos p={p} v={v} />;
  else if (troca.tipo === 'liquido') conteudo = <Liquido p={p} v={v} />;
  else if (troca.tipo === 'iris') conteudo = <AroIris p={p} v={v} />;
  else if (troca.tipo === 'glitch') conteudo = <FaixasGlitch p={p} v={v} dura={troca.dura} />;
  if (!conteudo) return null;
  return <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>{conteudo}</AbsoluteFill>;
};
