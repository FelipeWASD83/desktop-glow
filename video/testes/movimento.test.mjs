// Testes dos módulos puros (planejador de transições, estilos, keyframes). Rodar: node --test testes/
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chave, chaves, atrasoGrade, atrasoCentro} from '../src/movimento/chaves.ts';
import {ESTILOS} from '../src/movimento/estilos.ts';
import {MAX_USOS, planejar} from '../src/movimento/planejar.ts';
import {TIPOS_TRANSICAO, TRANSICOES} from '../src/movimento/transicoes-dados.ts';

const confere = (escolhas) => {
  const usos = {};
  escolhas.forEach((e, i) => {
    if (e.tipo === 'corte') return;
    usos[e.tipo] = (usos[e.tipo] ?? 0) + 1;
    if (i > 0) assert.notEqual(e.tipo, escolhas[i - 1].tipo, `repetida seguida na troca ${i}`);
  });
  for (const [t, n] of Object.entries(usos)) assert.ok(n <= MAX_USOS, `${t} usada ${n} vezes`);
};

test('nenhum estilo repete transição nem passa do máximo, de 1 a 20 trocas', () => {
  for (const [nome, estilo] of Object.entries(ESTILOS)) {
    for (let n = 1; n <= 20; n++) {
      const escolhas = planejar(Array(n).fill(undefined), estilo.transicoes, `teste-${nome}`);
      assert.equal(escolhas.length, n);
      confere(escolhas);
    }
  }
});

test('o planejador prefere efeito a corte enquanto a família tem efeito sobrando', () => {
  const escolhas = planejar(Array(5).fill(undefined), ESTILOS.cinetico.transicoes, 'x');
  assert.ok(escolhas.every((e) => e.tipo !== 'corte'));
  assert.equal(new Set(escolhas.map((e) => e.tipo)).size, 5, 'cinco trocas, cinco transições diferentes');
});

test('mesmo roteiro, mesmo plano (determinístico)', () => {
  const a = planejar(Array(8).fill(undefined), ESTILOS.glitch.transicoes, 'video');
  const b = planejar(Array(8).fill(undefined), ESTILOS.glitch.transicoes, 'video');
  assert.deepEqual(a, b);
});

test('pedido repetido em seguida para com erro', () => {
  assert.throws(() => planejar(['iris', 'iris'], ESTILOS.cinetico.transicoes, 'x'), /repetida/);
});

test('pedido além do máximo para com erro', () => {
  assert.throws(() => planejar(['iris', 'zoom', 'iris', 'zoom', 'iris'], ESTILOS.cinetico.transicoes, 'x'), /passaria de 2 usos/);
});

test('corte seco pode repetir e não conta', () => {
  const e = planejar(['corte', 'corte', 'corte', undefined], ESTILOS.cinetico.transicoes, 'x');
  assert.deepEqual(e.slice(0, 3).map((x) => x.tipo), ['corte', 'corte', 'corte']);
  assert.notEqual(e[3].tipo, 'corte');
});

test('família sem corte que acaba para com erro claro', () => {
  assert.throws(() => planejar(Array(5).fill(undefined), ['iris', 'zoom'], 'x'), /família de transições do estilo acabou/);
});

test('todo estilo usa só transições que existem e tem pelo menos 4 efeitos', () => {
  for (const [nome, e] of Object.entries(ESTILOS)) {
    for (const t of e.transicoes) assert.ok(TIPOS_TRANSICAO.includes(t), `${nome}: ${t}`);
    assert.ok(e.transicoes.filter((t) => t !== 'corte').length >= 4, nome);
    assert.ok(e.entradas.length >= 4, `${nome}: poucas entradas`);
  }
  for (const [t, d] of Object.entries(TRANSICOES)) assert.ok(d.dura >= 2 && d.entra > 0 && d.entra < 1, t);
});

test('chave e chaves interpolam e seguram nas pontas', () => {
  assert.equal(chave(-5, [[0, 10], [10, 20]]), 10);
  assert.equal(chave(5, [[0, 10], [10, 20]], 'linear'), 15);
  assert.equal(chave(50, [[0, 10], [10, 20]]), 20);
  const c = chaves(10, [{q: 0, x: 0, zoom: 1}, {q: 20, x: 100, curva: 'linear'}, {q: 40, zoom: 2}]);
  assert.equal(c.x, 50);
  assert.ok(c.zoom > 1 && c.zoom < 2);
  assert.throws(() => chave(5, [[10, 0], [5, 1]]), /crescer/);
});

test('atrasos: o canto de origem é zero e o oposto é o total', () => {
  assert.equal(atrasoGrade(0, 0, 8, 5, [0, 0], 20), 0);
  assert.equal(atrasoGrade(7, 4, 8, 5, [0, 0], 20), 20);
  assert.equal(atrasoCentro(2, 5, 10), 0);
  assert.equal(atrasoCentro(0, 5, 10), 10);
});
