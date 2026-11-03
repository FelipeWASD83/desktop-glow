// Endings. "fecho-todos": the four icons fly in from depth and settle into the installer's pill. "fecho-<app>": an
// app's vertical video ends on its icon and where to get it. "fim-<app>": the setup's videos end on the name only
// (whoever is watching is already installing it).
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Apoio, IconeApp} from '../app/Marca';
import {Entra, useEntradas} from '../componentes/Entra';
import {Palavras} from '../componentes/Palavras';
import {useCena} from '../linha';
import {chave, atrasoCentro} from '../movimento/chaves';
import {T} from '../textos';
import {APPS, COR, COR_APP, FONTE_APOIO, FONTE_TITULO, type App} from '../tema';
import {useLado} from './Layout';

const Url: React.FC<{inicio: number}> = ({inicio}) => {
  const {v} = useLado();
  return (
    <Entra tipo="recorte" inicio={inicio} direcao="dir">
      <div style={{fontFamily: FONTE_APOIO, fontSize: v ? 34 : 30, color: COR.textoSuave, padding: '14px 30px', borderRadius: 40, background: '#0c0c0f', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.1)'}}>{T('fecho.url')}</div>
    </Entra>
  );
};

export const FechoTodos: React.FC = () => {
  const f = useCurrentFrame();
  const {entra} = useCena();
  const proxima = useEntradas();
  const {v} = useLado();
  const tam = v ? 200 : 180;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v ? 54 : 40}}>
        <div style={{display: 'flex', gap: v ? 30 : 40, perspective: 1400}}>
          {APPS.map((app, i) => {
            const t = entra - 6 + atrasoCentro(i, APPS.length, 8) + i * 3;
            // each icon spins in from behind and lands in line (already big while the transition opens)
            const giro = chave(f, [[t, 160], [t + 22, 0]], 'sai');
            const z = chave(f, [[t, -650], [t + 22, 0]], 'sai');
            return (
              <div key={app} style={{transform: `translateZ(${z}px) rotateY(${giro}deg)`}}>
                <IconeApp app={app} tamanho={tam} style={{filter: `drop-shadow(0 20px 40px ${COR_APP[app]}55)`}} />
              </div>
            );
          })}
        </div>
        <Palavras texto={T('fecho.todos')} tamanho={v ? 110 : 120} modo="foco" inicio={entra + 26} peso={700} fonte={FONTE_TITULO} alinhamento="center" corDestaque={COR.texto} cor={COR.textoSuave} />
        <Entra tipo={proxima()} inicio={entra + 40}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, height: 92, padding: '0 40px 0 18px', borderRadius: 46, background: '#000', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.18), 0 0 60px rgba(255,255,255,.08)'}}>
            <IconeApp app="pacote" tamanho={64} />
            <span style={{fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: v ? 44 : 40, color: COR.texto}}>{T('nome.pacote')}</span>
          </div>
        </Entra>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
          <Entra tipo={proxima()} inicio={entra + 50} direcao="cima" distancia={30}>
            <Apoio texto={T('fecho.gratis')} tamanho={v ? 44 : 38} alinhamento="center" />
          </Entra>
          <Url inicio={entra + 58} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FimDoApp: React.FC<{app: App; com: 'url' | 'sub'}> = ({app, com}) => {
  const f = useCurrentFrame();
  const {entra} = useCena();
  const proxima = useEntradas();
  const {v} = useLado();
  const giro = chave(f, [[entra, -120], [entra + 26, 0]], 'sai');
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v ? 44 : 34}}>
        <div style={{perspective: 1200}}>
          <div style={{transform: `rotateY(${giro}deg)`}}>
            <IconeApp app={app} tamanho={v ? 300 : 260} style={{filter: `drop-shadow(0 30px 70px ${COR_APP[app]}66)`}} />
          </div>
        </div>
        <Palavras texto={`*${T(`nome.${app}`)}*`} tamanho={v ? 130 : 140} modo="sobe" inicio={entra + 14} peso={700} fonte={FONTE_TITULO} alinhamento="center" corDestaque={COR.texto} />
        <Entra tipo={proxima()} inicio={entra + 28} direcao="cima" distancia={30}>
          <Apoio texto={com === 'url' ? T('fecho.parte') : T(`sub.${app}`)} tamanho={v ? 46 : 40} alinhamento="center" />
        </Entra>
        {com === 'url' && <Url inicio={entra + 40} />}
      </div>
    </AbsoluteFill>
  );
};

export const Fecho: React.FC<{app: App}> = ({app}) => <FimDoApp app={app} com="url" />;
export const Fim: React.FC<{app: App}> = ({app}) => <FimDoApp app={app} com="sub" />;
