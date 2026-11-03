// Câmera 2.5D: uma câmera virtual com keyframes (x, y, zoom, giro) e camadas em profundidade. Camada de z = 0 é
// o fundo distante (quase não anda); z = 1 é a frente (anda tudo). A diferença de velocidade entre as camadas é o
// parallax, que dá profundidade sem 3D.
//
//   <Camera chaves={[{q: 0, x: 0, zoom: 1}, {q: 60, x: -240, zoom: 1.25, curva: 'suave'}]}>
//     <Camada z={0.1}><Montanhas /></Camada>
//     <Camada z={0.6}><Arvores /></Camada>
//     <Camada z={1}><Titulo /></Camada>
//   </Camera>
import {createContext, useContext} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {chaves, type Ponto} from '../movimento/chaves';

type Estado = {x: number; y: number; zoom: number; giro: number};
const CameraContexto = createContext<Estado>({x: 0, y: 0, zoom: 1, giro: 0});

export const Camera: React.FC<{chaves: Ponto[]; children: React.ReactNode}> = ({chaves: pontos, children}) => {
  const f = useCurrentFrame();
  const c = chaves<'x' | 'y' | 'zoom' | 'giro'>(f, pontos);
  const estado = {x: c.x ?? 0, y: c.y ?? 0, zoom: c.zoom ?? 1, giro: c.giro ?? 0};
  return (
    <CameraContexto.Provider value={estado}>
      <AbsoluteFill style={{overflow: 'hidden'}}>{children}</AbsoluteFill>
    </CameraContexto.Provider>
  );
};

export const Camada: React.FC<{z: number; children: React.ReactNode; style?: React.CSSProperties}> = ({z, children, style}) => {
  const cam = useContext(CameraContexto);
  const fator = 0.15 + 0.85 * z;
  const zoom = 1 + (cam.zoom - 1) * fator;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${cam.x * fator}px, ${cam.y * fator}px) scale(${zoom}) rotate(${cam.giro * fator}deg)`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
