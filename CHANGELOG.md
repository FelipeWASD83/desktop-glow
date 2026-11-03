# Changelog

## 1.2.1 (03/11/2026)

**Mudou**
- O relógio agora é fechado pelo comando `--quit` dele (como a ilha com `--sair` e o Fundo Vivo com `--quit`), em vez de ter o processo morto. Versões antigas do relógio, que não têm o comando, ainda são encerradas à força depois de alguns segundos.
- Traz o Relógio Mond 1.5.0 (barras brancas e suaves, minutagem clicável, troca de faixa animada) e os Cursores da Ilha 1.1.0 no formato de release que os quatro apps passaram a seguir.

## 1.2.0 (03/11/2026)

**Novo**
- Opção "Abrir primeiro, com prioridade" nos últimos detalhes, ligada por padrão: a ilha, o relógio e o Fundo Vivo que abrem com o Windows saem logo que você entra, na frente da fila dos outros programas de inicialização, e com prioridade acima do normal. Não pede administrador.
- A desinstalação tira essas tarefas junto. Reinstalar mantém a escolha que já estava.
- `--prioridade ligar` (ou `desligar`) faz o mesmo para os apps que já abrem com o Windows, onde quer que estejam instalados.

## 1.1.0 (02/11/2026)

**Novo**
- A tela de instalação toca o vídeo de cada app escolhido, um depois do outro, no idioma da tela. Continua tocando na tela de "Tudo pronto" até fechar, porque a instalação costuma levar poucos segundos.
- O vídeo começa mudo; o botãozinho de som no canto liga e desliga.
- Os vídeos de propaganda dos apps (TikTok e YouTube) moram na pasta `video/` do projeto.

## 1.0.1 (02/11/2026)

**Corrigido**
- Instalar os cursores dava "Falhou" mesmo com o ponteiro trocado. Neste Windows o pedido de recarregar os ponteiros responde que falhou até quando funciona; agora o setup confere a seta que está em uso e só acusa erro se ela não for a escolhida.

## 1.0.0 (02/11/2026)

**Novo**
- Instalador único da Ilha, do Relógio Mond, dos Cursores da Ilha e do Fundo Vivo, no visual da ilha: fundo preto, cantos arredondados e uma pílula no topo que muda de forma com mola a cada passo.
- Escolha do que instalar, em cartões que ligam e desligam.
- Opções de cada app: abrir com o Windows (ilha, relógio e Fundo Vivo), ilha flutuando ou colada no topo, relógio em 24 h ou 12 h, clima ligado ou não e a cidade do clima (busca pelo nome), esquema de cursor preto, branco ou só deixar na lista.
- Opções gerais: atalhos no Menu Iniciar e na área de trabalho, abrir os apps ao terminar, idioma da ilha e do relógio.
- Instala pelo winget o que falta no PC (.NET 10, Python para o relógio, WebView2), avisando antes.
- Reinstalar atualiza e começa das escolhas que já estavam no PC.
- Desinstalador em Configurações > Aplicativos, que escolhe o que tirar, devolve os ponteiros de antes e mantém as configurações dos apps.
- Telas em português ou inglês, seguindo o Windows.
