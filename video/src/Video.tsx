// O vídeo inteiro: fundo contínuo, as cenas em sequência com a transição planejada de cada troca, a voz, os
// efeitos, a trilha (que abaixa sozinha enquanto a voz fala) e a legenda. Serve a todos os formatos do roteiro.
import {AbsoluteFill, Freeze, Sequence, getStaticFiles, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {CENAS} from './cenas';
import {Guias} from './componentes/Apoio';
import {Fundo} from './componentes/Fundo';
import {Legenda} from './componentes/Legenda';
import {Cobertura, visualDaCena} from './componentes/Transicoes';
import {CenaProvider, LINHA, ROTEIRO, type Cena} from './linha';
import {SONS} from './sons';
import {FORMATOS, FPS, type Formato} from './tema';

export type PropsVideo = {formato: string; guias: boolean; som: boolean; trilha: boolean; legenda: boolean};

const exigir = (arquivo: string, comando: string) => {
  if (!getStaticFiles().some((a) => a.name === arquivo)) throw new Error(`falta public/${arquivo}: rode ${comando}`);
};

export const formatoDe = (id: string): Formato => {
  const f = FORMATOS[id];
  if (!f) throw new Error(`formato desconhecido: ${id} (tem: ${Object.keys(FORMATOS).join(', ')})`);
  return f;
};

const CenaNaTela: React.FC<{cena: Cena; formato: Formato}> = ({cena, formato}) => {
  const f = useCurrentFrame();
  const Componente = CENAS[cena.id];
  if (!Componente) throw new Error(`falta o componente da cena "${cena.id}" em src/cenas/index.ts`);
  // durante a troca que traz a cena e durante a que a leva embora, a transição decide como ela aparece
  let visual = {} as ReturnType<typeof visualDaCena>;
  if (cena.trocaAntes && f < cena.trocaAntes.dura) visual = visualDaCena(cena.trocaAntes, 'entra', f / cena.trocaAntes.dura, formato.largura, formato.altura);
  else if (cena.trocaDepois && f >= cena.dura) visual = visualDaCena(cena.trocaDepois, 'sai', (f - cena.dura) / cena.trocaDepois.dura, formato.largura, formato.altura);
  if (visual.oculta) return null;
  const conteudo = (
    <CenaProvider value={{cena, formato}}>
      <Componente />
    </CenaProvider>
  );
  if (visual.partes) {
    return (
      <>
        {visual.partes.map((estilo, i) => (
          <AbsoluteFill key={i} style={estilo}>
            {conteudo}
          </AbsoluteFill>
        ))}
      </>
    );
  }
  return <AbsoluteFill style={visual.estilo}>{conteudo}</AbsoluteFill>;
};

export const Video: React.FC<PropsVideo> = ({formato, guias, som, trilha, legenda}) => {
  const fmt = formatoDe(formato);
  const {durationInFrames} = useVideoConfig();
  const {cenas} = LINHA;

  const efeitos = som
    ? [
        // o som de cada troca chega um pouco antes do meio dela (o ouvido percebe antes do olho)
        ...cenas.flatMap((c) =>
          c.trocaAntes?.som ? [{arquivo: c.trocaAntes.som, quadro: c.de + Math.round(c.trocaAntes.dura / 2) - 6, volume: 0.42}] : [],
        ),
        ...SONS(),
      ]
    : [];
  if (som) {
    for (const e of efeitos) exigir(e.arquivo, 'npm run sons');
    for (const c of cenas) if (c.arquivo) exigir(c.arquivo, 'npm run narrar');
    if (trilha) exigir('sons/trilha.wav', 'npm run sons');
  }

  // a trilha abaixa enquanto a voz fala, com rampa de 10 quadros
  const falas = cenas.filter((c) => c.fala !== null).map((c) => [c.de + c.fala!, c.de + c.fala! + c.falaDura]);
  const sobVoz = (q: number) => {
    let m = 0;
    for (const [a, b] of falas) {
      const d = q < a ? a - q : q > b ? q - b : 0;
      m = Math.max(m, 1 - Math.min(1, d / 10));
    }
    return 1 - ROTEIRO.trilha.sobVoz * m;
  };
  const entraESai = (q: number) =>
    interpolate(q, [0, 20, durationInFrames - 45, durationInFrames - 2], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill>
      <Fundo />
      {cenas.map((c, i) => (
        <Sequence key={c.id} from={c.de} durationInFrames={c.dura + (c.trocaDepois?.dura ?? 0)} name={`${i + 1} ${c.id}`}>
          <CenaNaTela cena={c} formato={fmt} />
        </Sequence>
      ))}
      {cenas.map((c) =>
        c.trocaAntes ? (
          <Sequence key={`troca-${c.id}`} from={c.de} durationInFrames={c.trocaAntes.dura} name={`troca ${c.trocaAntes.tipo}`}>
            <Cobertura troca={c.trocaAntes} />
          </Sequence>
        ) : null,
      )}
      {legenda && <Legenda formato={fmt} />}
      {som &&
        cenas
          .filter((c) => c.arquivo)
          .map((c) => (
            <Sequence key={`fala-${c.id}`} from={c.de + c.fala!} name={`fala ${c.id}`} layout="none">
              <Audio src={staticFile(c.arquivo!)} />
            </Sequence>
          ))}
      {efeitos.map((e, i) => (
        <Sequence key={`som-${i}`} from={Math.max(0, e.quadro)} name={`som ${e.arquivo}`} layout="none">
          <Audio src={staticFile(e.arquivo)} volume={e.volume} />
        </Sequence>
      ))}
      {som && trilha && <Audio src={staticFile('sons/trilha.wav')} volume={(q) => ROTEIRO.trilha.volume * sobVoz(q) * entraESai(q)} />}
      {guias && <Guias formato={fmt} />}
    </AbsoluteFill>
  );
};

// A capa: um quadro parado do vídeo (o segundo "capa" do roteiro). A composição tem a duração do vídeo inteiro:
// com 1 quadro só, as cenas depois do quadro 0 seriam cortadas e a capa sairia vazia.
export const QUADRO_DA_CAPA = Math.min(Math.round(ROTEIRO.capa * FPS), LINHA.duracao - 1);

export const Capa: React.FC<PropsVideo> = (props) => (
  <Freeze frame={QUADRO_DA_CAPA}>
    <Video {...props} som={false} legenda={false} />
  </Freeze>
);

// Uma cena só (composição Cena-<id>-<formato>): o vídeo inteiro deslocado para começar na troca que traz a cena e
// terminar depois da troca que a leva. Serve para conferir e ajustar uma cena sem renderizar o resto.
export const duracaoDaCena = (c: Cena) => c.dura + (c.trocaDepois?.dura ?? 0);

export const SoCena: React.FC<PropsVideo & {cena: string}> = ({cena, ...props}) => {
  const c = LINHA.cenas.find((x) => x.id === cena);
  if (!c) throw new Error(`cena desconhecida: ${cena}`);
  return (
    <Sequence from={-c.de} layout="none">
      <Video {...props} />
    </Sequence>
  );
};
