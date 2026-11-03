// Legenda palavra por palavra, presa à narração (o tempo de cada palavra vem do narrar.py). Mostra grupos curtos
// (até 3 palavras, quebrando em pontuação e pausa) e marca a palavra que está sendo dita. Fica na zona segura de
// baixo. Ligar no roteiro ("legenda": true) ou pela prop do vídeo; vídeo de rede social quase sempre quer.
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {MOLA_SECA} from '../estilo';
import {LINHA} from '../linha';
import {COR, FONTE_TITULO, type Formato} from '../tema';

type Grupo = {de: number; ate: number; palavras: {q: number; fim: number; texto: string}[]};

const montarGrupos = (): Grupo[] => {
  const grupos: Grupo[] = [];
  for (const c of LINHA.cenas) {
    let atual: Grupo | null = null;
    c.palavras.forEach((p, i) => {
      const q = c.de + p.q;
      const anterior = c.palavras[i - 1];
      const pausa = anterior ? p.q - (anterior.q + anterior.d) > 9 : false;
      const pontuou = anterior ? /[.,;:!?…]$/.test(anterior.texto) : false;
      if (!atual || atual.palavras.length >= 3 || pausa || pontuou) {
        atual = {de: q, ate: q, palavras: []};
        grupos.push(atual);
      }
      atual.palavras.push({q, fim: q + p.d, texto: p.texto});
      atual.ate = q + p.d + 10;
    });
  }
  // palavra sozinha no fim de uma frase ("câmera") volta para o grupo anterior, se for a mesma frase sem pausa
  for (let i = grupos.length - 1; i > 0; i--) {
    const g = grupos[i];
    const ant = grupos[i - 1];
    const ultima = ant.palavras[ant.palavras.length - 1];
    if (g.palavras.length === 1 && ant.palavras.length <= 3 && g.de - ultima.fim <= 9 && !/[.,;:!?…]$/.test(ultima.texto)) {
      ant.palavras.push(...g.palavras);
      ant.ate = g.ate;
      grupos.splice(i, 1);
    }
  }
  // um grupo fica até o próximo começar (sem buraco entre eles), mas não passa de 10 quadros depois da última palavra
  grupos.forEach((g, i) => {
    const prox = grupos[i + 1];
    if (prox) g.ate = Math.min(g.ate, prox.de);
  });
  return grupos;
};

const GRUPOS = montarGrupos();

export const Legenda: React.FC<{formato: Formato}> = ({formato}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const g = GRUPOS.find((x) => f >= x.de && f < x.ate);
  if (!g) return null;
  const vertical = formato.altura > formato.largura;
  const tamanho = vertical ? 66 : 54;
  const s = spring({frame: f - g.de, fps, config: MOLA_SECA, durationInFrames: 10});
  return (
    <div
      style={{
        position: 'absolute',
        left: formato.seguro.esq,
        right: formato.seguro.dir,
        bottom: formato.seguro.base + (vertical ? 40 : 30),
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        columnGap: tamanho * 0.22,
        fontFamily: FONTE_TITULO,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.15,
        transform: `translateY(${(1 - s) * 30}px) scale(${0.92 + 0.08 * s})`,
        clipPath: `inset(${(1 - s) * 100}% -10% -10% -10%)`,
      }}
    >
      {g.palavras.map((p, i) => {
        const falando = f >= p.q && f < p.fim + 2;
        return (
          <span
            key={i}
            style={{
              padding: '0.04em 0.18em',
              borderRadius: '0.18em',
              background: falando ? COR.destaque : 'transparent',
              color: falando ? COR.fundo : COR.texto,
              textShadow: falando ? 'none' : '0 3px 18px rgba(0,0,0,.65)',
            }}
          >
            {p.texto}
          </span>
        );
      })}
    </div>
  );
};
