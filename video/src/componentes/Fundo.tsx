// The continuous background under the whole video: true black like the ilha, with two slow lights in the color of
// the video's app (the four colors in turn on the "all apps" videos), a soft floor glow, vignette and a little grain.
import {AbsoluteFill, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {ESTILO} from '../estilo';
import {APP_DO_VIDEO} from '../textos';
import {APPS, COR_APP} from '../tema';

const GRAO = ESTILO.grao;

const RUIDO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.6'/%3E%3C/svg%3E\")";

const Luz: React.FC<{cor: string; x: number; y: number; r: number; fase: number}> = ({cor, x, y, r, fase}) => {
  const f = useCurrentFrame();
  const dx = Math.sin(f / 80 + fase) * r * 0.16;
  const dy = Math.cos(f / 95 + fase) * r * 0.12;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r + dx,
        top: y - r + dy,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${cor} 0%, transparent 68%)`,
      }}
    />
  );
};

export const Fundo: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const maior = Math.max(width, height);
  // one app: its color; all apps: the four colors slowly in turn over the video
  const cores = APP_DO_VIDEO === 'todos' ? APPS.map((a) => COR_APP[a]) : [COR_APP[APP_DO_VIDEO], COR_APP[APP_DO_VIDEO]];
  const passos = cores.map((_, i) => (i / (cores.length - 1)) * durationInFrames);
  const cor = interpolateColors(f, passos, cores);
  const alfa = (c: string, a: number) => c.replace(/^rgba?\(([^)]+)\)$/, (_, v) => `rgba(${v.split(',').slice(0, 3).join(',')},${a})`);
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <Luz cor={alfa(cor, 0.2)} x={width * 0.15} y={height * 0.18} r={maior * 0.5} fase={0} />
      <Luz cor={alfa(cor, 0.12)} x={width * 0.88} y={height * 0.86} r={maior * 0.42} fase={2.4} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 30% at 50% 100%, rgba(255,255,255,.05), transparent 70%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.6) 100%)'}} />
      {GRAO > 0 && (
        <AbsoluteFill style={{backgroundImage: RUIDO, backgroundPosition: `${(f % 4) * 37}px ${(f % 4) * 53}px`, opacity: GRAO, mixBlendMode: 'overlay'}} />
      )}
    </AbsoluteFill>
  );
};
