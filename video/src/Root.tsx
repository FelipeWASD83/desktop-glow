// As composições, para cada formato do roteiro:
//   Video-<formato>              o vídeo inteiro
//   Capa-<formato>               o quadro parado da capa
//   Cena-<id>-<formato>          uma cena só, com as trocas de entrada e saída (para conferir sem renderizar o resto)
import {Composition} from 'remotion';
import {LINHA, ROTEIRO} from './linha';
import {FORMATOS, FPS} from './tema';
import {Capa, SoCena, Video, duracaoDaCena, type PropsVideo} from './Video';

export const Raiz: React.FC = () => (
  <>
    {ROTEIRO.formatos.map((id) => {
      const f = FORMATOS[id];
      if (!f) throw new Error(`formato desconhecido no roteiro: ${id}`);
      const props: PropsVideo = {formato: id, guias: false, som: true, trilha: true, legenda: ROTEIRO.legenda ?? false};
      const comum = {fps: FPS, width: f.largura, height: f.altura};
      return [
        <Composition key={`v-${id}`} id={`Video-${id}`} component={Video} durationInFrames={LINHA.duracao} defaultProps={props} {...comum} />,
        <Composition key={`c-${id}`} id={`Capa-${id}`} component={Capa} durationInFrames={LINHA.duracao} defaultProps={props} {...comum} />,
        ...LINHA.cenas.map((c) => (
          <Composition
            key={`cena-${c.id}-${id}`}
            id={`Cena-${c.id}-${id}`}
            component={SoCena}
            durationInFrames={duracaoDaCena(c)}
            defaultProps={{...props, cena: c.id}}
            {...comum}
          />
        )),
      ];
    })}
  </>
);
