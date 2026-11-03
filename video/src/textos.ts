// Every word on screen, in English and Portuguese. The script picks the language ("lingua") and the app ("app").
// Inside a text: \n breaks the line, *words* come out in the accent color.
import roteiro from './roteiro.json';
import type {App} from './tema';

export const LINGUA: 'en' | 'pt' = (roteiro as {lingua?: string}).lingua === 'pt' ? 'pt' : 'en';
export const APP_DO_VIDEO = ((roteiro as {app?: string}).app ?? 'todos') as App | 'todos';
export const VERTICAL_DO_ROTEIRO = (roteiro as {formatos: string[]}).formatos[0] === '9x16';

type Par = {en: string; pt: string};
const T_: Record<string, Par> = {
  'nome.ilha': {en: 'Ilha', pt: 'Ilha'},
  'nome.relogio': {en: 'Relógio Mond', pt: 'Relógio Mond'},
  'nome.fundovivo': {en: 'Fundo Vivo', pt: 'Fundo Vivo'},
  'nome.cursores': {en: 'Ilha Cursors', pt: 'Cursores da Ilha'},
  'nome.pacote': {en: 'Pacote Windows Bonito', pt: 'Pacote Windows Bonito'},

  'sub.ilha': {en: 'The Dynamic Island,\nnow on Windows.', pt: 'A Dynamic Island,\nagora no Windows.'},
  'sub.relogio': {en: 'A desktop clock\nin Mond style.', pt: 'Um relógio de área de\ntrabalho no estilo Mond.'},
  'sub.fundovivo': {en: 'Live wallpapers\nthat stay light.', pt: 'Papel de parede\nanimado e leve.'},
  'sub.cursores': {en: 'Pointers that\nmatch the island.', pt: 'Ponteiros que\ncombinam com a ilha.'},

  'gancho.todos': {en: 'Make Windows\n*look like this.*', pt: 'Deixe o Windows\n*assim.*'},
  'gancho.ilha': {en: 'Windows never had\na *Dynamic Island.*', pt: 'O Windows nunca teve\n*Dynamic Island.*'},
  'gancho.ilha2': {en: 'Until now.', pt: 'Até agora.'},
  'gancho.relogio': {en: 'Your desktop is\n*missing something.*', pt: 'Falta uma coisa\n*na sua área de trabalho.*'},
  'gancho.fundovivo': {en: 'Live wallpapers,\n*without the weight.*', pt: 'Papel de parede vivo,\n*sem pesar.*'},
  'gancho.cursores': {en: 'Your cursor\n*deserves better.*', pt: 'Seu cursor\n*merece mais.*'},

  'ilha.musica': {en: 'Your music,\n*live.*', pt: 'Sua música,\n*ao vivo.*'},
  'ilha.musica.sub': {en: 'Cover, controls\nand a visualizer.', pt: 'Capa, controles\ne visualizador.'},
  'ilha.timer': {en: 'Timers and\n*pomodoro.*', pt: 'Timer e\n*pomodoro.*'},
  'ilha.timer.sub': {en: 'A ring that counts down\nright at the top.', pt: 'Um anel que conta\nlá no topo.'},
  'ilha.gravar': {en: 'Record the screen\n*in one click.*', pt: 'Grave a tela\n*num clique.*'},
  'ilha.gravar.sub': {en: 'Screen, camera or audio.', pt: 'Tela, câmera ou áudio.'},
  'ilha.alertas': {en: 'Only the alerts\n*that matter.*', pt: 'Só os avisos\n*que importam.*'},
  'ilha.alertas.sub': {en: 'Battery, Caps Lock,\ncamera and mic.', pt: 'Bateria, Caps Lock,\ncâmera e microfone.'},
  'ilha.menu': {en: 'A control center\n*on top.*', pt: 'Central de controle\n*no topo.*'},
  'ilha.numeros': {en: '*250 fps.*\nAlmost zero CPU.', pt: '*250 fps.*\nCPU quase parada.'},
  'ilha.numeros.sub': {en: 'Animated by the\nWindows compositor.', pt: 'Animada pelo\ncompositor do Windows.'},

  'relogio.mostrador': {en: 'Day, date, time\nand *weather.*', pt: 'Dia, data, hora\ne *clima.*'},
  'relogio.musica': {en: 'And what is\n*playing now.*', pt: 'E o que está\n*tocando agora.*'},
  'relogio.musica.sub': {en: 'Hover the cover\nto pause or skip.', pt: 'Passe o mouse na capa\npara pausar ou pular.'},
  'relogio.detalhe1': {en: 'Visible on Win + D', pt: 'Aparece no Win + D'},
  'relogio.detalhe2': {en: 'Bars that sleep in silence', pt: 'Barras que dormem no silêncio'},
  'relogio.detalhe3': {en: 'English and Portuguese', pt: 'Português e inglês'},
  'relogio.detalhes': {en: 'Made to stay\n*out of the way.*', pt: 'Feito para não\n*atrapalhar.*'},

  'fundo.galeria': {en: 'Video, picture, web\nand *its own format.*', pt: 'Vídeo, imagem, web\ne *formato próprio.*'},
  'fundo.monitores': {en: 'One wallpaper\n*per monitor.*', pt: 'Um fundo\n*por monitor.*'},
  'fundo.pausa': {en: 'Pauses when\n*a game* takes over.', pt: 'Pausa quando\n*um jogo* toma a tela.'},
  'fundo.pausado': {en: 'Paused', pt: 'Pausado'},
  'fundo.numeros': {en: '1080p video:\n*1.4%* of one core.', pt: 'Vídeo 1080p:\n*1,4%* de um núcleo.'},
  'fundo.numeros.sub': {en: 'Decoded on the GPU.', pt: 'Decodificado na placa de vídeo.'},
  'fundo.biblioteca': {en: 'Pick, click, *done.*', pt: 'Escolha, clique, *pronto.*'},

  'cursor.esquemas': {en: 'Black *or* white.', pt: 'Preto *ou* branco.'},
  'cursor.esquemas.sub': {en: 'Outlined in the\nopposite color.', pt: 'Contorno na\ncor oposta.'},
  'cursor.preto': {en: 'Black', pt: 'Preto'},
  'cursor.branco': {en: 'White', pt: 'Branco'},
  'cursor.morfo': {en: 'Every pointer\n*morphs in.*', pt: 'Cada ponteiro\n*se transforma.*'},
  'cursor.morfo.sub': {en: '17 pointers, animated at 60 fps.', pt: '17 ponteiros, animados a 60 fps.'},
  'cursor.ocupado': {en: 'Even *waiting*\nlooks good.', pt: 'Até *esperar*\nfica bonito.'},

  'fecho.todos': {en: '*One installer.*\nFour apps.', pt: '*Um instalador.*\nQuatro apps.'},
  'fecho.gratis': {en: 'Free and open source', pt: 'Grátis e de código aberto'},
  'fecho.parte': {en: 'Free, in Pacote Windows Bonito', pt: 'Grátis, no Pacote Windows Bonito'},
  'fecho.url': {en: 'github.com/FelipeWASD83/pacote-windows-bonito', pt: 'github.com/FelipeWASD83/pacote-windows-bonito'},

  // what the made-up screens say
  'tela.musica': {en: 'Night Drive', pt: 'Night Drive'},
  'tela.artista': {en: 'Pacote Windows', pt: 'Pacote Windows'},
  'tela.fone': {en: 'Headphones', pt: 'Fone'},
  'tela.caps': {en: 'Caps Lock on', pt: 'Caps Lock ligado'},
  'tela.camera': {en: 'Camera on', pt: 'Câmera ligada'},
  'tela.gravando': {en: 'Recording', pt: 'Gravando'},
  'tela.foco': {en: 'Focus', pt: 'Foco'},
  'tela.som': {en: 'Sound', pt: 'Som'},
  'tela.brilho': {en: 'Brightness', pt: 'Brilho'},
  'tela.tradutor': {en: 'Translator', pt: 'Tradutor'},
  'tela.timer': {en: 'Timer', pt: 'Timer'},
  'tela.gravar': {en: 'Record', pt: 'Gravar'},
  'tela.nota': {en: 'Note', pt: 'Nota'},
  'tela.cpu': {en: 'CPU', pt: 'CPU'},
};

export const T = (chave: string): string => {
  const par = T_[chave];
  if (!par) throw new Error(`missing text: ${chave}`);
  return par[LINGUA];
};

// "18:42" or "6:42 PM" style is not needed: the clock in the videos always shows 24 h like the default
export const DATA_DO_VIDEO = new Date(2026, 10, 3, 18, 42, 0);
