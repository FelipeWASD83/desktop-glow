// The ilha, redrawn for the videos from its own code (ilha/src/Ilha): a black pill that changes size on a spring and
// swaps what it shows. Sizes are the app's own, in DIPs: idle 128 x 32, compact 36 high (min 168), card radius 38.
// It cannot be photographed outside the screen (it draws in the DWM), so this is a redrawing, not a capture.
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../textos';
import {COR, FONTE_APOIO} from '../tema';

const L = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const CORAL = '#d97857';
export const LARANJA = '#ff9f0a';
export const VERDE = '#30d158';
export const VERMELHO = '#ff453a';

export type Estado = {q: number; w: number; h: number; r?: number; conteudo: React.ReactNode};

// the spring of the Dynamic Island: a little overshoot and settles
const MOLA = {damping: 15, stiffness: 190, mass: 0.85};

export const Pilula: React.FC<{estados: Estado[]; escala?: number; sombra?: boolean; style?: React.CSSProperties}> = ({estados, escala = 1, sombra = true, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  let i = 0;
  for (let k = 0; k < estados.length; k++) if (estados[k].q <= f) i = k;
  const atual = estados[i];
  const antes = estados[Math.max(0, i - 1)];
  const p = i === 0 ? 1 : spring({frame: f - atual.q, fps, config: MOLA});
  const w = antes.w + (atual.w - antes.w) * p;
  const h = antes.h + (atual.h - antes.h) * p;
  const raioAlvo = (e: Estado) => e.r ?? e.h / 2;
  const r = Math.min(h / 2, raioAlvo(antes) + (raioAlvo(atual) - raioAlvo(antes)) * Math.min(1, p));
  // the new content grows in from slightly smaller and sharp; the old one shrinks away in the first frames
  const k = interpolate(f - atual.q, [3, 13], [0, 1], L);
  const sai = interpolate(f - atual.q, [0, 5], [1, 0], L);
  return (
    <div
      style={{
        width: w * escala,
        height: h * escala,
        borderRadius: r * escala,
        background: '#000',
        boxShadow: sombra ? `0 ${10 * escala}px ${34 * escala}px rgba(0,0,0,.55), inset 0 0 0 ${1 * escala}px rgba(255,255,255,.14)` : `inset 0 0 0 ${escala}px rgba(255,255,255,.14)`,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {i > 0 && sai > 0 && antes.conteudo && (
        <div style={{position: 'absolute', inset: 0, opacity: sai, transform: `scale(${0.9 + 0.1 * sai})`, filter: `blur(${(1 - sai) * 6}px)`}}>
          <Centro escala={escala}>{antes.conteudo}</Centro>
        </div>
      )}
      <div style={{position: 'absolute', inset: 0, opacity: i === 0 ? 1 : k, transform: `scale(${i === 0 ? 1 : 0.86 + 0.14 * k})`, filter: `blur(${i === 0 ? 0 : (1 - k) * 8}px)`}}>
        <Centro escala={escala}>{atual.conteudo}</Centro>
      </div>
    </div>
  );
};

// content is drawn at 1 DIP = 1 px and scaled with the pill
const Centro: React.FC<{escala: number; children: React.ReactNode}> = ({escala, children}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{transform: `scale(${escala})`, transformOrigin: 'center', fontFamily: FONTE_APOIO, color: '#fff'}}>{children}</div>
  </div>
);

// ---- the ilha's states

export const Barras: React.FC<{n?: number; altura?: number; cor?: string; largura?: number; fase?: number; vivo?: number}> = ({
  n = 5,
  altura = 16,
  cor = CORAL,
  largura = 3,
  fase = 0,
  vivo = 1,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: largura * 0.9, height: altura}}>
      {Array.from({length: n}, (_, i) => {
        // a few sines at odd rates: looks like music, the same on every render
        const v = 0.25 + 0.75 * Math.abs(Math.sin((f + fase) * 0.21 + i * 1.7) * 0.6 + Math.sin((f + fase) * 0.37 + i * 0.9) * 0.4);
        return <div key={i} style={{width: largura, height: Math.max(largura, altura * v * vivo), borderRadius: largura, background: cor}} />;
      })}
    </div>
  );
};

export const Capa: React.FC<{tamanho: number; raio?: number}> = ({tamanho, raio = tamanho * 0.18}) => (
  // the cover of the clock's demo track (relogio-mond Demo.cs): a sunset with stripes
  <div style={{width: tamanho, height: tamanho, borderRadius: raio, overflow: 'hidden', position: 'relative', background: 'linear-gradient(160deg, #e2653f 0%, #a2427a 55%, #5b2a8c 100%)', flexShrink: 0}}>
    <div style={{position: 'absolute', left: '28%', top: '36%', width: '44%', height: '44%', borderRadius: '50%', background: 'linear-gradient(#f6c27a, #e9a35e)'}} />
    {[0.56, 0.63, 0.7].map((y) => (
      <div key={y} style={{position: 'absolute', left: '20%', right: '20%', top: `${y * 100}%`, height: '2.4%', background: '#b2487a'}} />
    ))}
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '20%', background: '#241338'}} />
  </div>
);

export const MusicaCompacta: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 150}}>
    <Capa tamanho={22} raio={6} />
    <Barras n={5} altura={15} />
  </div>
);

const Icone: React.FC<{d: string; tamanho?: number; cor?: string; preenchido?: boolean}> = ({d, tamanho = 18, cor = '#fff', preenchido = true}) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
    <path d={d} fill={preenchido ? cor : 'none'} stroke={preenchido ? 'none' : cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ANTERIOR = 'M6 5h2v14H6zM20 5v14L9 12z';
const PAUSA = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z';
const PROXIMA = 'M16 5h2v14h-2zM4 5v14l11-7z';

export const MusicaExpandida: React.FC<{progresso: number}> = ({progresso}) => (
  <div style={{width: 330, display: 'flex', flexDirection: 'column', gap: 14}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
      <Capa tamanho={62} raio={14} />
      <div style={{flex: 1}}>
        <div style={{fontSize: 16, fontWeight: 600}}>{T('tela.musica')}</div>
        <div style={{fontSize: 13, color: COR.textoSuave, marginTop: 2}}>{T('tela.artista')}</div>
      </div>
      <Barras n={6} altura={24} largura={3.5} />
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: COR.textoSuave}}>
      <span>{tempo(83 + progresso * 30)}</span>
      <div style={{flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.2)'}}>
        <div style={{width: `${(37 + progresso * 13).toFixed(2)}%`, height: 4, borderRadius: 2, background: '#fff'}} />
      </div>
      <span>3:44</span>
    </div>
    <div style={{display: 'flex', justifyContent: 'center', gap: 38, alignItems: 'center'}}>
      <Icone d={ANTERIOR} tamanho={20} />
      <Icone d={PAUSA} tamanho={26} />
      <Icone d={PROXIMA} tamanho={20} />
    </div>
  </div>
);

const tempo = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const Anel: React.FC<{valor: number; tamanho: number; cor: string; espessura?: number; children?: React.ReactNode}> = ({valor, tamanho, cor, espessura = 3, children}) => {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{position: 'relative', width: tamanho, height: tamanho, flexShrink: 0}}>
      <svg width={tamanho} height={tamanho} style={{transform: 'rotate(-90deg)'}}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke="rgba(255,255,255,.18)" strokeWidth={espessura} fill="none" />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={cor} strokeWidth={espessura} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - valor)} strokeLinecap="round" />
      </svg>
      {children && <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>}
    </div>
  );
};

export const TimerCompacto: React.FC<{segundos: number; total?: number}> = ({segundos, total = 1500}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 150}}>
    <Anel valor={segundos / total} tamanho={22} cor={LARANJA} espessura={3} />
    <span style={{fontSize: 15, fontWeight: 600, color: LARANJA, fontVariantNumeric: 'tabular-nums'}}>{tempo(segundos)}</span>
  </div>
);

export const TimerExpandido: React.FC<{segundos: number; total?: number}> = ({segundos, total = 1500}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 22, width: 300}}>
    <Anel valor={segundos / total} tamanho={86} cor={LARANJA} espessura={7}>
      <Icone d={PAUSA} tamanho={26} cor={LARANJA} />
    </Anel>
    <div>
      <div style={{fontSize: 13, color: COR.textoSuave}}>{T('tela.foco')}</div>
      <div style={{fontSize: 44, fontWeight: 600, color: LARANJA, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05}}>{tempo(segundos)}</div>
    </div>
  </div>
);

export const Onda: React.FC<{n?: number; altura?: number; cor?: string}> = ({n = 26, altura = 22, cor = '#fff'}) => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 2.5, height: altura}}>
      {Array.from({length: n}, (_, i) => {
        // a scrolling waveform: what was said moves left
        const t = (i - f * 0.9) * 0.55;
        const v = 0.15 + 0.85 * Math.abs(Math.sin(t) * Math.sin(t * 0.37 + 1.3) * Math.cos(t * 0.11));
        return <div key={i} style={{width: 3, height: Math.max(3, altura * v), borderRadius: 2, background: cor}} />;
      })}
    </div>
  );
};

export const Gravando: React.FC<{segundos: number}> = ({segundos}) => {
  const f = useCurrentFrame();
  const pisca = 0.55 + 0.45 * Math.abs(Math.cos(f / 9));
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 230}}>
      <div style={{width: 11, height: 11, borderRadius: '50%', background: VERMELHO, boxShadow: `0 0 ${10 * pisca}px ${VERMELHO}`}} />
      <Onda n={22} altura={18} />
      <span style={{fontSize: 14, fontWeight: 600, color: VERMELHO, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto'}}>{tempo(segundos)}</span>
    </div>
  );
};

const FONE = 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z';
export const Bateria: React.FC<{nivel: number}> = ({nivel}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 250}}>
    <Icone d={FONE} tamanho={22} preenchido={false} />
    <span style={{fontSize: 14, fontWeight: 600}}>{T('tela.fone')}</span>
    <span style={{marginLeft: 'auto', fontSize: 14, fontWeight: 600, color: nivel <= 10 ? VERMELHO : VERDE}}>{nivel}%</span>
    <Anel valor={nivel / 100} tamanho={22} cor={nivel <= 10 ? VERMELHO : VERDE} espessura={3} />
  </div>
);

const CADEADO = 'M12 4l6 7h-4v5h-4v-5H6z M8 19h8';
export const Caps: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 210}}>
    <Icone d={CADEADO} tamanho={20} preenchido={false} />
    <span style={{fontSize: 14, fontWeight: 600}}>{T('tela.caps')}</span>
  </div>
);

export const Camera: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 210}}>
    <div style={{width: 10, height: 10, borderRadius: '50%', background: VERDE, boxShadow: `0 0 8px ${VERDE}`}} />
    <span style={{fontSize: 14, fontWeight: 600}}>{T('tela.camera')}</span>
  </div>
);

export const Relogio: React.FC<{texto?: string}> = ({texto = '18:42'}) => (
  <span style={{fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>{texto}</span>
);

// the control center menu (1.4.0): blocks of different sizes fitted together
export const Central: React.FC<{volume: number}> = ({volume}) => {
  const bloco = (filho: React.ReactNode, w: number, h: number, cor = '#1c1c1f') => (
    <div style={{width: w, height: h, borderRadius: 18, background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6}}>{filho}</div>
  );
  const rotulo = (t: string) => <span style={{fontSize: 11, color: COR.textoSuave}}>{t}</span>;
  return (
    <div style={{display: 'flex', gap: 10}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        <div style={{display: 'flex', gap: 10}}>
          {bloco(<><Anel valor={0.7} tamanho={30} cor={LARANJA} espessura={4} />{rotulo(T('tela.timer'))}</>, 92, 92)}
          {bloco(<><div style={{width: 18, height: 18, borderRadius: '50%', background: VERMELHO}} />{rotulo(T('tela.gravar'))}</>, 92, 92)}
        </div>
        {bloco(
          <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 160}}>
            <Capa tamanho={40} raio={10} />
            <Barras n={7} altura={22} />
          </div>,
          194,
          74,
        )}
      </div>
      <div style={{display: 'flex', gap: 10}}>
        <div style={{width: 64, height: 176, borderRadius: 20, background: '#1c1c1f', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${volume * 100}%`, background: '#f5f5f7'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center', fontSize: 11, color: '#000', fontWeight: 600}}>{T('tela.som')}</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          {bloco(<>{rotulo(T('tela.brilho'))}</>, 92, 52)}
          {bloco(<>{rotulo(T('tela.tradutor'))}</>, 92, 52)}
          {bloco(<>{rotulo(T('tela.nota'))}</>, 92, 52)}
        </div>
      </div>
    </div>
  );
};

// ---- since ilha 3.x / 4.0: the live score of a competitive game, Steam downloads, weather changes and the menu balls

export const AZUL_TIME = '#5ea4ff';
export const LARANJA_TIME = '#ffb340';

// the score pill: two team marks, the score and the round clock (made-up match, no game's branding)
export const PlacarCompacto: React.FC<{nos: number; eles: number; relogio: string}> = ({nos, eles, relogio}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 220}}>
    <div style={{width: 10, height: 10, borderRadius: 3, background: AZUL_TIME}} />
    <span style={{fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{nos}</span>
    <span style={{fontSize: 13, color: COR.textoSuave}}>:</span>
    <span style={{fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{eles}</span>
    <div style={{width: 10, height: 10, borderRadius: 3, background: LARANJA_TIME}} />
    <span style={{marginLeft: 'auto', fontSize: 14, fontWeight: 600, color: COR.textoSuave, fontVariantNumeric: 'tabular-nums'}}>{relogio}</span>
  </div>
);

export const PlacarExpandido: React.FC<{nos: number; eles: number; relogio: string; abates: number}> = ({nos, eles, relogio, abates}) => (
  <div style={{width: 340, display: 'flex', flexDirection: 'column', gap: 12}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COR.textoSuave}}>
      <span>{T('tela.partida')}</span>
      <span style={{fontVariantNumeric: 'tabular-nums'}}>{relogio}</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22}}>
      <div style={{width: 16, height: 16, borderRadius: 5, background: AZUL_TIME}} />
      <span style={{fontSize: 46, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{nos}</span>
      <span style={{fontSize: 30, color: COR.textoSuave}}>:</span>
      <span style={{fontSize: 46, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{eles}</span>
      <div style={{width: 16, height: 16, borderRadius: 5, background: LARANJA_TIME}} />
    </div>
    <div style={{display: 'flex', justifyContent: 'space-around', fontSize: 13}}>
      <span>
        <span style={{color: COR.textoSuave}}>K / D </span>
        <b style={{fontVariantNumeric: 'tabular-nums'}}>{abates} / 9</b>
      </span>
      <span>
        <span style={{color: COR.textoSuave}}>Ping </span>
        <b style={{color: VERDE}}>18 ms</b>
      </span>
    </div>
  </div>
);

// a Steam download: the game's square, the percentage and a bar
export const Download: React.FC<{valor: number; largo?: boolean}> = ({valor, largo = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, width: largo ? 320 : 230}}>
    <div style={{width: largo ? 44 : 22, height: largo ? 44 : 22, borderRadius: largo ? 10 : 6, flexShrink: 0, background: 'linear-gradient(150deg, #4f7cff, #9a5bff)'}} />
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: largo ? 8 : 0}}>
      {largo && (
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13}}>
          <span style={{fontWeight: 600}}>{T('tela.download')}</span>
          <span style={{color: COR.textoSuave}}>48 MB/s</span>
        </div>
      )}
      <div style={{height: largo ? 6 : 4, borderRadius: 3, background: 'rgba(255,255,255,.2)'}}>
        <div style={{width: `${(valor * 100).toFixed(2)}%`, height: '100%', borderRadius: 3, background: valor >= 1 ? VERDE : '#fff'}} />
      </div>
    </div>
    <span style={{fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: valor >= 1 ? VERDE : '#fff'}}>{valor >= 1 ? '✓' : `${Math.floor(valor * 100)}%`}</span>
  </div>
);

const NUVEM = 'M7 17h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 10.2 3.5 3.5 0 0 0 7 17z';
export const Clima: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, width: 240}}>
      <div style={{position: 'relative', width: 24, height: 26}}>
        <Icone d={NUVEM} tamanho={24} />
        {[0, 1, 2].map((i) => {
          // three drops falling under the cloud, looping every 18 frames
          const y = ((f + i * 6) % 18) / 18;
          return <div key={i} style={{position: 'absolute', left: 6 + i * 6, top: 18 + y * 8, width: 2, height: 5, borderRadius: 1, background: AZUL_TIME, opacity: 1 - y}} />;
        })}
      </div>
      <span style={{fontSize: 14, fontWeight: 600}}>{T('tela.chuva')}</span>
      <span style={{marginLeft: 'auto', fontSize: 14, fontWeight: 600, color: COR.textoSuave}}>18°</span>
    </div>
  );
};

// the balls next to the open menu (4.0.0): one per activity running, each with its own shadow and border
export const Bolinha: React.FC<{tipo: 'musica' | 'timer' | 'download'; escala: number; inicio: number}> = ({tipo, escala, inicio}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - inicio, fps, config: MOLA});
  const lado = 46 * escala;
  return (
    <div
      style={{
        width: lado,
        height: lado,
        borderRadius: '50%',
        background: '#000',
        boxShadow: `0 ${8 * escala}px ${22 * escala}px rgba(0,0,0,.55), inset 0 0 0 ${escala}px rgba(255,255,255,.14)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${p}) translateX(${(1 - p) * -30 * escala}px)`,
      }}
    >
      <div style={{transform: `scale(${escala})`, display: 'flex'}}>
        {tipo === 'musica' && <Capa tamanho={26} raio={13} />}
        {tipo === 'timer' && <Anel valor={0.62} tamanho={26} cor={LARANJA} espessura={3} />}
        {tipo === 'download' && <Anel valor={0.48} tamanho={26} cor="#fff" espessura={3} />}
      </div>
    </div>
  );
};
