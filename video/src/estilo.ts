// O estilo do vídeo, escolhido no roteiro ("estilo"), e as molas dele. Componentes e cenas pegam daqui.
import roteiro from './roteiro.json';
import {ESTILOS, type Estilo} from './movimento/estilos';

const nome = (roteiro as {estilo?: string}).estilo ?? 'cinetico';
const achado = ESTILOS[nome];
if (!achado) throw new Error(`estilo desconhecido no roteiro: "${nome}" (tem: ${Object.keys(ESTILOS).join(', ')})`);

export const ESTILO: Estilo = achado;
export const MOLA_SECA = ESTILO.molas.seca;
export const MOLA_VIVA = ESTILO.molas.viva;
export const MOLA_QUICA = ESTILO.molas.quica;
