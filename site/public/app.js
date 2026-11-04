// Desktop Glow site: language (follows the browser, PT/EN button), the island menu opening past the hero, the videos
// (play only while on screen, sound button, the right language) and the latest release's version and size.
(() => {
  document.documentElement.classList.add('js');

  // ---- the Portuguese side; English is what the HTML already says
  const PT = {
    'skip': 'Pular para os apps',
    'nav.apps': 'Apps', 'nav.install': 'Instalar', 'nav.faq': 'Dúvidas', 'nav.get': 'Baixar',
    'hero.title': 'Deixe o Windows <span class="glow">brilhando.</span>',
    'hero.lead': 'Uma ilha no topo da tela, um relógio na área de trabalho, fundos que se mexem e ponteiros que combinam. Quatro apps grátis, um instalador.',
    'hero.download': 'Baixar para Windows',
    'hero.source': 'Código no GitHub',
    'hero.meta': 'Versão {v} · {mb} MB · Windows 11, 64 bits',
    'ilha.name': 'Ilha',
    'ilha.lead': 'A Dynamic Island, agora no Windows. Uma pílula preta no topo da tela que cresce com o que está acontecendo.',
    'ilha.c1': 'Música com capa, controles e visualizador',
    'ilha.c2': 'Placar ao vivo do seu jogo competitivo',
    'ilha.c3': 'Timer, pomodoro e gravador de tela',
    'ilha.c4': 'Downloads da Steam, clima e modos de foco',
    'ilha.c5': 'Se esconde em tela cheia e nas partidas',
    'more': 'O repositório dele',
    'relogio.name': 'Relógio Mond',
    'relogio.lead': 'Um relógio de área de trabalho no estilo Mond: dia, data, hora e clima no meio do papel de parede, com a música que está tocando embaixo.',
    'relogio.c1': 'Barras que seguem o som da música',
    'relogio.c2': 'Passe o mouse na capa para pausar ou pular',
    'relogio.c3': 'O clima da sua cidade',
    'relogio.c4': 'Continua aparecendo no Win + D',
    'fundovivo.name': 'Fundo Vivo',
    'fundovivo.lead': 'Papel de parede animado e leve: um por monitor, decodificado na placa de vídeo, e nada rodando quando ninguém está olhando.',
    'fundovivo.c1': 'Dez fundos próprios, alguns mexendo com o som',
    'fundovivo.c2': 'Os seus vídeos, imagens e páginas web',
    'fundovivo.c3': 'Pausa quando um jogo toma a tela',
    'fundovivo.c4': 'Lê os fundos de vídeo e web que você tem no Wallpaper Engine',
    'cursores.name': 'Cursores da Ilha',
    'cursores.lead': 'Ponteiros que combinam com a ilha, preto ou branco, com contorno na cor oposta.',
    'cursores.c1': 'Cada ponteiro se transforma no próximo',
    'cursores.c2': 'Ocupado e trabalhando animados a 60 fps',
    'cursores.c3': 'Nítidos em todos os tamanhos de ponteiro do Windows',
    'cursores.c4': 'Os ponteiros de antes voltam ao desinstalar',
    'install.title': 'Um instalador, do seu jeito.',
    'install.lead': 'Escolha os apps, como cada um abre, e em poucos segundos está pronto. Instala só para você, sem pedir administrador.',
    'step1.title': 'Escolha o que instalar',
    'step1.text': 'Os quatro apps vêm ligados; clique num cartão para deixar um de fora.',
    'step2.title': 'Do seu jeito',
    'step2.text': 'Abrir com o Windows, ilha flutuando ou colada no topo, relógio em 24 ou 12 horas, a cidade do clima, ponteiros preto ou branco.',
    'step3.title': 'Instalar',
    'step3.text': 'Se faltar alguma coisa (.NET 10, Python, WebView2), o setup busca pelo winget. Depois cada app se atualiza sozinho pelas releases dele.',
    'note.title': 'Se o Windows reclamar',
    'note.text': 'O setup não é assinado, então o SmartScreen pode mostrar "O Windows protegeu o computador": clique em Mais informações e depois em Executar assim mesmo. Com o Controle Inteligente de Aplicativos ligado, o Windows pode recusar app sem assinatura de vez.',
    'note.sha': 'Confira o SHA-256 na página da release',
    'faq.title': 'Dúvidas',
    'faq.q1': 'É de graça?',
    'faq.q2': 'Deixa meus jogos mais lentos?',
    'faq.a2': 'O fundo pausa quando um jogo toma a tela, a ilha se esconde nas partidas competitivas e em vídeo de tela cheia, e o relógio para as barras quando alguma coisa cobre ele.',
    'faq.q3': 'Que Windows precisa?',
    'faq.a3': 'Windows 11, 64 bits. Pode funcionar no Windows 10, mas não foi testado.',
    'faq.q4': 'Em que idioma vem?',
    'faq.a4': 'Português e inglês, seguindo o seu Windows. Dá para trocar o idioma da ilha e do relógio no setup.',
    'faq.q5': 'Como eu tiro?',
    'faq.a5': 'Configurações, Aplicativos, Desktop Glow, Desinstalar. Você escolhe o que tirar; os ponteiros de antes voltam e cada app guarda as configurações caso você instale de novo.',
    'faq.q6': 'Dá para instalar um app só?',
    'faq.a6': 'Dá. Desligue os outros na primeira tela. Rodar o setup de novo depois acrescenta ou atualiza o resto.',
    'foot.made': 'Feito pelo Felipe, de código aberto. Licença MIT.',
    'foot.sponsor': 'Apoiar no GitHub',
    'faq.a1': 'É. Os quatro apps e o instalador têm código aberto, com licença MIT. Se quiser ajudar, o botão de apoiar no GitHub fica no rodapé.',
    'sound': 'Ligar ou desligar o som',
    'title': 'Desktop Glow: quatro apps grátis que deixam o Windows brilhando',
  };
  const EN_LABELS = {sound: 'Sound on or off', title: document.title};

  const release = {v: '1.3.0', mb: '107'};
  const nodes = [...document.querySelectorAll('[data-t]')];
  const original = new Map(nodes.map((n) => [n, n.dataset.html !== undefined ? n.innerHTML : n.textContent]));
  let lang = 'en';

  const fill = (text) => text.replace('{v}', release.v).replace('{mb}', release.mb);

  function setLang(next, remember) {
    lang = next;
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
    for (const n of nodes) {
      const key = n.dataset.t;
      let text = next === 'pt' && PT[key] ? PT[key] : original.get(n);
      if (key === 'hero.meta') text = next === 'pt' ? PT[key] : 'Version {v} · {mb} MB · Windows 11, 64-bit';
      if (n.dataset.html !== undefined) n.innerHTML = text;
      else n.textContent = fill(text);
    }
    for (const b of document.querySelectorAll('[data-t-label]')) {
      const label = next === 'pt' ? PT[b.dataset.tLabel] : EN_LABELS[b.dataset.tLabel];
      b.setAttribute('aria-label', label);
      b.title = label;
    }
    document.title = next === 'pt' ? PT.title : EN_LABELS.title;
    const button = document.getElementById('lang');
    button.textContent = next === 'pt' ? 'EN' : 'PT';
    button.setAttribute('aria-label', next === 'pt' ? 'English' : 'Português');
    for (const v of videos) setSource(v);
    if (remember) {
      try { localStorage.setItem('lang', next); } catch (e) { /* private window: the choice just is not kept */ }
    }
  }

  // ---- videos: the source in the page's language, playing only while visible
  const videos = [...document.querySelectorAll('.js-video')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setSource(v) {
    const src = v.dataset[lang];
    const poster = v.dataset[lang === 'pt' ? 'posterPt' : 'posterEn'];
    if (poster) v.poster = poster;
    if (v.getAttribute('src') === src) return;
    const playing = !v.paused;
    v.setAttribute('src', src);
    if (playing) v.play().catch(() => {});
  }

  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting && !reduce) v.play().catch(() => {});
      else if (!e.isIntersecting) v.pause();
    }
  }, {threshold: 0.15});
  for (const v of videos) seen.observe(v);

  for (const b of document.querySelectorAll('.sound')) {
    const v = b.parentElement.querySelector('video');
    b.addEventListener('click', () => {
      const on = v.muted;
      // one video with sound at a time
      for (const other of videos) {
        other.muted = true;
        other.parentElement.querySelector('.sound').setAttribute('aria-pressed', 'false');
      }
      v.muted = !on;
      b.setAttribute('aria-pressed', String(on));
      if (on) v.play().catch(() => {});
    });
  }

  // ---- the sections rise into view once
  const rise = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('seen'); rise.unobserve(e.target); }
  }, {threshold: 0.15});
  for (const s of document.querySelectorAll('.band')) rise.observe(s);

  // ---- the island opens (shows the download) once the hero's buttons are gone
  const island = document.getElementById('island');
  const get = island.querySelector('.island-get');
  const heroActions = document.querySelector('.hero .actions');
  new IntersectionObserver(([e]) => {
    const open = !e.isIntersecting && e.boundingClientRect.top < 0;
    island.classList.toggle('open', open);
    get.tabIndex = open ? 0 : -1;
  }).observe(heroActions);

  // ---- the latest release's version and size (the static text stays if GitHub does not answer)
  fetch('https://api.github.com/repos/FelipeWASD83/desktop-glow/releases/latest', {headers: {Accept: 'application/vnd.github+json'}})
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      const asset = (data.assets || []).find((a) => a.name === 'DesktopGlow-Setup.exe');
      if (data.tag_name) release.v = data.tag_name.replace(/^v/, '');
      if (asset) release.mb = String(Math.round(asset.size / 1048576));
      setLang(lang, false);
    })
    .catch(() => {});

  document.getElementById('lang').addEventListener('click', () => setLang(lang === 'pt' ? 'en' : 'pt', true));

  let start = 'en';
  try { start = localStorage.getItem('lang') || ''; } catch (e) { start = ''; }
  // the browser's own language, which on Windows follows the system's unless the person changed it
  if (start !== 'pt' && start !== 'en') start = /^pt\b/i.test(navigator.language || '') ? 'pt' : 'en';
  setLang(start, false);
})();
