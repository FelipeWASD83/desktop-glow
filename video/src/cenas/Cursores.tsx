// The cursors' feature scenes, with the real frames of ilha-cursors (read from its .cur and .ani files).
import {useCurrentFrame} from 'remotion';
import {Cursor} from '../app/Desktop';
import {Entra, useEntradas} from '../componentes/Entra';
import {useCena} from '../linha';
import {chave, atrasoGrade} from '../movimento/chaves';
import {T} from '../textos';
import {COR, FONTE_TITULO} from '../tema';
import {Layout, NaCaixa, useLado} from './Layout';

// a pointer standing in 3D, turning a little, with a soft light behind it
const Grande: React.FC<{variante: 'black' | 'white'; nome?: string; inicio?: number; tamanho: number; giro: number}> = ({variante, nome, inicio, tamanho, giro}) => (
  <div style={{perspective: 1600}}>
    <div style={{transform: `rotateY(${giro}deg) rotateX(${giro * -0.3}deg)`, filter: `drop-shadow(0 ${tamanho * 0.08}px ${tamanho * 0.12}px rgba(0,0,0,.6))`}}>
      <Cursor variante={variante} nome={nome} inicio={inicio} tamanho={tamanho} />
    </div>
  </div>
);

export const CursorEsquemas: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  const giro = chave(f, [[entra, -24], [sai, 18]]);
  const tam = v ? 520 : 500;
  const rotulo = (t: string) => <div style={{fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: v ? 46 : 40, color: COR.textoSuave, textAlign: 'center', marginTop: -tam * 0.12}}>{t}</div>;
  return (
    <Layout
      app="cursores"
      titulo={T('cursor.esquemas')}
      sub={T('cursor.esquemas.sub')}
      visual={
        <NaCaixa>
          <div style={{display: 'flex', gap: v ? 0 : 20}}>
            <Entra tipo="mola" direcao="dir" inicio={entra + 4} distancia={120}>
              <Grande variante="black" tamanho={tam} giro={giro} />
              {rotulo(T('cursor.preto'))}
            </Entra>
            <Entra tipo="gira" direcao="esq" inicio={entra + 14}>
              <Grande variante="white" tamanho={tam} giro={-giro} />
              {rotulo(T('cursor.branco'))}
            </Entra>
          </div>
        </NaCaixa>
      }
    />
  );
};

// six pointers, each one playing its intro: the arrow morphs into it with a spring
export const CursorMorfo: React.FC = () => {
  const {entra} = useCena();
  const {v} = useLado();
  const nomes = ['link', 'text', 'move', 'help', 'precision', 'unavailable'];
  const cols = 3;
  const tam = v ? 240 : 210;
  return (
    <Layout
      app="cursores"
      titulo={T('cursor.morfo')}
      sub={T('cursor.morfo.sub')}
      visual={
        <NaCaixa>
          <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${tam + 40}px)`, gap: 18}}>
            {nomes.map((nome, i) => {
              const col = i % cols;
              const lin = Math.floor(i / cols);
              const inicio = entra + 8 + atrasoGrade(col, lin, cols, 2, [0, 0], 24);
              return (
                <div key={nome} style={{width: tam + 40, height: tam + 40, borderRadius: 40, background: i % 2 ? '#e9e9ee' : '#0d0d10', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Cursor variante={i % 2 ? 'white' : 'black'} nome={nome} inicio={inicio} tamanho={tam} />
                </div>
              );
            })}
          </div>
        </NaCaixa>
      }
    />
  );
};

export const CursorOcupado: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const proxima = useEntradas();
  const {v} = useLado();
  const giro = chave(f, [[entra, 14], [sai, -14]]);
  return (
    <Layout
      app="cursores"
      titulo={T('cursor.ocupado')}
      visual={
        <NaCaixa>
          <div style={{display: 'flex', alignItems: 'center', gap: v ? 10 : 30}}>
            <Entra tipo={proxima()} inicio={entra + 4}>
              <Grande variante="black" nome="busy" inicio={entra + 4} tamanho={v ? 560 : 520} giro={giro} />
            </Entra>
            <Entra tipo={proxima()} inicio={entra + 20} direcao="esq">
              <Grande variante="white" nome="working" inicio={entra + 20} tamanho={v ? 300 : 300} giro={-giro} />
            </Entra>
          </div>
        </NaCaixa>
      }
    />
  );
};

