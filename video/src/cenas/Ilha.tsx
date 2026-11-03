// The ilha's feature scenes: a close-up of the top of a screen in 3D with the pill going through its real states.
import {useCurrentFrame} from 'remotion';
import {Bateria, Camera, Caps, Central, Gravando, MusicaCompacta, MusicaExpandida, TimerCompacto, TimerExpandido} from '../app/Ilha';
import type {Estado} from '../app/Ilha';
import {TopoDaTela} from '../app/Tela';
import {Contador} from '../componentes/Efeitos';
import {Entra} from '../componentes/Entra';
import {useCena} from '../linha';
import {chave} from '../movimento/chaves';
import {T} from '../textos';
import {COR, FONTE_TITULO} from '../tema';
import {Layout, NaCaixa, useLado} from './Layout';

const OCIOSA = (q: number): Estado => ({q, w: 128, h: 32, conteudo: null});

// the panel turns slowly while the scene is on: the 3D never stands still
const useAngulo = (de: number, ate: number) => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  return {x: chave(f, [[entra, 9], [sai, 4]]), y: chave(f, [[entra, de], [sai, ate]])};
};

const Painel: React.FC<{estados: Estado[]; fundo?: 'fireflies' | 'snowfall' | 'rainy-night' | 'pulse'; de?: number; ate?: number}> = ({estados, fundo = 'fireflies', de = -18, ate = -6}) => {
  const {v} = useLado();
  const angulo = useAngulo(v ? de * 0.6 : de, v ? ate * 0.6 : ate);
  return (
    <NaCaixa>
      <TopoDaTela largura={v ? 1000 : 1040} altura={v ? 820 : 640} fundo={fundo} estados={estados} escalaIlha={v ? 2.5 : 2.35} angulo={angulo} />
    </NaCaixa>
  );
};

export const IlhaMusica: React.FC = () => {
  const {entra} = useCena();
  const f = useCurrentFrame();
  const estados: Estado[] = [
    OCIOSA(0),
    {q: entra + 8, w: 186, h: 36, conteudo: <MusicaCompacta />},
    {q: entra + 40, w: 380, h: 200, r: 38, conteudo: <MusicaExpandida progresso={(f - entra) / 30} />},
  ];
  return <Layout app="ilha" titulo={T('ilha.musica')} sub={T('ilha.musica.sub')} visual={<Painel estados={estados} />} />;
};

export const IlhaTimer: React.FC = () => {
  const {entra} = useCena();
  const f = useCurrentFrame();
  // a pomodoro running: one second per second of video
  const s = Math.max(0, 1499 - Math.floor((f - entra) / 30));
  const estados: Estado[] = [
    OCIOSA(0),
    {q: entra + 6, w: 186, h: 36, conteudo: <TimerCompacto segundos={s} />},
    {q: entra + 44, w: 360, h: 140, r: 38, conteudo: <TimerExpandido segundos={s} />},
  ];
  return <Layout app="ilha" titulo={T('ilha.timer')} sub={T('ilha.timer.sub')} visual={<Painel estados={estados} fundo="snowfall" de={16} ate={6} />} />;
};

export const IlhaGravar: React.FC = () => {
  const {entra} = useCena();
  const f = useCurrentFrame();
  const s = Math.max(0, Math.floor((f - entra - 10) / 30) + 12);
  const estados: Estado[] = [OCIOSA(0), {q: entra + 10, w: 268, h: 40, conteudo: <Gravando segundos={s} />}];
  return <Layout app="ilha" titulo={T('ilha.gravar')} sub={T('ilha.gravar.sub')} visual={<Painel estados={estados} fundo="rainy-night" de={-14} ate={-22} />} />;
};

export const IlhaAlertas: React.FC = () => {
  const {entra} = useCena();
  const estados: Estado[] = [
    OCIOSA(0),
    {q: entra + 8, w: 290, h: 52, r: 26, conteudo: <Bateria nivel={10} />},
    {q: entra + 36, w: 240, h: 46, r: 23, conteudo: <Caps />},
    {q: entra + 62, w: 236, h: 46, r: 23, conteudo: <Camera />},
  ];
  return <Layout app="ilha" titulo={T('ilha.alertas')} sub={T('ilha.alertas.sub')} visual={<Painel estados={estados} fundo="rainy-night" de={18} ate={8} />} />;
};

export const IlhaMenu: React.FC = () => {
  const {entra} = useCena();
  const f = useCurrentFrame();
  // the volume block is dragged up while the menu is open
  const volume = chave(f, [[entra + 40, 0.35], [entra + 70, 0.8]]);
  const estados: Estado[] = [OCIOSA(0), {q: entra + 10, w: 470, h: 230, r: 38, conteudo: <Central volume={volume} />}];
  return <Layout app="ilha" titulo={T('ilha.menu')} visual={<Painel estados={estados} fundo="snowfall" de={-16} ate={-8} />} />;
};

export const IlhaNumeros: React.FC = () => {
  const {entra} = useCena();
  const {v} = useLado();
  // the pill keeps changing in the back while the number counts: what 250 fps is for
  const estados: Estado[] = [
    OCIOSA(0),
    {q: entra + 6, w: 186, h: 36, conteudo: <MusicaCompacta />},
    {q: entra + 30, w: 268, h: 40, conteudo: <Gravando segundos={4} />},
    {q: entra + 54, w: 290, h: 52, r: 26, conteudo: <Bateria nivel={50} />},
    {q: entra + 78, w: 186, h: 36, conteudo: <TimerCompacto segundos={1320} />},
  ];
  return (
    <Layout
      app="ilha"
      titulo={T('ilha.numeros')}
      sub={T('ilha.numeros.sub')}
      visual={
        <>
          <Painel estados={estados} fundo="fireflies" de={12} ate={-4} />
          <NaCaixa dy={v ? 250 : 210}>
            <Entra tipo="cresce" inicio={entra + 14}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 14, fontFamily: FONTE_TITULO, fontWeight: 700, color: COR.texto, textShadow: '0 8px 30px rgba(0,0,0,.6)'}}>
                <Contador ate={250} inicio={entra + 14} duracao={36} tamanho={v ? 150 : 140} cor={COR.destaque} />
                <span style={{fontSize: v ? 60 : 54}}>fps</span>
              </div>
            </Entra>
          </NaCaixa>
        </>
      }
    />
  );
};
