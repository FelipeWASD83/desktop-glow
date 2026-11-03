// Fundo Vivo's feature scenes, with the real example wallpapers (frames from FundoVivo.exe --vivo-still).
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {Desktop, FundoVivo, type Fundo} from '../app/Desktop';
import {Monitor} from '../app/Monitor';
import {Painel3D} from '../app/Tela';
import {Contador} from '../componentes/Efeitos';
import {Entra, useEntradas} from '../componentes/Entra';
import {useCena} from '../linha';
import {chave} from '../movimento/chaves';
import {LINGUA, T} from '../textos';
import {COR, FONTE_APOIO, FONTE_TITULO} from '../tema';
import {Layout, NaCaixa, useLado} from './Layout';

const NOMES: Record<Fundo, {en: string; pt: string}> = {
  'rainy-night': {en: 'Rainy night', pt: 'Noite de chuva'},
  snowfall: {en: 'Snow on the mountains', pt: 'Neve nas montanhas'},
  fireflies: {en: 'Fireflies at dusk', pt: 'Vaga-lumes no crepúsculo'},
  pulse: {en: 'Pulse, reacts to sound', pt: 'Pulso, reage ao som'},
};

// four live wallpapers on a ring that turns in 3D
export const FundoGaleria: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v, visual} = useLado();
  const fundos: Fundo[] = ['rainy-night', 'snowfall', 'fireflies', 'pulse'];
  const w = v ? 640 : 620;
  const h = (w * 9) / 16;
  const raio = v ? 760 : 760;
  // cards 48 degrees apart on a wide ring pushed back by its radius: the one in front is at its real size and its
  // neighbours show on both sides; the ring sweeps from the first card to the last
  const passo = 48;
  const giro = chave(f, [[entra, 20], [sai, -passo * 3 - 10]], 'suave');
  return (
    <Layout
      app="fundovivo"
      titulo={T('fundo.galeria')}
      visual={
        <div style={{position: 'absolute', left: visual.x, top: visual.y, width: visual.w, height: visual.h, perspective: 2000}}>
          <div style={{position: 'absolute', left: visual.w / 2, top: visual.h / 2, transformStyle: 'preserve-3d', transform: `translateZ(${-raio}px) rotateX(-6deg) rotateY(${giro}deg)`}}>
            {fundos.map((nome, i) => (
              <div key={nome} style={{position: 'absolute', left: -w / 2, top: -h / 2, width: w, transform: `rotateY(${i * passo}deg) translateZ(${raio}px)`, backfaceVisibility: 'hidden'}}>
                <Entra tipo="cresce" inicio={entra - 4 + i * 5}>
                  <div style={{width: w, height: h, borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.7), inset 0 0 0 2px rgba(255,255,255,.12)'}}>
                    <FundoVivo nome={nome} largura={w} altura={h} />
                  </div>
                  <div style={{fontFamily: FONTE_APOIO, fontSize: v ? 34 : 28, color: COR.textoSuave, marginTop: 16, textAlign: 'center'}}>{NOMES[nome][LINGUA]}</div>
                </Entra>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
};

// his own setup: the ultrawide and the 27" standing up, each with its own wallpaper
export const FundoMonitores: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  const y = chave(f, [[entra, -20], [sai, -8]]);
  const largo = v ? 640 : 700;
  const alto = v ? 180 : 210;
  return (
    <Layout
      app="fundovivo"
      titulo={T('fundo.monitores')}
      visual={
        <NaCaixa>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: v ? 26 : 34, transform: v ? 'scale(1)' : 'none'}}>
            <Entra tipo="desliza" direcao="dir" inicio={entra + 2} distancia={160}>
              <Monitor largura={largo} angulo={{x: 4, y: y + 14}}>
                <Desktop fundo="rainy-night" relogio={false} />
              </Monitor>
            </Entra>
            <Entra tipo="mola" direcao="esq" inicio={entra + 12} distancia={160}>
              <Monitor largura={alto} resolucao={[1080, 1920]} angulo={{x: 4, y: y - 6}}>
                <Desktop fundo="fireflies" relogio={false} barra={false} />
              </Monitor>
            </Entra>
          </div>
        </NaCaixa>
      }
    />
  );
};

// a game takes the whole screen: the wallpaper stops and its CPU drops to nothing
export const FundoPausa: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  const w = v ? 960 : 1040;
  const h = v ? 640 : 600;
  const jogo = entra + 34;
  const cobre = chave(f, [[jogo, h], [jogo + 14, 0]], 'sai');
  const cpu = chave(f, [[jogo + 10, 1.4], [jogo + 30, 0]], 'sai');
  const angulo = {x: 7, y: chave(f, [[entra, v ? -10 : -16], [sai, v ? -4 : -6]])};
  return (
    <Layout
      app="fundovivo"
      titulo={T('fundo.pausa')}
      visual={
        <NaCaixa>
          <div style={{position: 'relative'}}>
            <Painel3D largura={w} altura={h} angulo={angulo}>
              <div style={{position: 'absolute', inset: 0}}>
                <FundoVivo nome="rainy-night" largura={w} altura={h} pausado={jogo + 10} />
              </div>
              {/* the game: a full-screen window coming up over the desktop */}
              <div style={{position: 'absolute', left: 0, right: 0, top: cobre, height: h, background: 'radial-gradient(ellipse at 50% 70%, #3b1d0e, #0b0605 70%)'}}>
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.35, background: 'linear-gradient(180deg, transparent, #000)'}} />
                <div style={{position: 'absolute', left: w * 0.06, bottom: h * 0.08, width: w * 0.22, height: 14, borderRadius: 7, background: 'linear-gradient(90deg, #ff453a, #ff9f0a)'}} />
                <div style={{position: 'absolute', right: w * 0.06, bottom: h * 0.08, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 34, color: '#ffd9b0'}}>128 / 300</div>
                <div style={{position: 'absolute', left: '50%', top: '50%', width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14, border: '3px solid rgba(255,255,255,.7)'}} />
              </div>
            </Painel3D>
            <div style={{position: 'absolute', right: v ? 30 : -30, top: v ? -70 : -50}}>
              <Entra tipo="mola" inicio={jogo + 12}>
                <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '18px 30px', borderRadius: 40, background: '#000', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.16), 0 20px 50px rgba(0,0,0,.6)', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: v ? 40 : 34, color: COR.texto}}>
                  <span style={{display: 'flex', gap: 6}}>
                    <span style={{width: 9, height: 28, borderRadius: 3, background: COR.destaque}} />
                    <span style={{width: 9, height: 28, borderRadius: 3, background: COR.destaque}} />
                  </span>
                  {T('fundo.pausado')}
                  <span style={{fontFamily: FONTE_APOIO, fontWeight: 500, color: COR.textoSuave, fontVariantNumeric: 'tabular-nums'}}>
                    {T('tela.cpu')} {cpu.toFixed(1).replace('.', LINGUA === 'pt' ? ',' : '.')}%
                  </span>
                </div>
              </Entra>
            </div>
          </div>
        </NaCaixa>
      }
    />
  );
};

export const FundoNumeros: React.FC = () => {
  const f = useCurrentFrame();
  const {entra} = useCena();
  const proxima = useEntradas();
  const {v} = useLado();
  const tam = v ? 240 : 230;
  return (
    <Layout
      app="fundovivo"
      titulo={T('fundo.numeros')}
      sub={T('fundo.numeros.sub')}
      visual={
        <NaCaixa>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
            <Entra tipo={proxima()} inicio={entra + 6}>
              <div style={{display: 'flex', alignItems: 'baseline', fontFamily: FONTE_TITULO, fontWeight: 700, color: COR.texto}}>
                <Contador ate={1.4} de={0} casas={1} inicio={entra + 8} duracao={34} tamanho={tam} cor={COR.destaque} />
                <span style={{fontSize: tam * 0.42, marginLeft: 10}}>%</span>
              </div>
            </Entra>
            <Entra tipo={proxima()} inicio={entra + 20} direcao="cima">
              {/* one core is the whole bar; Fundo Vivo is the thin bright sliver at the start */}
              <div style={{width: v ? 760 : 700, height: 30, borderRadius: 15, background: '#16161a', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.08)', overflow: 'hidden'}}>
                <div style={{width: `${chave(f, [[entra + 22, 0], [entra + 50, 1.4]])}%`, minWidth: 6, height: '100%', background: COR.destaque, borderRadius: 15}} />
              </div>
            </Entra>
          </div>
        </NaCaixa>
      }
    />
  );
};

// only in the Portuguese video: the app's window is in Portuguese
export const FundoBiblioteca: React.FC = () => {
  const f = useCurrentFrame();
  const {entra, sai} = useCena();
  const {v} = useLado();
  const w = v ? 960 : 1060;
  return (
    <Layout
      app="fundovivo"
      titulo={T('fundo.biblioteca')}
      visual={
        <NaCaixa>
          <Painel3D largura={w} altura={(w * 940) / 1500} angulo={{x: 6, y: chave(f, [[entra, -16], [sai, -6]])}} raio={28}>
            <Img src={staticFile('gerado/biblioteca.png')} style={{width: '100%', height: '100%'}} />
          </Painel3D>
        </NaCaixa>
      }
    />
  );
};
