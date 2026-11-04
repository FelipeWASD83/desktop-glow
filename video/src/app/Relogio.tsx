// The Relógio Mond, redrawn for the videos to the measure of its own --captura (1550 x 520 at 125 %): day in Quicksand Light
// (the clock's fallback: its Anurati is for personal use only), date and time in Quicksand with wide tracking, the weather line, and the music block (336 DIP wide, always narrower
// than the clock) with the cover, title, progress and the bars. Here the time ticks and the bars move.
import {useCurrentFrame} from 'remotion';
import {LINGUA, T} from '../textos';
import {COR, FONTE_DIA, FONTE_TITULO} from '../tema';
import {Capa} from './Ilha';

const DIAS = {en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], pt: ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']};
const MESES = {
  en: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
  pt: ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'],
};

export const MostradorMond: React.FC<{
  data: Date;
  escala?: number; // 1 = the clock's own size at 125 % (1550 px wide)
  musica?: boolean;
  controles?: number; // 0 to 1: the cover darkens and shows the buttons (mouse over it)
  progresso?: number; // seconds into the song
  clima?: boolean;
}> = ({data, escala = 1, musica = true, controles = 0, progresso = 83, clima = true}) => {
  const f = useCurrentFrame();
  const s = escala * 1.25; // the clock's DIPs at 125 %
  const dia = DIAS[LINGUA][data.getDay()];
  const dataTexto = LINGUA === 'en' ? `${MESES.en[data.getMonth()]} ${data.getDate()}, ${data.getFullYear()}` : `${data.getDate()} DE ${MESES.pt[data.getMonth()]} DE ${data.getFullYear()}`;
  const hora = `- ${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')} -`;
  const sombra = `0 ${2 * s}px ${8 * s}px rgba(0,0,0,.35)`;
  const linha = (texto: string, tamanho: number, cor = COR.texto, peso = 500, espaco = 0.2) => (
    <div style={{fontFamily: FONTE_TITULO, fontSize: tamanho * s, fontWeight: peso, letterSpacing: `${espaco}em`, color: cor, textShadow: sombra, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{texto}</div>
  );
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', color: COR.texto}}>
      <div style={{fontFamily: FONTE_DIA, fontWeight: 300, fontSize: 96 * s, letterSpacing: '0.38em', marginRight: '-0.38em', lineHeight: 1, textShadow: sombra, whiteSpace: 'nowrap'}}>{dia}</div>
      <div style={{height: 26 * s}} />
      {linha(dataTexto, 28)}
      <div style={{height: 6 * s}} />
      {linha(hora, 28)}
      <div style={{height: 8 * s}} />
      {clima && linha(LINGUA === 'en' ? '23°  PARTLY CLOUDY' : '23°  PARCIALMENTE NUBLADO', 19, 'rgba(245,245,247,.85)', 500, 0.18)}
      {musica && (
        <div style={{width: 336 * s, marginTop: 34 * s}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14 * s}}>
            <div style={{position: 'relative', boxShadow: `0 ${6 * s}px ${18 * s}px rgba(0,0,0,.4)`, borderRadius: 8 * s}}>
              <Capa tamanho={80 * s} raio={8 * s} />
              {controles > 0 && (
                <div style={{position: 'absolute', inset: 0, borderRadius: 8 * s, background: `rgba(0,0,0,${0.72 * controles})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 * s}}>
                  <div style={{transform: `scale(${0.7 + 0.3 * controles})`, display: 'flex', gap: 10 * s, alignItems: 'center'}}>
                    <Seta escala={s} invertida />
                    <div style={{width: 6 * s, height: 22 * s, background: '#fff', borderRadius: 2 * s, boxShadow: `${10 * s}px 0 #fff`, marginRight: 10 * s}} />
                    <Seta escala={s} />
                  </div>
                </div>
              )}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 18 * s, whiteSpace: 'nowrap'}}>{T('tela.musica')}</div>
              <div style={{fontFamily: FONTE_TITULO, fontWeight: 500, fontSize: 13 * s, color: 'rgba(245,245,247,.75)'}}>{T('tela.artista')}</div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12 * s, marginTop: 9 * s, fontFamily: FONTE_TITULO, fontSize: 12 * s, fontWeight: 500}}>
                <span>{`${Math.floor(progresso / 60)}:${String(Math.floor(progresso % 60)).padStart(2, '0')}`}</span>
                <div style={{flex: 1, height: 3 * s, borderRadius: 2 * s, background: 'rgba(255,255,255,.3)'}}>
                  <div style={{width: `${(progresso / 224) * 100}%`, height: '100%', borderRadius: 2 * s, background: '#fff'}} />
                </div>
                <span>3:44</span>
              </div>
            </div>
          </div>
          <BarrasMond frame={f} escala={s} />
        </div>
      )}
    </div>
  );
};

const Seta: React.FC<{escala: number; invertida?: boolean}> = ({escala, invertida}) => (
  <div style={{width: 0, height: 0, borderTop: `${8 * escala}px solid transparent`, borderBottom: `${8 * escala}px solid transparent`, [invertida ? 'borderRight' : 'borderLeft']: `${11 * escala}px solid #fff`}} />
);

// The clock's bars since 1.4.1: 56 thin white bars (56 % of the step) standing on the bottom, each with a peak dot
// that holds 0.35 s and falls 0.9 per second; neighbours blend 1-2-1, like the clock's Visualizador. Height 36 DIP.
const NIVEL = (q: number, i: number) => {
  const grave = 1 - i / 70;
  return Math.max(0.08, grave * (0.4 + 0.6 * Math.abs(Math.sin(q * 0.19 + i * 0.47) * Math.cos(q * 0.07 + i * 0.13))));
};
const SUAVE = (q: number, i: number) => (NIVEL(q, Math.max(0, i - 1)) + 2 * NIVEL(q, i) + NIVEL(q, Math.min(55, i + 1))) / 4;
const PICO = (q: number, i: number) => {
  // a pure function of the frame: the highest of the last second, minus what it has fallen since it was hit
  let p = 0;
  for (let k = 0; k <= 30; k++) p = Math.max(p, SUAVE(q - k, i) - 0.9 * Math.max(0, k / 30 - 0.35));
  return p;
};
const BarrasMond: React.FC<{frame: number; escala: number}> = ({frame, escala}) => {
  const alto = 36 * escala;
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: alto, marginTop: 8 * escala}}>
      {Array.from({length: 56}, (_, i) => {
        const v = SUAVE(frame, i);
        const pico = PICO(frame, i);
        return (
          <div key={i} style={{position: 'relative', width: 3.4 * escala, height: alto}}>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: alto * v, borderRadius: 1.5 * escala, background: '#fff'}} />
            <div style={{position: 'absolute', left: 0, right: 0, bottom: alto * pico + 2 * escala, height: 2 * escala, borderRadius: escala, background: '#fff'}} />
          </div>
        );
      })}
    </div>
  );
};
