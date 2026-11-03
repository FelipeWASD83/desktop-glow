// What the monitor shows: a Windows desktop at real pixel size with the four apps on it. The wallpaper is a real
// Fundo Vivo example (frames from FundoVivo.exe --vivo-still, ferramentas/capturas.py), the pointers are real frames
// of ilha-cursors, and the ilha and the clock are redrawn (src/app/Ilha.tsx, Relogio.tsx).
import {AbsoluteFill, Img, Loop, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {chaves, type Ponto} from '../movimento/chaves';
import {DATA_DO_VIDEO} from '../textos';
import {Pilula, type Estado} from './Ilha';
import {MostradorMond} from './Relogio';

export type Fundo = 'rainy-night' | 'snowfall' | 'fireflies' | 'pulse';

// a looping wallpaper: 4 s of the example, played over and over
export const FundoVivo: React.FC<{nome: Fundo; largura: number; altura: number; pausado?: number}> = ({nome, largura, altura, pausado}) => {
  const f = useCurrentFrame();
  const video = (
    <OffthreadVideo
      src={staticFile(`gerado/fundos/${nome}.mp4`)}
      muted
      style={{width: largura, height: altura, objectFit: 'cover'}}
    />
  );
  if (pausado !== undefined && f >= pausado) {
    // frozen on the frame it stopped at
    return <Img src={staticFile(`gerado/fundos/${nome}.jpg`)} style={{width: largura, height: altura, objectFit: 'cover'}} />;
  }
  return <Loop durationInFrames={120}>{video}</Loop>;
};

export const Cursor: React.FC<{variante?: 'black' | 'white'; nome?: string; inicio?: number; tamanho?: number}> = ({variante = 'black', nome = 'arrow', inicio = 0, tamanho = 64}) => {
  const f = useCurrentFrame();
  const arquivo = nome === 'arrow' ? `gerado/cursores/${variante}/arrow.png` : `gerado/cursores/${variante}/${nome}/${String(Math.min(119, Math.max(0, f - inicio))).padStart(3, '0')}.png`;
  return <Img src={staticFile(arquivo)} style={{width: tamanho, height: tamanho, display: 'block'}} />;
};

// a plain taskbar: no logo, just the shape
const Barra: React.FC = () => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, background: 'rgba(18,18,22,.78)', backdropFilter: 'blur(30px)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(255,255,255,.06)'}}>
    {['#5b8cff', '#e9e9ee', '#ffb547', '#6be0a0', '#ff7a7a', '#b48cff'].map((c, i) => (
      <div key={i} style={{width: 42, height: 42, borderRadius: 10, background: `linear-gradient(145deg, ${c}, ${c}99)`, opacity: 0.9}} />
    ))}
  </div>
);

export const Desktop: React.FC<{
  fundo?: Fundo;
  ilha?: Estado[];
  relogio?: boolean;
  controles?: number;
  cursor?: {chaves: Ponto[]; variante?: 'black' | 'white'; nome?: string; inicio?: number};
  barra?: boolean;
  pausado?: number;
  children?: React.ReactNode;
}> = ({fundo = 'rainy-night', ilha, relogio = true, controles = 0, cursor, barra = true, pausado, children}) => {
  const f = useCurrentFrame();
  const pos = cursor ? chaves<'x' | 'y'>(f, cursor.chaves) : null;
  // the clock's seconds go by with the video; the song moves on too
  const segundos = f / 30;
  return (
    <AbsoluteFill style={{width: 3440, height: 1440, overflow: 'hidden'}}>
      <FundoVivo nome={fundo} largura={3440} altura={1440} pausado={pausado} />
      {relogio && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 352, display: 'flex', justifyContent: 'center'}}>
          <MostradorMond data={DATA_DO_VIDEO} controles={controles} progresso={83 + segundos} />
        </div>
      )}
      {ilha && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 14, display: 'flex', justifyContent: 'center'}}>
          {/* 125 %: the ilha's DIPs on his ultrawide */}
          <Pilula estados={ilha} escala={1.25} />
        </div>
      )}
      {children}
      {barra && <Barra />}
      {pos && cursor && (
        <div style={{position: 'absolute', left: pos.x, top: pos.y}}>
          <Cursor variante={cursor.variante} nome={cursor.nome} inicio={cursor.inicio} tamanho={60} />
        </div>
      )}
    </AbsoluteFill>
  );
};
