// A slab of screen in 3D: a rounded panel with a live wallpaper and the ilha at the top, tilted in perspective. It is
// the close-up of the top of the monitor the ilha scenes use, big enough to read the pill.
import {FundoVivo, type Fundo} from './Desktop';
import {Pilula, type Estado} from './Ilha';

export const Painel3D: React.FC<{
  largura: number;
  altura: number;
  angulo: {x: number; y: number; z?: number};
  raio?: number;
  children: React.ReactNode;
}> = ({largura, altura, angulo, raio = 36, children}) => (
  <div style={{perspective: largura * 2.4}}>
    <div
      style={{
        width: largura,
        height: altura,
        borderRadius: raio,
        overflow: 'hidden',
        position: 'relative',
        transform: `rotateX(${angulo.x}deg) rotateY(${angulo.y}deg) rotateZ(${angulo.z ?? 0}deg)`,
        boxShadow: `0 ${largura * 0.04}px ${largura * 0.1}px rgba(0,0,0,.75), inset 0 0 0 2px rgba(255,255,255,.1)`,
        background: '#000',
      }}
    >
      {children}
      <div style={{position: 'absolute', inset: 0, borderRadius: raio, background: `linear-gradient(120deg, transparent 30%, rgba(255,255,255,${0.05 + Math.abs(angulo.y) * 0.004}) 48%, transparent 64%)`}} />
    </div>
  </div>
);

export const TopoDaTela: React.FC<{
  largura: number;
  altura: number;
  fundo?: Fundo;
  estados: Estado[];
  escalaIlha: number;
  angulo: {x: number; y: number; z?: number};
}> = ({largura, altura, fundo = 'fireflies', estados, escalaIlha, angulo}) => (
  <Painel3D largura={largura} altura={altura} angulo={angulo}>
    <div style={{position: 'absolute', inset: 0}}>
      <FundoVivo nome={fundo} largura={largura} altura={altura} />
    </div>
    {/* a little darker at the top, the way the ilha sits on a bright wallpaper */}
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.35), transparent 45%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 12 * escalaIlha, display: 'flex', justifyContent: 'center'}}>
      <Pilula estados={estados} escala={escalaIlha} />
    </div>
  </Painel3D>
);
