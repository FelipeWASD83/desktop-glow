// The layout every feature scene shares. Lying down: the app label, the title and the support line in a column on the
// left, the visual on the right. Standing up: label and title at the top inside the safe zone, the visual below.
// The text comes in after the visual has started, one block at a time.
import {AbsoluteFill} from 'remotion';
import {Respira} from '../componentes/Apoio';
import {Entra, useEntradas} from '../componentes/Entra';
import {Palavras} from '../componentes/Palavras';
import {useCena} from '../linha';
import {Apoio, Etiqueta} from '../app/Marca';
import {COR, FONTE_TITULO, type App} from '../tema';

export const useLado = () => {
  const {formato} = useCena();
  const v = formato.vertical;
  const {largura: w, altura: h, seguro} = formato;
  // the box where the visual goes, in video px
  const visual = v
    ? {x: 0, y: 640, w, h: h - 640 - seguro.base + 120, cx: w / 2, cy: 640 + (h - 640 - seguro.base + 120) / 2}
    : {x: 780, y: 0, w: w - 780, h, cx: 780 + (w - 780) / 2, cy: h / 2};
  return {v, w, h, seguro, visual};
};

// centers its children in the visual box of the scene
export const NaCaixa: React.FC<{children: React.ReactNode; dx?: number; dy?: number}> = ({children, dx = 0, dy = 0}) => {
  const {visual} = useLado();
  return (
    <div style={{position: 'absolute', left: visual.x + dx, top: visual.y + dy, width: visual.w, height: visual.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {children}
    </div>
  );
};

export const Layout: React.FC<{
  app?: App;
  titulo: string;
  sub?: string;
  visual: React.ReactNode;
  atraso?: number; // frames after the scene appears before the label comes in
}> = ({app, titulo, sub, visual, atraso = 4}) => {
  const {entra} = useCena();
  const proxima = useEntradas();
  const {v, w, seguro} = useLado();
  const t0 = entra + atraso;
  const tamanho = v ? 100 : 112;
  const texto = (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: v ? 'center' : 'flex-start', gap: v ? 34 : 30, width: v ? w - seguro.esq - seguro.dir + 40 : 700}}>
      {app && (
        <Entra tipo={proxima()} inicio={t0} direcao={v ? 'cima' : 'dir'}>
          <Etiqueta app={app} tamanho={v ? 50 : 44} />
        </Entra>
      )}
      <Palavras texto={titulo} tamanho={tamanho} modo="sobe" inicio={t0 + 6} alinhamento={v ? 'center' : 'left'} peso={700} fonte={FONTE_TITULO} entrelinha={1.02} corDestaque={COR.destaque} />
      {sub && (
        <Entra tipo={proxima()} inicio={t0 + 18} direcao="cima" distancia={30}>
          <Apoio texto={sub} tamanho={v ? 44 : 38} alinhamento={v ? 'center' : 'left'} />
        </Entra>
      )}
    </div>
  );
  return (
    <AbsoluteFill>
      <Respira quanto={0.025}>
        <AbsoluteFill>{visual}</AbsoluteFill>
      </Respira>
      <AbsoluteFill
        style={
          v
            ? {alignItems: 'center', paddingTop: seguro.topo + 10}
            : {justifyContent: 'center', paddingLeft: seguro.esq + 24}
        }
      >
        {texto}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
