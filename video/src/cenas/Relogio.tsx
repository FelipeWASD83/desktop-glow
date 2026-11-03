// The clock's feature scenes: the redrawn Relógio Mond over a live wallpaper, in 3D.
import {useCurrentFrame} from 'remotion';
import {FundoVivo} from '../app/Desktop';
import {Cursor} from '../app/Desktop';
import {MostradorMond} from '../app/Relogio';
import {Painel3D} from '../app/Tela';
import {Entra, useEntradas} from '../componentes/Entra';
import {useCena} from '../linha';
import {chave, atrasoCentro} from '../movimento/chaves';
import {DATA_DO_VIDEO, T} from '../textos';
import {COR, FONTE_TITULO} from '../tema';
import {Layout, NaCaixa, useLado} from './Layout';

const Cena3D: React.FC<{escala: number; controles?: number; deslocar?: [number, number]; de: number; ate: number; children?: React.ReactNode}> = ({escala, controles = 0, deslocar = [0, 0], de, ate, children}) => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  const w = v ? 960 : 1060;
  const h = v ? 760 : 660;
  const angulo = {x: chave(f, [[entra, 7], [sai, 3]]), y: chave(f, [[entra, v ? de * 0.6 : de], [sai, v ? ate * 0.6 : ate]])};
  return (
    <NaCaixa>
      <Painel3D largura={w} altura={h} angulo={angulo}>
        <div style={{position: 'absolute', inset: 0}}>
          <FundoVivo nome="snowfall" largura={w} altura={h} />
        </div>
        <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,.18)'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: h / 2 + deslocar[1], display: 'flex', justifyContent: 'center', transform: `translate(${deslocar[0]}px, -50%)`}}>
          <MostradorMond data={DATA_DO_VIDEO} escala={escala} controles={controles} progresso={83 + (f - entra) / 30} />
        </div>
        {children}
      </Painel3D>
    </NaCaixa>
  );
};

export const RelogioMostrador: React.FC = () => {
  const {v} = useLado();
  return <Layout app="relogio" titulo={T('relogio.mostrador')} visual={<Cena3D escala={v ? 0.6 : 0.6} de={-18} ate={-6} />} />;
};

export const RelogioMusica: React.FC = () => {
  const f = useCurrentFrame();
  const {entra} = useCena();
  const {v} = useLado();
  // close on the music block; the pointer comes to the cover and the buttons show
  const escala = v ? 1.6 : 1.3;
  const controles = chave(f, [[entra + 34, 0], [entra + 44, 1]]);
  // the music block sits ~150 px (at scale 1) under the clock's center: the panel is moved up by that, and the
  // pointer goes to the cover, which is ~160 px left of the block's middle
  const w = v ? 960 : 1060;
  const h = v ? 760 : 660;
  const alvoX = w / 2 - 160 * escala;
  const alvoY = h / 2 - 8 * escala;
  const cx = chave(f, [[entra + 6, alvoX + 260], [entra + 34, alvoX]]);
  const cy = chave(f, [[entra + 6, alvoY + 200], [entra + 34, alvoY]]);
  return (
    <Layout
      app="relogio"
      titulo={T('relogio.musica')}
      sub={T('relogio.musica.sub')}
      visual={
        <Cena3D escala={escala} controles={controles} deslocar={[0, -150 * escala]} de={14} ate={6}>
          <div style={{position: 'absolute', left: cx, top: cy}}>
            <Cursor tamanho={64} />
          </div>
        </Cena3D>
      }
    />
  );
};

export const RelogioDetalhes: React.FC = () => {
  const {entra} = useCena();
  const proxima = useEntradas();
  const {v} = useLado();
  const itens = [T('relogio.detalhe1'), T('relogio.detalhe2'), T('relogio.detalhe3')];
  return (
    <Layout
      app="relogio"
      titulo={T('relogio.detalhes')}
      visual={
        <NaCaixa>
          <div style={{display: 'flex', flexDirection: 'column', gap: v ? 26 : 24, alignItems: 'center'}}>
            {itens.map((t, i) => (
              <Entra key={t} tipo={proxima()} inicio={entra + 12 + atrasoCentro(i, itens.length, 14) + i * 8} direcao={i % 2 ? 'esq' : 'dir'} distancia={90}>
                <div style={{padding: v ? '26px 44px' : '24px 42px', borderRadius: 60, background: '#0c0c0f', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.12)', fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: v ? 48 : 44, color: COR.texto, display: 'flex', alignItems: 'center', gap: 18}}>
                  <span style={{width: 16, height: 16, borderRadius: 8, background: COR.destaque}} />
                  {t}
                </div>
              </Entra>
            ))}
          </div>
        </NaCaixa>
      }
    />
  );
};
