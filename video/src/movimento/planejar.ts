// Escolhe a transição de cada troca de cena. Regras (decisão do Felipe em 18/10/2026: nunca repetir uma transição
// várias vezes):
//   - a mesma transição nunca aparece em duas trocas seguidas;
//   - cada transição aparece no máximo MAX_USOS vezes no vídeo inteiro;
//   - 'corte' (corte seco) não é efeito: não conta nessas regras.
// Sem pedido no roteiro, a escolha sai da família do estilo, preferindo a menos usada e a que não apareceu nas
// últimas trocas; o desempate é por semente (o título), então o mesmo roteiro dá sempre o mesmo vídeo.
// Pedido no roteiro que quebra uma regra para o vídeo com erro. Módulo puro: os testes rodam no Node.
import type {TipoTransicao} from './transicoes-dados.ts';

export const MAX_USOS = 2;
export const CORTE: TipoTransicao = 'corte';

export type Escolha = {tipo: TipoTransicao; variante: number};

// hash FNV-1a de 32 bits: determinístico e igual no navegador e no Node
export const hash = (texto: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
};

export const planejar = (
  pedidos: (TipoTransicao | undefined)[], // um por troca (a troca i leva à cena i + 1)
  familia: TipoTransicao[],
  semente: string,
  maxUsos: number = MAX_USOS,
): Escolha[] => {
  const usos = new Map<TipoTransicao, number>();
  const escolhas: Escolha[] = [];
  const recentes = (n: number) => escolhas.slice(-n).map((e) => e.tipo);

  pedidos.forEach((pedido, i) => {
    let tipo: TipoTransicao;
    if (pedido) {
      if (pedido !== CORTE) {
        if (escolhas.length && escolhas[escolhas.length - 1].tipo === pedido) {
          throw new Error(`transição repetida em trocas seguidas: "${pedido}" na entrada das cenas ${i + 1} e ${i + 2} do roteiro`);
        }
        if ((usos.get(pedido) ?? 0) >= maxUsos) {
          throw new Error(`a transição "${pedido}" passaria de ${maxUsos} usos no vídeo (entrada da cena ${i + 2} do roteiro); escolha outra`);
        }
      }
      tipo = pedido;
    } else {
      const anterior = escolhas.length ? escolhas[escolhas.length - 1].tipo : null;
      const candidatas = familia.filter((t) => t !== CORTE && t !== anterior && (usos.get(t) ?? 0) < maxUsos);
      if (candidatas.length) {
        const perto = recentes(3);
        candidatas.sort((a, b) => {
          const ua = (usos.get(a) ?? 0) + (perto.includes(a) ? 0.5 : 0);
          const ub = (usos.get(b) ?? 0) + (perto.includes(b) ? 0.5 : 0);
          if (ua !== ub) return ua - ub;
          return hash(`${semente}|${i}|${a}`) - hash(`${semente}|${i}|${b}`);
        });
        tipo = candidatas[0];
      } else if (familia.includes(CORTE)) {
        tipo = CORTE;
      } else {
        throw new Error(
          `a família de transições do estilo acabou na entrada da cena ${i + 2} (${familia.join(', ')}, no máximo ${maxUsos} usos cada): ` +
            'acrescente "corte" à família ou peça "corte" em algumas cenas do roteiro',
        );
      }
    }
    usos.set(tipo, (usos.get(tipo) ?? 0) + 1);
    // a variante (direção, ponto de origem, ângulo) muda a cada uso da mesma transição
    const variante = (hash(`${semente}|v|${tipo}`) + (usos.get(tipo) ?? 1) * 3) % 8;
    escolhas.push({tipo, variante});
  });
  return escolhas;
};
