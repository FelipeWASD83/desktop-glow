// Imprime (em JSON) o plano de transições do roteiro, pelo mesmo planejador que o vídeo usa. Chamado pelo
// conferir.py. O Node 24 lê os .ts direto (tira os tipos sozinho).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ESTILOS} from '../src/movimento/estilos.ts';
import {planejar} from '../src/movimento/planejar.ts';
import {TIPOS_TRANSICAO} from '../src/movimento/transicoes-dados.ts';

const roteiro = process.argv[2] ? pathToFileURL(join(process.argv[2], 'src', 'roteiro.json')) : new URL('../src/roteiro.json', import.meta.url);
const r = JSON.parse(readFileSync(roteiro, 'utf8'));
try {
  const nome = r.estilo ?? 'cinetico';
  const estilo = ESTILOS[nome];
  if (!estilo) throw new Error(`estilo desconhecido: "${nome}" (tem: ${Object.keys(ESTILOS).join(', ')})`);
  if (r.cenas[0]?.transicao) throw new Error(`a primeira cena (${r.cenas[0].id}) não tem transição de entrada`);
  for (const c of r.cenas) {
    if (c.transicao && !TIPOS_TRANSICAO.includes(c.transicao)) throw new Error(`transição desconhecida na cena ${c.id}: "${c.transicao}"`);
  }
  const plano = planejar(r.cenas.slice(1).map((c) => c.transicao), estilo.transicoes, r.titulo);
  const trocas = plano.map((e, i) => ({para: r.cenas[i + 1].id, tipo: e.tipo, pedida: Boolean(r.cenas[i + 1].transicao)}));
  console.log(JSON.stringify({ok: true, estilo: nome, nomeEstilo: estilo.nome, textoPadrao: estilo.texto[0], trocas}));
} catch (e) {
  console.log(JSON.stringify({ok: false, erro: e.message}));
}
