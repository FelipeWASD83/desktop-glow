// Stills on a transparent background for his own edits in After Effects: every state of the redrawn island and the
// clock, one composition each. A separate entry point (not imported by the videos), rendered by ferramentas/pngs.py,
// which also crops each PNG to what was drawn. The language follows src/roteiro.json, like the videos.
import React from 'react'; // the entry file is not run through the automatic JSX runtime like the rest
import {AbsoluteFill, Composition, registerRoot} from 'remotion';
import {
  Bateria,
  Bolinha,
  Camera,
  Caps,
  Central,
  Clima,
  Download,
  Gravando,
  MusicaCompacta,
  MusicaExpandida,
  Pilula,
  PlacarCompacto,
  PlacarExpandido,
  TimerCompacto,
  TimerExpandido,
  type Estado,
} from './app/Ilha';
import {MostradorMond} from './app/Relogio';
import {DATA_DO_VIDEO} from './textos';

const ESCALA = 4; // the island at 4x its own size (DIPs): crisp at 4K

type Estado1 = Omit<Estado, 'q'>;
const ILHA: Record<string, Estado1> = {
  'ociosa': {w: 128, h: 32, conteudo: null},
  'musica-compacta': {w: 186, h: 36, conteudo: <MusicaCompacta />},
  'musica-expandida': {w: 380, h: 200, r: 38, conteudo: <MusicaExpandida progresso={1} />},
  'timer-compacto': {w: 186, h: 36, conteudo: <TimerCompacto segundos={1320} />},
  'timer-expandido': {w: 360, h: 140, r: 38, conteudo: <TimerExpandido segundos={1320} />},
  'gravando': {w: 268, h: 40, conteudo: <Gravando segundos={74} />},
  'bateria': {w: 290, h: 52, r: 26, conteudo: <Bateria nivel={10} />},
  'caps-lock': {w: 240, h: 46, r: 23, conteudo: <Caps />},
  'camera': {w: 236, h: 46, r: 23, conteudo: <Camera />},
  'placar-compacto': {w: 250, h: 38, conteudo: <PlacarCompacto nos={9} eles={7} relogio="1:23" />},
  'placar-expandido': {w: 390, h: 170, r: 38, conteudo: <PlacarExpandido nos={9} eles={7} relogio="1:23" abates={15} />},
  'download-compacto': {w: 262, h: 38, conteudo: <Download valor={0.64} />},
  'download-expandido': {w: 370, h: 96, r: 34, conteudo: <Download valor={0.64} largo />},
  'download-pronto': {w: 262, h: 38, conteudo: <Download valor={1} />},
  'clima': {w: 272, h: 44, r: 22, conteudo: <Clima />},
  'menu': {w: 470, h: 230, r: 38, conteudo: <Central volume={0.7} />},
};

const Centro: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: 'transparent'}}>{children}</AbsoluteFill>
);

const PilulaParada: React.FC<{nome: string}> = ({nome}) => (
  <Centro>
    <Pilula estados={[{...ILHA[nome], q: 0}]} escala={ESCALA} />
  </Centro>
);

const Bolinhas: React.FC = () => (
  <Centro>
    <div style={{display: 'flex', gap: 10 * ESCALA}}>
      <Bolinha tipo="musica" escala={ESCALA} inicio={-60} />
      <Bolinha tipo="timer" escala={ESCALA} inicio={-60} />
      <Bolinha tipo="download" escala={ESCALA} inicio={-60} />
    </div>
  </Centro>
);

const RelogioParado: React.FC<{musica: boolean; controles: number}> = ({musica, controles}) => (
  <Centro>
    <MostradorMond data={DATA_DO_VIDEO} escala={1.6} musica={musica} controles={controles} progresso={84} />
  </Centro>
);

// generous canvases: pngs.py crops every still to its drawn pixels
const comum = {fps: 30, durationInFrames: 30};
const Recortes: React.FC = () => (
  <>
    {Object.keys(ILHA).map((nome) => (
      <Composition key={nome} id={`ilha-${nome}`} component={PilulaParada} defaultProps={{nome}} width={2400} height={1400} {...comum} />
    ))}
    <Composition id="ilha-bolinhas" component={Bolinhas} width={1400} height={700} {...comum} />
    <Composition id="relogio-completo" component={RelogioParado} defaultProps={{musica: true, controles: 0}} width={3200} height={1500} {...comum} />
    <Composition id="relogio-controles" component={RelogioParado} defaultProps={{musica: true, controles: 1}} width={3200} height={1500} {...comum} />
    <Composition id="relogio-sem-musica" component={RelogioParado} defaultProps={{musica: false, controles: 0}} width={3200} height={1000} {...comum} />
  </>
);

registerRoot(Recortes);
