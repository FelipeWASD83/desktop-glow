// Openings. "gancho-todos": the whole desktop with the four apps on the ultrawide, turning in 3D, under the hook.
// "<app>-gancho": the hook of an app's vertical video. "<app>-nome": the app's name and what it is.
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cursor, Desktop, FundoVivo} from '../app/Desktop';
import {MusicaCompacta, MusicaExpandida, type Estado} from '../app/Ilha';
import {Monitor} from '../app/Monitor';
import {Painel3D, TopoDaTela} from '../app/Tela';
import {Entra} from '../componentes/Entra';
import {Palavras} from '../componentes/Palavras';
import {useCena} from '../linha';
import {chave} from '../movimento/chaves';
import {T} from '../textos';
import {COR, FONTE_TITULO, type App} from '../tema';
import {Layout, NaCaixa, useLado} from './Layout';

const ilhaNaMesa = (entra: number): Estado[] => [
  {q: 0, w: 128, h: 32, conteudo: null},
  {q: entra + 22, w: 186, h: 36, conteudo: <MusicaCompacta />},
];

export const GanchoTodos: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  // the camera swings from the side to almost straight on
  const y = chave(f, [[entra, v ? -34 : -30], [sai, v ? -10 : -12]], 'sai');
  const x = chave(f, [[entra, 14], [sai, 5]], 'sai');
  return (
    <Layout
      titulo={T('gancho.todos')}
      atraso={0}
      visual={
        <NaCaixa dx={v ? 0 : -20} dy={v ? -40 : 30}>
          {/* already half in on the first frame: the hook has no empty start */}
          <Entra tipo="foco" inicio={-8} duracao={16}>
            <Monitor largura={v ? 1260 : 1060} angulo={{x, y}}>
              <Desktop
                fundo="rainy-night"
                ilha={ilhaNaMesa(entra)}
                cursor={{chaves: [{q: entra, x: 2300, y: 1100}, {q: sai, x: 1640, y: 760, curva: 'suave'}]}}
              />
            </Monitor>
          </Entra>
        </NaCaixa>
      }
    />
  );
};

// what each app shows behind its name
const Fundo3D: React.FC<{app: App}> = ({app}) => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  const y = chave(f, [[entra, v ? -20 : -24], [sai, v ? -6 : -8]]);
  const x = chave(f, [[entra, 10], [sai, 4]]);
  if (app === 'ilha') {
    const estados: Estado[] = [
      {q: 0, w: 128, h: 32, conteudo: null},
      {q: entra + 16, w: 186, h: 36, conteudo: <MusicaCompacta />},
      {q: entra + 46, w: 380, h: 200, r: 38, conteudo: <MusicaExpandida progresso={(f - entra) / 30} />},
    ];
    return (
      <NaCaixa>
        <TopoDaTela largura={v ? 1000 : 1040} altura={v ? 820 : 640} fundo="rainy-night" estados={estados} escalaIlha={v ? 2.5 : 2.35} angulo={{x, y}} />
      </NaCaixa>
    );
  }
  if (app === 'relogio') {
    return (
      <NaCaixa>
        <Monitor largura={v ? 980 : 1100} angulo={{x, y}}>
          <Desktop fundo="snowfall" />
        </Monitor>
      </NaCaixa>
    );
  }
  if (app === 'fundovivo') {
    const w = v ? 960 : 1080;
    return (
      <NaCaixa>
        <Painel3D largura={w} altura={(w * 9) / 16} angulo={{x, y}}>
          <FundoVivo nome="fireflies" largura={w} altura={(w * 9) / 16} />
        </Painel3D>
      </NaCaixa>
    );
  }
  return (
    <NaCaixa>
      <div style={{perspective: 1600}}>
        <div style={{transform: `rotateY(${y}deg) rotateX(${-x}deg)`, filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.6))'}}>
          <Cursor variante="black" nome="link" inicio={entra + 10} tamanho={v ? 620 : 600} />
        </div>
      </div>
    </NaCaixa>
  );
};

export const Nome: React.FC<{app: App}> = ({app}) => (
  <Layout app={undefined} titulo={`*${T(`nome.${app}`)}*`} sub={T(`sub.${app}`)} visual={<Fundo3D app={app} />} atraso={2} />
);

export const Gancho: React.FC<{app: App}> = ({app}) => {
  if (app !== 'ilha') return <Layout app={app} titulo={T(`gancho.${app}`)} visual={<Fundo3D app={app} />} atraso={0} />;
  // the ilha's hook says it in two beats: "never had one", then "until now" as the pill opens
  return <GanchoIlha />;
};

const GanchoIlha: React.FC = () => {
  const {entra, dura} = useCena();
  const {v, seguro, w} = useLado();
  const virada = entra + Math.round(dura * 0.48);
  return (
    <AbsoluteFill>
      <Fundo3D app="ilha" />
      <AbsoluteFill style={v ? {alignItems: 'center', paddingTop: seguro.topo + 10} : {justifyContent: 'center', paddingLeft: seguro.esq + 24}}>
        <div style={{width: v ? w - seguro.esq - seguro.dir + 40 : 700, position: 'relative'}}>
          <Palavras texto={T('gancho.ilha')} tamanho={v ? 100 : 108} modo="sobe" inicio={entra - 6} saida={virada} alinhamento={v ? 'center' : 'left'} peso={700} fonte={FONTE_TITULO} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 0}}>
            <Palavras texto={`*${T('gancho.ilha2')}*`} tamanho={v ? 150 : 150} modo="foco" inicio={virada + 6} alinhamento={v ? 'center' : 'left'} peso={700} fonte={FONTE_TITULO} corDestaque={COR.destaque} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
