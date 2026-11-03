// A monitor in real 3D (CSS perspective): bezel, screen, neck and foot, a glare that moves with the angle and a soft
// shadow on the floor. The screen draws a desktop at its true pixel size (3440 x 1440 for the ultrawide) scaled down,
// so the ilha, the clock and the cursor keep their real proportions.
import {AbsoluteFill} from 'remotion';

export type Angulo = {x: number; y: number; z?: number; perto?: number};

export const Monitor: React.FC<{
  largura: number; // screen width in px on the video
  resolucao?: [number, number]; // what the screen shows, in desktop pixels
  angulo: Angulo;
  pe?: boolean;
  children: React.ReactNode; // drawn at resolucao, scaled to fit
}> = ({largura, resolucao = [3440, 1440], angulo, pe = true, children}) => {
  const [rw, rh] = resolucao;
  const altura = (largura * rh) / rw;
  const borda = largura * 0.012;
  const escala = largura / rw;
  // the glare slides across the glass as the monitor turns
  const brilho = 50 + angulo.y * 2.2;
  return (
    <div style={{perspective: largura * 2.2, perspectiveOrigin: '50% 40%'}}>
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateZ(${angulo.perto ?? 0}px) rotateX(${angulo.x}deg) rotateY(${angulo.y}deg) rotateZ(${angulo.z ?? 0}deg)`,
          position: 'relative',
          width: largura + borda * 2,
        }}
      >
        <div
          style={{
            width: largura + borda * 2,
            height: altura + borda * 2,
            borderRadius: borda * 1.6,
            background: 'linear-gradient(180deg, #1c1c20, #0c0c0e)',
            boxShadow: `0 ${largura * 0.03}px ${largura * 0.08}px rgba(0,0,0,.7), inset 0 0 0 1px rgba(255,255,255,.08)`,
            padding: borda,
            boxSizing: 'border-box',
          }}
        >
          <div style={{width: largura, height: altura, borderRadius: borda * 0.5, overflow: 'hidden', position: 'relative', background: '#000'}}>
            <div style={{width: rw, height: rh, transform: `scale(${escala})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0}}>{children}</div>
            <AbsoluteFill style={{background: `linear-gradient(115deg, transparent ${brilho - 22}%, rgba(255,255,255,.07) ${brilho}%, transparent ${brilho + 18}%)`, pointerEvents: 'none'}} />
          </div>
        </div>
        {pe && (
          <>
            <div style={{width: largura * 0.07, height: largura * 0.075, margin: '0 auto', background: 'linear-gradient(90deg, #121215, #1f1f24, #121215)'}} />
            <div style={{width: largura * 0.26, height: largura * 0.014, margin: '0 auto', borderRadius: largura * 0.008, background: 'linear-gradient(180deg, #24242a, #0e0e10)'}} />
          </>
        )}
      </div>
      <div style={{width: largura * 0.9, height: largura * 0.05, margin: `${-largura * 0.02}px auto 0`, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,.65), transparent 70%)', filter: `blur(${largura * 0.01}px)`}} />
    </div>
  );
};
