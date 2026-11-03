// The scene sound effects (files in public/, made by npm run sons): one impact as the first title lands and a rise
// into the ending. The transitions bring their own sound (movimento/transicoes-dados.ts); the pill's morphs stay
// silent so the music carries the video. Same rule for every script, since the scenes are shared.
import {LINHA} from './linha';

export type Som = {arquivo: string; quadro: number; volume: number};

export const SONS = (): Som[] => {
  const sons: Som[] = [{arquivo: 'sons/impacto.wav', quadro: 8, volume: 0.24}];
  const fim = LINHA.cenas.find((c) => c.id.startsWith('fecho') || c.id.startsWith('fim'));
  if (fim) sons.push({arquivo: 'sons/subida.wav', quadro: fim.de - 22, volume: 0.3});
  return sons;
};
