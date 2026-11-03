// The Relógio Mond, redrawn for the videos to the measure of its own --captura (1550 x 520 at 125 %): day in Anurati,
// date and time in Quicksand with wide tracking, the weather line, and the music block (336 DIP wide, always narrower
// than the clock) with the cover, title, progress and the bars. Here the time ticks and the bars move.
import {useCurrentFrame} from 'remotion';
import {LINGUA, T} from '../textos';
import {COR, FONTE_DIA, FONTE_TITULO} from '../tema';
import {Capa} from './Ilha';

const DIAS = {en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], pt: ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']};
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
      <div style={{fontFamily: FONTE_DIA, fontSize: 100 * s, letterSpacing: '0.3em', marginRight: '-0.3em', lineHeight: 1, textShadow: sombra, whiteSpace: 'nowrap'}}>{dia}</div>
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

// 56 bars like the clock's default, 14 DIP high, louder in the bass: a spectrum, not a waveform
const BarrasMond: React.FC<{frame: number; escala: number}> = ({frame, escala}) => (
  <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 16 * escala, marginTop: 18 * escala}}>
    {Array.from({length: 56}, (_, i) => {
      const grave = 1 - i / 70;
      const v = Math.max(0.12, grave * (0.45 + 0.55 * Math.abs(Math.sin(frame * 0.19 + i * 0.47) * Math.cos(frame * 0.07 + i * 0.13))));
      return <div key={i} style={{width: 3.4 * escala, height: 16 * escala * v, borderRadius: 2 * escala, background: '#fff'}} />;
    })}
  </div>
);
