// O catálogo das transições: quanto cada uma dura, em que ponto dela a cena nova começa a animar e o som que
// acompanha. O desenho de cada uma está em componentes/Transicoes.tsx. Módulo puro (sem React nem Remotion): o
// planejador, o conferir.py e os testes no Node leem daqui.

export type TipoTransicao =
  | 'varredura'
  | 'cortina'
  | 'iris'
  | 'persiana'
  | 'empurra'
  | 'chicote'
  | 'zoom'
  | 'blocos'
  | 'glitch'
  | 'divide'
  | 'liquido'
  | 'corte';

export type DadosTransicao = {
  dura: number; // quadros da troca (a cena velha e a nova se sobrepõem esse tanto)
  entra: number; // fração da troca em que a cena nova começa a aparecer e animar
  som: string | null; // efeito em public/ (gerado pelo npm run sons)
  descricao: string;
};

export const TRANSICOES: Record<TipoTransicao, DadosTransicao> = {
  varredura: {dura: 16, entra: 0.5, som: 'sons/varredura.wav', descricao: 'faixa larga na cor de destaque atravessa na diagonal e cobre o corte'},
  cortina: {dura: 18, entra: 0.5, som: 'sons/sopro.wav', descricao: 'painel no tom do fundo entra por um lado, cobre o corte e sai pelo outro'},
  iris: {dura: 18, entra: 0.15, som: 'sons/sopro.wav', descricao: 'a cena nova abre num círculo que cresce de um ponto, com um aro na cor de destaque'},
  persiana: {dura: 20, entra: 0.5, som: 'sons/deslize.wav', descricao: 'faixas escalonadas fecham a tela e abrem do outro lado'},
  empurra: {dura: 16, entra: 0.15, som: 'sons/sopro.wav', descricao: 'a cena nova empurra a velha para fora, com desfoque de movimento'},
  chicote: {dura: 10, entra: 0.5, som: 'sons/chicote.wav', descricao: 'whip pan: as duas passam rápidas e borradas, o corte some no borrão'},
  zoom: {dura: 16, entra: 0.4, som: 'sons/subida-curta.wav', descricao: 'a câmera atravessa a cena velha (aproxima e desfoca) e a nova assenta vindo de longe'},
  blocos: {dura: 22, entra: 0.5, som: 'sons/tique.wav', descricao: 'grade de quadrados fecha a tela a partir de um canto e abre pelo canto oposto'},
  glitch: {dura: 8, entra: 0.5, som: 'sons/glitch.wav', descricao: 'tremida digital curta com separação de cor e faixas, corte no meio'},
  divide: {dura: 18, entra: 0.2, som: 'sons/sopro.wav', descricao: 'a cena velha racha ao meio e as metades se afastam; a nova surge no vão'},
  liquido: {dura: 22, entra: 0.5, som: 'sons/bolha.wav', descricao: 'onda de tinta sobe ondulando, cobre a tela e escorre para cima'},
  corte: {dura: 2, entra: 0.5, som: null, descricao: 'corte seco (de preferência na batida); não conta como efeito'},
};

export const TIPOS_TRANSICAO = Object.keys(TRANSICOES) as TipoTransicao[];
