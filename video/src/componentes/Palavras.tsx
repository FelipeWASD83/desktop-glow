// Tipografia cinética. Modos (modo="..."; padrão: o primeiro modo de texto do estilo):
//   sobe       cada palavra sobe de dentro de uma máscara
//   recorte    cada palavra é revelada da esquerda para a direita
//   foco       cada palavra chega de desfocada e grande para nítida
//   cai        cada palavra cai de cima girando e quica
//   letra      letra por letra, cada uma subindo da máscara
//   embaralha  cada letra passa por caracteres aleatórios até parar na certa
// Marcação no texto:
//   \n           quebra a linha (em pé, quebrar à mão: deixar o navegador quebrar deixa palavra órfã)
//   *palavras*   saem na cor de destaque (pode abranger várias palavras)
//   {marca}      antes de uma palavra: ela entra quando a fala diz a palavra marcada (as seguintes vêm em sequência)
import {interpolate, random, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {ESTILO, MOLA_QUICA, MOLA_SECA} from '../estilo';
import {useCena} from '../linha';
import type {ModoTexto} from '../movimento/estilos';
import {COR, FONTE_TITULO} from '../tema';

type Props = {
  texto: string;
  tamanho: number;
  modo?: ModoTexto;
  inicio?: number;
  intervalo?: number; // quadros entre uma palavra e a próxima
  saida?: number; // quadro em que o bloco inteiro sai (sobe recortado)
  alinhamento?: 'left' | 'center' | 'right';
  largura?: number;
  cor?: string;
  corDestaque?: string;
  fonte?: string;
  peso?: number;
  entrelinha?: number;
  espacamento?: string; // letter-spacing
};

const MARCA = /^\{([a-z0-9_]+)\}(.*)$/;
const L = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lim = (t: number) => Math.min(1, Math.max(0, t));
const SIMBOLOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=?<>/';

type Palavra = {texto: string; quando: number; destaque: boolean};

const Mascarada: React.FC<{tamanho: number; children: React.ReactNode}> = ({tamanho, children}) => (
  <span style={{display: 'inline-block', overflow: 'hidden', paddingBottom: tamanho * 0.14, marginBottom: -tamanho * 0.14, verticalAlign: 'top'}}>
    {children}
  </span>
);

export const Palavras: React.FC<Props> = ({
  texto,
  tamanho,
  modo = ESTILO.texto[0],
  inicio,
  intervalo = 3,
  saida,
  alinhamento = 'center',
  largura,
  cor = COR.texto,
  corDestaque = COR.destaque,
  fonte = FONTE_TITULO,
  peso = 800,
  entrelinha = 1.04,
  espacamento = '-0.03em',
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cena = useCena();
  let relogio = inicio ?? cena.fala ?? cena.entra;
  let dentro = false;
  // letra por letra anda mais devagar entre palavras: o tempo da palavra é o das letras dela
  const passoLetra = modo === 'letra' ? 1.3 : 1.6;

  const linhas = texto.split('\n').map((linha) => {
    const palavras: Palavra[] = [];
    for (let w of linha.split(/\s+/).filter(Boolean)) {
      const m = MARCA.exec(w);
      if (m) {
        relogio = cena.quando(m[1]);
        w = m[2];
        if (!w) continue; // "{marca} palavra": a marca vale para a próxima
      }
      const abre = w.startsWith('*');
      const fecha = /\*[.,;:!?…"')]*$/.test(w);
      const limpa = w.replace(/\*/g, '');
      palavras.push({texto: limpa, quando: relogio, destaque: dentro || abre});
      dentro = (dentro || abre) && !fecha;
      relogio += modo === 'letra' || modo === 'embaralha' ? Math.max(intervalo, Math.round(limpa.length * passoLetra * 0.6)) : intervalo;
    }
    return palavras;
  });

  const desenhar = (p: Palavra, i: number) => {
    const corPalavra = p.destaque ? corDestaque : undefined;
    if (modo === 'letra' || modo === 'embaralha') {
      return (
        <span key={i} style={{display: 'inline-flex', color: corPalavra}}>
          {[...p.texto].map((ch, j) => {
            const q0 = p.quando + j * passoLetra;
            if (modo === 'letra') {
              const s = spring({frame: f - q0, fps, config: MOLA_SECA, durationInFrames: 14});
              return (
                <Mascarada key={j} tamanho={tamanho}>
                  <span style={{display: 'inline-block', transform: `translateY(${interpolate(s, [0, 1], [110, 0])}%)`}}>{ch}</span>
                </Mascarada>
              );
            }
            // embaralha: a letra certa ocupa o lugar (invisível) e por cima corre o sorteio até a hora de parar
            const para = q0 + 6;
            const mostra = f >= q0;
            const sorteada = f >= para ? ch : SIMBOLOS[Math.floor(random(`emb-${i}-${j}-${Math.floor(f / 2)}`) * SIMBOLOS.length)];
            const letra = ch === ch.toLowerCase() ? sorteada.toLowerCase() : sorteada;
            return (
              <span key={j} style={{position: 'relative', display: 'inline-block'}}>
                <span style={{visibility: 'hidden'}}>{ch}</span>
                {mostra && (
                  <span style={{position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center', color: f >= para ? undefined : COR.textoSuave}}>{letra}</span>
                )}
              </span>
            );
          })}
        </span>
      );
    }
    if (modo === 'recorte') {
      const q = interpolate(f, [p.quando, p.quando + 12], [0, 1], {...L, easing: Easing.out(Easing.cubic)});
      return (
        <span key={i} style={{display: 'inline-block', clipPath: `inset(-20% ${(1 - q) * 100}% -20% 0)`, transform: `translateX(${(1 - q) * -0.15}em)`, color: corPalavra}}>
          {p.texto}
        </span>
      );
    }
    if (modo === 'foco') {
      const q = interpolate(f, [p.quando, p.quando + 16], [0, 1], {...L, easing: Easing.out(Easing.exp)});
      return (
        <span key={i} style={{display: 'inline-block', filter: `blur(${(1 - q) * 22}px)`, transform: `scale(${1.25 - 0.25 * q})`, opacity: lim(q * 3), color: corPalavra}}>
          {p.texto}
        </span>
      );
    }
    if (modo === 'cai') {
      const s = spring({frame: f - p.quando, fps, config: MOLA_QUICA, durationInFrames: 24});
      return (
        <span
          key={i}
          style={{display: 'inline-block', transform: `translateY(${(1 - s) * -1.4}em) rotate(${(1 - s) * (i % 2 ? 14 : -14)}deg)`, opacity: lim(s * 5), color: corPalavra}}
        >
          {p.texto}
        </span>
      );
    }
    const s = spring({frame: f - p.quando, fps, config: MOLA_SECA, durationInFrames: 16});
    return (
      <Mascarada key={i} tamanho={tamanho}>
        <span style={{display: 'inline-block', transform: `translateY(${interpolate(s, [0, 1], [110, 0])}%)`, color: corPalavra}}>{p.texto}</span>
      </Mascarada>
    );
  };

  // saída: o bloco sobe e é recortado por cima (continua o movimento, sem fade)
  const k = saida === undefined ? 0 : interpolate(f, [saida, saida + 12], [0, 1], {...L, easing: Easing.in(Easing.cubic)});
  const justifica = alinhamento === 'center' ? 'center' : alinhamento === 'right' ? 'flex-end' : 'flex-start';
  return (
    <div
      style={{
        fontFamily: fonte,
        fontWeight: peso,
        fontSize: tamanho,
        lineHeight: entrelinha,
        letterSpacing: espacamento,
        color: cor,
        textAlign: alinhamento,
        width: largura,
        transform: `translateY(${-k * tamanho * 0.8}px)`,
        clipPath: k > 0 ? `inset(0 0 ${k * 100}% 0)` : undefined,
      }}
    >
      {linhas.map((palavras, l) => (
        // espaço entre palavras pelo gap: espaço no fim de inline-block some
        <div key={l} style={{display: 'flex', flexWrap: 'wrap', justifyContent: justifica, columnGap: tamanho * 0.26}}>
          {palavras.map(desenhar)}
        </div>
      ))}
    </div>
  );
};
