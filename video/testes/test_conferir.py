"""Testes do conferir.py: numa cópia do src/ do modelo, planta cada problema e confere que ele barra (e que o
modelo limpo passa). Rodar: python -m unittest discover -s testes -p "test_*.py"
"""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONFERIR = RAIZ / "ferramentas" / "conferir.py"


class Conferir(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="conferir-"))
        shutil.copytree(RAIZ / "src", self.tmp / "src")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def rodar(self):
        r = subprocess.run([sys.executable, str(CONFERIR), "--raiz", str(self.tmp)], capture_output=True, text=True, encoding="utf-8")
        return r.returncode, r.stdout + r.stderr

    def roteiro(self, mexer):
        arq = self.tmp / "src" / "roteiro.json"
        dados = json.loads(arq.read_text(encoding="utf-8"))
        mexer(dados)
        arq.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")

    def cena(self, nome, corpo):
        (self.tmp / "src" / "cenas" / nome).write_text(corpo, encoding="utf-8")

    def test_modelo_limpo_passa(self):
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 0, saida)
        self.assertIn("nada barrado", saida)

    def test_transicao_repetida_em_seguida(self):
        self.roteiro(lambda d: (d["cenas"][1].update(transicao="iris"), d["cenas"][2].update(transicao="iris")))
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1, saida)
        self.assertIn("repetida", saida)

    def test_transicao_alem_do_maximo(self):
        def mexer(d):
            for c, t in zip(d["cenas"][1:], ["zoom", "iris", "zoom", "iris", "zoom"]):
                c["transicao"] = t
        self.roteiro(mexer)
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1, saida)
        self.assertIn("passaria de 2 usos", saida)

    def test_fade_solto_na_cena(self):
        self.cena("Fantasma.tsx", "export const F = () => <div style={{opacity: interpolate(f, [0, 10], [0, 1])}} />;\n")
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1, saida)
        self.assertIn("fade solto", saida)

    def test_fade_marcado_passa(self):
        self.cena("Fantasma.tsx", "export const F = () => <div style={{opacity: k}} />; // fade-ok: brilho que pisca\n")
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 0, saida)

    def test_entrada_monotona(self):
        blocos = "\n".join(f'<Entra tipo="mola" inicio={{{i}}}>x</Entra>' for i in range(12))
        self.cena("Monotona.tsx", f"export const M = () => <>{blocos}</>;\n")
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1, saida)
        self.assertIn("entrada monótona", saida)

    def test_math_random(self):
        self.cena("Sorte.tsx", "const x = Math.random();\n")
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1, saida)
        self.assertIn("Math.random", saida)

    def test_estilo_desconhecido(self):
        self.roteiro(lambda d: d.update(estilo="vaporwave"))
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1, saida)
        self.assertIn("estilo desconhecido", saida)


if __name__ == "__main__":
    unittest.main()
