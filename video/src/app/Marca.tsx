// Small pieces every scene uses: the app icon, the label pill with icon and name, and a text block (title + support)
// that fits both formats.
import {Img, staticFile} from 'remotion';
import {T} from '../textos';
import {COR, COR_APP, FONTE_APOIO, FONTE_TITULO, type App} from '../tema';

export const IconeApp: React.FC<{app: App | 'pacote'; tamanho: number; style?: React.CSSProperties}> = ({app, tamanho, style}) => (
  <Img
    src={staticFile(`icones/${app}.png`)}
    style={{width: tamanho, height: tamanho, display: 'block', filter: `drop-shadow(0 ${tamanho * 0.08}px ${tamanho * 0.16}px rgba(0,0,0,.5))`, ...style}}
  />
);

// the ilha-like label: a black pill with a lit rim, the app icon and its name
export const Etiqueta: React.FC<{app: App; tamanho?: number}> = ({app, tamanho = 44}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: tamanho * 0.32,
      height: tamanho * 1.45,
      padding: `0 ${tamanho * 0.55}px 0 ${tamanho * 0.22}px`,
      borderRadius: tamanho,
      background: '#000',
      boxShadow: `inset 0 0 0 2px rgba(255,255,255,.16), 0 0 ${tamanho * 0.8}px ${COR_APP[app]}33`,
    }}
  >
    <IconeApp app={app} tamanho={tamanho} />
    <span style={{fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanho * 0.62, color: COR.texto, whiteSpace: 'nowrap'}}>{T(`nome.${app}`)}</span>
  </div>
);

export const Apoio: React.FC<{texto: string; tamanho: number; alinhamento?: 'left' | 'center'; cor?: string}> = ({texto, tamanho, alinhamento = 'left', cor = COR.textoSuave}) => (
  <div style={{fontFamily: FONTE_APOIO, fontSize: tamanho, color: cor, lineHeight: 1.3, textAlign: alinhamento, whiteSpace: 'pre-line'}}>{texto}</div>
);
