// Keyframes e atrasos para cena complexa. Módulo puro (sem Remotion): testável no Node.
//
//   chave(f, [[0, 0], [30, 1], [60, 0.4]])           um número por keyframes, com curva suave entre eles
//   chaves(f, [{q: 0, x: 0, zoom: 1}, {q: 40, x: -300, zoom: 1.4}])   vários números de uma vez (câmera)
//   atrasoGrade(col, lin, cols, lins, [0, 0], 18)   atraso de cada célula pela distância a um canto
//   atrasoCentro(i, n, 12)                          atraso pela distância ao meio de uma fileira

export type Curva = 'linear' | 'entra' | 'sai' | 'suave' | 'forte' | 'expo';

const CURVAS: Record<Curva, (t: number) => number> = {
  linear: (t) => t,
  entra: (t) => t * t * t, // acelera (saída de cena)
  sai: (t) => 1 - Math.pow(1 - t, 3), // desacelera (entrada de cena)
  suave: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  forte: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

export const curva = (nome: Curva, t: number) => CURVAS[nome](Math.min(1, Math.max(0, t)));

export const chave = (f: number, pontos: [number, number][], nome: Curva = 'suave'): number => {
  if (!pontos.length) throw new Error('chave() sem pontos');
  for (let i = 1; i < pontos.length; i++) {
    if (pontos[i][0] <= pontos[i - 1][0]) throw new Error(`chave(): os quadros precisam crescer (${pontos[i - 1][0]} e depois ${pontos[i][0]})`);
  }
  if (f <= pontos[0][0]) return pontos[0][1];
  for (let i = 1; i < pontos.length; i++) {
    const [q0, v0] = pontos[i - 1];
    const [q1, v1] = pontos[i];
    if (f <= q1) return v0 + (v1 - v0) * curva(nome, (f - q0) / (q1 - q0));
  }
  return pontos[pontos.length - 1][1];
};

export type Ponto = {q: number; curva?: Curva} & Record<string, number | Curva | undefined>;

// cada propriedade é interpolada entre os pontos que a definem; a curva do ponto de chegada vale para o trecho
export const chaves = <K extends string>(f: number, pontos: Ponto[]): Record<K, number> => {
  const nomes = new Set<string>();
  for (const p of pontos) for (const k of Object.keys(p)) if (k !== 'q' && k !== 'curva') nomes.add(k);
  const saida: Record<string, number> = {};
  for (const nome of nomes) {
    const com = pontos.filter((p) => typeof p[nome] === 'number');
    if (f <= com[0].q) {
      saida[nome] = com[0][nome] as number;
      continue;
    }
    saida[nome] = com[com.length - 1][nome] as number;
    for (let i = 1; i < com.length; i++) {
      if (f <= com[i].q) {
        const t = (f - com[i - 1].q) / (com[i].q - com[i - 1].q);
        const a = com[i - 1][nome] as number;
        const b = com[i][nome] as number;
        saida[nome] = a + (b - a) * curva((com[i].curva as Curva) ?? 'suave', t);
        break;
      }
    }
  }
  return saida as Record<K, number>;
};

// atraso (em quadros) de uma célula da grade pela distância até a origem (0..1 em x e y), até "total" quadros
export const atrasoGrade = (col: number, lin: number, cols: number, lins: number, origem: [number, number], total: number): number => {
  const x = cols > 1 ? col / (cols - 1) : 0;
  const y = lins > 1 ? lin / (lins - 1) : 0;
  const d = Math.hypot(x - origem[0], y - origem[1]);
  const max = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => Math.hypot(a - origem[0], b - origem[1])));
  return Math.round((d / max) * total);
};

// atraso de um item numa fileira pela distância ao meio (o meio entra primeiro)
export const atrasoCentro = (i: number, n: number, total: number): number => {
  if (n <= 1) return 0;
  const meio = (n - 1) / 2;
  return Math.round((Math.abs(i - meio) / meio) * total);
};
