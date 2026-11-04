// Each scene id a script can use points to its component. The same scene works in both formats and both languages;
// the scripts in roteiros/ pick and order them.
import {APPS, type App} from '../tema';
import {Gancho, GanchoTodos, Nome} from './Aberturas';
import {CursorEsquemas, CursorMorfo, CursorOcupado} from './Cursores';
import {Fecho, FechoTodos, Fim} from './Fechos';
import {FundoBiblioteca, FundoGaleria, FundoMonitores, FundoNumeros, FundoPausa} from './FundoVivo';
import {IlhaAlertas, IlhaClima, IlhaDownloads, IlhaGravar, IlhaMenu, IlhaMusica, IlhaNumeros, IlhaPlacar, IlhaTimer} from './Ilha';
import {RelogioDetalhes, RelogioMostrador, RelogioMusica} from './Relogio';

const porApp = (prefixo: string, Componente: React.FC<{app: App}>) =>
  Object.fromEntries(APPS.map((app) => [`${prefixo}-${app}`, () => <Componente app={app} />])) as Record<string, React.FC>;

export const CENAS: Record<string, React.FC> = {
  'gancho-todos': GanchoTodos,
  'fecho-todos': FechoTodos,
  ...Object.fromEntries(APPS.map((app) => [`${app}-gancho`, () => <Gancho app={app} />])),
  ...Object.fromEntries(APPS.map((app) => [`${app}-nome`, () => <Nome app={app} />])),
  ...porApp('fecho', Fecho),
  ...porApp('fim', Fim),
  'ilha-musica': IlhaMusica,
  'ilha-timer': IlhaTimer,
  'ilha-gravar': IlhaGravar,
  'ilha-alertas': IlhaAlertas,
  'ilha-menu': IlhaMenu,
  'ilha-numeros': IlhaNumeros,
  'ilha-placar': IlhaPlacar,
  'ilha-downloads': IlhaDownloads,
  'ilha-clima': IlhaClima,
  'relogio-mostrador': RelogioMostrador,
  'relogio-musica': RelogioMusica,
  'relogio-detalhes': RelogioDetalhes,
  'fundo-galeria': FundoGaleria,
  'fundo-monitores': FundoMonitores,
  'fundo-pausa': FundoPausa,
  'fundo-numeros': FundoNumeros,
  'fundo-biblioteca': FundoBiblioteca,
  'cursor-esquemas': CursorEsquemas,
  'cursor-morfo': CursorMorfo,
  'cursor-ocupado': CursorOcupado,
};
