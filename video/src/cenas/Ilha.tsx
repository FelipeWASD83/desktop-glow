// The ilha's feature scenes: a close-up of the top of a screen in 3D with the pill going through its real states.
import {useCurrentFrame} from 'remotion';
import {Bateria, Bolinha, Camera, Caps, Central, Clima, Download, Gravando, MusicaCompacta, MusicaExpandida, PlacarCompacto, PlacarExpandido, TimerCompacto, TimerExpandido} from '../app/Ilha';
import type {Fundo} from '../app/Desktop';
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

const Painel: React.FC<{estados: Estado[]; fundo?: Fundo; de?: number; ate?: number; aoLado?: React.ReactNode; escala?: number}> = ({estados, fundo = 'fireflies', de = -18, ate = -6, aoLado, escala}) => {
  const {v} = useLado();
  const angulo = useAngulo(v ? de * 0.6 : de, v ? ate * 0.6 : ate);
  return (
    <NaCaixa>
      <TopoDaTela largura={v ? 1000 : 1040} altura={v ? 820 : 640} fundo={fundo} estados={estados} escalaIlha={escala ?? (v ? 2.5 : 2.35)} angulo={angulo} aoLado={aoLado} />
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
  const {v} = useLado();
  // the menu (470) plus a ball (10 + 46) has to fit the panel (1000 standing, 1040 lying) with some margin
  const e = v ? 1.72 : 1.78;
  // since 4.0 each activity running sits next to the menu as a ball of its own
  const bolinhas = (
    <>
      <Bolinha tipo="musica" escala={e} inicio={entra + 22} />
      <Bolinha tipo="timer" escala={e} inicio={entra + 27} />
      <Bolinha tipo="download" escala={e} inicio={entra + 32} />
    </>
  );
  return <Layout app="ilha" titulo={T('ilha.menu')} sub={T('ilha.menu.sub')} visual={<Painel estados={estados} fundo="night-tide" de={-10} ate={-4} aoLado={bolinhas} escala={e} />} />;
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

export const IlhaPlacar: React.FC = () => {
  const {entra} = useCena();
  const f = useCurrentFrame();
  // a round is won during the scene: 8 becomes 9, and the clock keeps running
  const rodada = entra + 70;
  const nos = f >= rodada ? 9 : 8;
  const s = Math.max(0, 84 - Math.floor((f - entra) / 30));
  const relogio = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const estados: Estado[] = [
    OCIOSA(0),
    {q: entra + 8, w: 250, h: 38, conteudo: <PlacarCompacto nos={nos} eles={7} relogio={relogio} />},
    {q: entra + 52, w: 390, h: 170, r: 38, conteudo: <PlacarExpandido nos={nos} eles={7} relogio={relogio} abates={f >= rodada ? 15 : 14} />},
  ];
  return <Layout app="ilha" titulo={T('ilha.placar')} sub={T('ilha.placar.sub')} visual={<Painel estados={estados} fundo="sparks" de={-16} ate={-6} />} />;
};

export const IlhaDownloads: React.FC = () => {
  const {entra} = useCena();
  const f = useCurrentFrame();
  const valor = chave(f, [[entra + 6, 0.42], [entra + 96, 1]], 'suave');
  const estados: Estado[] = [
    OCIOSA(0),
    {q: entra + 6, w: 262, h: 38, conteudo: <Download valor={valor} />},
    {q: entra + 44, w: 370, h: 96, r: 34, conteudo: <Download valor={valor} largo />},
  ];
  return <Layout app="ilha" titulo={T('ilha.downloads')} sub={T('ilha.downloads.sub')} visual={<Painel estados={estados} fundo="northern-lights" de={16} ate={6} />} />;
};

export const IlhaClima: React.FC = () => {
  const {entra} = useCena();
  const estados: Estado[] = [OCIOSA(0), {q: entra + 10, w: 272, h: 44, r: 22, conteudo: <Clima />}];
  return <Layout app="ilha" titulo={T('ilha.clima')} sub={T('ilha.clima.sub')} visual={<Painel estados={estados} fundo="rainy-night" de={-12} ate={-20} />} />;
};
