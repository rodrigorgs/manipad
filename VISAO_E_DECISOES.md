# ManiPad — visão, referências e decisões

Este documento orienta quem contribui com o ManiPad. Ele reúne a intenção do projeto, as referências que inspiram o produto, os principais requisitos e as razões por trás das decisões.

É um documento vivo: deve evoluir conforme aprendemos com o seu uso. Os requisitos abaixo descrevem a direção desejada, não uma garantia de que tudo já esteja implementado. O `README.md` descreve a execução e o funcionamento atual; o `TODO.md` acompanha o trabalho a fazer.

## Ponto de partida

Uma aplicação web adequada a tablets que combine materiais manipuláveis virtuais, um quadro branco colaborativo com desenho à mão livre e uma mesa virtual com cartas, dados e outras peças, para apoiar aulas particulares de crianças pela internet.

## Visão do produto

Oferecer uma superfície compartilhada na qual tutor e criança possam desenhar, organizar objetos, experimentar ideias e jogar durante uma aula remota. O tutor deve conseguir adaptar a atividade ao que acontece na conversa, sem precisar preparar uma aplicação específica para cada exercício.

O foco é a interação entre as pessoas e os materiais. Os objetos devem ajudar a pensar e explicar: contar, agrupar, comparar, representar, testar hipóteses e construir soluções em conjunto.

## Inspirações e referências

As referências indicam qualidades que queremos combinar, não uma obrigação de reproduzir integralmente outros produtos.

| Referência | O que inspira o ManiPad | Por quê |
| --- | --- | --- |
| Polypad | Materiais manipuláveis virtuais, especialmente para matemática. | Permitir que conceitos sejam explorados por meio de objetos que a criança possa mover e organizar. |
| Excalidraw | Quadro branco colaborativo e desenho à mão livre. | Dar liberdade para explicar, rascunhar e anotar no mesmo espaço em que a atividade acontece. |
| PlayingCards.io | Mesa virtual com cartas e peças; ações como empilhar, embaralhar, comprar cartas e lançar dados. | Apoiar jogos e atividades com regras conduzidas pelas pessoas, usando operações familiares de uma mesa física. |

## Principais requisitos

### Acesso e uso em tablets

- Funcionar no navegador, sem exigir instalação para participar de uma aula.
- Permitir realizar as ações essenciais por toque, com alvos confortáveis e sem depender de passar o mouse sobre um elemento.
- Oferecer desenho e manipulação de objetos também com mouse e, quando disponível, caneta.
- Tornar claras as diferenças entre desenhar, selecionar, mover objetos e navegar pelo quadro, reduzindo ações acidentais.

### Colaboração durante a aula

- Permitir que tutor e criança compartilhem o mesmo quadro em tempo real.
- Facilitar a entrada em uma sessão por um link compartilhável.
- Manter um estado consistente entre os participantes, inclusive quando duas pessoas interagem com o mesmo material.
- Comunicar problemas de conexão e eventuais restrições de interação de forma compreensível.

### Quadro e materiais

- Combinar desenho à mão livre e objetos manipuláveis no mesmo espaço de trabalho.
- Permitir adicionar, mover, selecionar e remover materiais com poucos passos.
- Oferecer materiais úteis para atividades de matemática, contagem e representação de ideias.
- Apoiar cartas, dados e peças de jogos, incluindo empilhamento, embaralhamento, compra de cartas e lançamento de dados.
- Permitir compor atividades livremente, sem obrigar cada uso a seguir um jogo ou exercício predefinido.

### Clareza e recuperação

- Usar controles e linguagem compreensíveis no contexto de uma aula com crianças.
- Dar retorno visual às ações para que os participantes entendam o que mudou.
- Facilitar a correção de enganos; definir os comportamentos de desfazer e refazer em colaboração antes de ampliá-los.
- Explicitar o que acontece com a sala e seu conteúdo ao encerrar ou interromper uma sessão.

## Decisões e suas razões

Esta seção separa a motivação original das escolhas observadas na implementação inicial. Uma escolha existente pode ser revista; registrá-la aqui não a torna permanente.

### D-001 — Reunir quadro, manipuláveis e mesa de jogos

**Decisão:** manter desenho e materiais interativos no mesmo ambiente compartilhado.

**Razão:** uma aula pode alternar entre explicação, exploração e jogo. A combinação permite que esses momentos aproveitem o mesmo contexto visual.

**Consequência:** novas ferramentas precisam conviver bem com os gestos e modos de interação já existentes, sobretudo no tablet.

### D-002 — Priorizar atividades conduzidas pelas pessoas

**Decisão proposta:** começar por operações gerais sobre materiais, sem exigir que o sistema conheça todas as regras de cada atividade.

**Razão:** o tutor precisa adaptar explicações e regras às necessidades da criança durante a aula.

**Consequência:** automações de exercícios e jogos devem ser avaliadas pelo quanto ajudam esse uso flexível e pelo custo de complexidade que acrescentam.

### D-003 — Usar salas temporárias compartilhadas por link

**Decisão atual:** guardar as salas em memória e expirá-las 30 minutos após a saída do último participante.

**Razão:** simplificar o acesso e a operação de sessões de aula temporárias.

**Consequência:** a sala não é um arquivo permanente da aula. Persistência, exportação e retomada de atividades exigem uma decisão própria.

### D-004 — Centralizar no servidor as operações compartilhadas críticas

**Decisão atual:** o servidor é a autoridade para permissões, revisões, embaralhamento, compra de cartas e lançamento de dados; as mensagens são validadas antes de alterar o estado.

**Razão:** manter um resultado comum e consistente entre participantes.

**Consequência:** funcionalidades colaborativas precisam considerar validação, concorrência e sincronização, além da interação local.

### D-005 — Mãos privadas como regiões do quadro

**Decisão atual:** cada participante pode ter uma mão: um retângulo no quadro, com a cor e o nome do dono. Cartas e montes colocados nela ficam virados para baixo; só o dono vê as frentes, e os demais veem os versos e a contagem. Isso substitui a ideia anterior do `TODO.md` (gaveta inferior com um baú no quadro).

**Razão:** emular a mão de cartas de uma mesa física sem tirar as cartas do espaço compartilhado: todos continuam vendo onde estão e quantas são, e as cartas entram e saem da mão arrastando, como as demais peças.

**Regras:**
- Uma mão por pessoa; mãos não podem se sobrepor. Qualquer pessoa cria a própria mão; o tutor pode criar para qualquer participante.
- Mover, redimensionar e apagar a mão, e tirar, virar ou apagar cartas dela: só o dono ou o tutor. Qualquer pessoa pode colocar uma carta na mão de outra (dar ou distribuir).
- A carta pertence à mão quando é colocada (arrastada ou comprada) dentro dela — não basta estar sob o retângulo. Assim, criar ou esticar uma mão sobre cartas viradas não revela essas cartas.
- Toda carta numa mão é guardada virada para baixo. Ao sair da mão, ao apagar a mão ou ao desfazer uma ação, nada é revelado; para jogar, o dono arrasta a carta para fora e a vira.
- Cartas não se empilham dentro de uma mão. Mover a mão leva as cartas junto.
- Se o dono sai, a mão continua oculta e aparece como ausente; ele volta a vê-la ao entrar de novo pelo mesmo navegador. O tutor pode apagá-la ou entregá-la, vazia, a outra pessoa. O tutor também não vê as cartas das mãos.

**Consequência:** o quadro deixou de ser idêntico para todos os participantes (ver D-006).

### D-006 — Estado filtrado por participante

**Decisão atual:** o servidor envia a cada participante o seu próprio snapshot (`server/visibility.ts`). Informação oculta é removida, não apenas marcada: frente de cartas viradas para baixo (para todos), frente das cartas da mão de outra pessoa, ordem dos montes (só a carta de cima de um monte virado para cima é enviada) e `initialCards`. A atualização genérica de objetos só altera posição e tamanho de cartas, montes e mãos; virar, comprar e embaralhar passam pelos comandos próprios.

**Razão:** o que chega ao navegador pode ser lido no devtools; esconder só na tela não protege a mão nem a ordem do baralho (D-004).

**Consequência:** cartas viradas para baixo e montes não podem ser duplicados nem copiados pelo cliente (ele não conhece as frentes). Cada mudança gera um snapshot por participante (no máximo 8 por sala).

### D-007 — Identidade do participante ligada a um segredo

**Decisão atual:** além do `participantId` (público, aparece na lista de presença), o navegador guarda um segredo aleatório. A primeira entrada com um id o reivindica na sala; entradas seguintes com o mesmo id precisam do mesmo segredo.

**Razão:** sem isso, bastaria copiar o id de outra pessoa para receber o snapshot dela e ver a sua mão.

**Consequência:** a mesma pessoa em outro navegador entra como outro participante. O segredo vive só na memória da sala, que é temporária (D-003).

### D-008 — Baralhos importados do Naipe como catálogo da sala

**Decisão atual:** o arquivo exportado pelo Naipe é lido no navegador (`src/shared/naipe.ts`) e enviado ao servidor num comando `importDeck`. O servidor registra as faces num catálogo da sala (`cardSets`, até 10 conjuntos de até 200 cartas) e cria um monte virado para baixo com a primeira carta no topo. Montes e cartas continuam guardando só códigos: `s1:0` aponta para a face 0 do conjunto `s1`. Uma carta oculta chega aos outros como `s1:` — com o conjunto (para desenhar o tamanho e o verso), sem o índice.

**Razão:** manter as regras de privacidade de D-006 sem tratar cartas importadas como caso à parte: o catálogo é público (como saber o que há num baralho comum) e só cresce, então colocar uma carta oculta num monte, desfazer ou limpar o quadro nunca muda o que é enviado. A importação é um `create` comum, que pode ser desfeito.

**Consequência:** o export do Naipe não traz layout nem os arquivos das imagens, então a carta é montada de forma genérica (título, área da arte, textos, valores curtos com o nome do campo) e imagens e ícones aparecem como marcadores. O catálogo vai inteiro em cada snapshot; se os conjuntos crescerem (por exemplo, com imagens), convém enviá-lo à parte.

### D-009 — Baralhos feitos de imagens, com as imagens servidas à parte

**Decisão atual:** além do Naipe, o participante pode escolher arquivos de imagem e criar um baralho com uma carta por imagem (`src/imageDeck.ts`). O navegador ordena os arquivos pelo nome, reduz cada imagem ao tamanho da carta (formato da primeira imagem, as demais ajustadas sem corte) e as envia como JPEG no mesmo comando `importDeck` de D-008, numa face com o campo `image`. O servidor guarda os bytes e troca cada imagem por uma URL própria (`/api/rooms/<sala>/card-images/<token aleatório>`), que o navegador guarda em cache.

**Razão:** reaproveitar o catálogo de D-008 (privacidade, desfazer, monte e mão funcionam igual) sem colocar imagens no snapshot, que é reenviado a cada mudança. As faces continuam públicas, como as do Naipe.

**Consequência:** até 60 imagens por baralho e 30 MB de imagens por sala; só PNG, JPEG e WebP em data URL são aceitos (nada de SVG ou links externos). As imagens vivem na memória da sala, como o resto (D-003).

### D-010 — Dados customizados, sorteados só no servidor

**Decisão atual:** o dado da mesa ganhou de 2 a 20 faces (`sides`, padrão 6) e, opcionalmente, um conteúdo por face (`faces`): um texto curto ou uma imagem. O valor é sempre sorteado no servidor, ao rolar (`rollDie`, ou `rollDice` para vários dados num passo só) e também ao criar ou duplicar um dado. O `update` genérico não altera `value`, `rollNonce`, `sides` nem `faces`; as faces só mudam pelo comando `editDie`. As imagens das faces seguem o caminho das cartas de imagem (D-009): o navegador as reduz, o servidor guarda os bytes e o snapshot leva só a URL. Um dado copiado ou editado só pode apontar para imagens que a sala já tem.

**Razão:** todos precisam ver o mesmo resultado, e ninguém pode escolher o valor pelo navegador. Antes, um `update` com `value` mudava a face de qualquer dado. Reaproveitar o depósito de imagens evita reenviar as imagens a cada mudança da mesa.

**Consequência:** desfazer uma rolagem volta ao valor anterior. Isso não permite escolher o resultado, só retornar a um valor que já saiu, e uma nova rolagem é sempre sorteada de novo. As imagens dos dados contam no limite de 30 MB por sala. O gesto de rolar (toque duplo, o padrão, ou toque simples) é uma preferência de cada pessoa, guardada no navegador.

### D-011 — Salvar e abrir a mesa num arquivo JSON, só pelo tutor

**Decisão atual:** o tutor exporta a mesa inteira num arquivo `.json` (`{ format: "manipad-board", version, exportedAt, objects, cardSets, assets }`), com os objetos e conjuntos de cartas exatamente como o servidor os guarda. As imagens que a sala serve (cartas de imagem, faces de dados) entram no próprio arquivo, em base64, em `assets`, e são referidas como `asset:<token>`. Ao importar, o servidor confere tudo antes de mexer na sala: formato, versão, cada objeto e conjunto com os mesmos schemas dos comandos, os códigos de carta contra os conjuntos e as referências de imagem contra as imagens do arquivo. Só então substitui objetos, conjuntos e imagens (com novos tokens), zera o desfazer e manda a nova mesa a todos. As duas operações usam HTTP (`GET`/`PUT /api/rooms/<sala>/board-file`, com o token do tutor), não o socket.

**Razão:** o arquivo precisa reabrir a mesa como ela estava, inclusive as cartas ocultas e a ordem dos montes. Por isso só o tutor pode exportá-lo, e só ele pode importar, já que importar apaga a mesa de todos, como **Clear**. O JSON com base64 dispensa uma biblioteca de zip no cliente e no servidor e continua legível. Um zip quase não diminuiria o arquivo, porque as imagens já são JPEG ou PNG comprimidos; ele só evitaria os 33% do base64. O socket tem limite de 8 MB por mensagem, e uma sala pode ter 30 MB de imagens.

**Consequência:** um arquivo pode ter até 45 MB (os 30 MB de imagens em base64 mais a mesa). Arquivos de versões futuras são recusados com uma mensagem; quando o formato mudar, `version` sobe e o servidor converte os arquivos antigos passo a passo (`BOARD_FILE_MIGRATIONS` em `server/board-file.ts`). Importar não pode ser desfeito, porque o histórico se refere a imagens e conjuntos que deixam de existir. As mãos mantêm o dono pelo id do participante: quem volta pelo mesmo navegador reencontra a sua mão.

### D-012 — Animações só no cliente, cortadas quando travariam

**Decisão atual:** as animações saem da comparação entre o snapshot anterior e o novo (`src/animationPlan.ts`), depois que a mesa já foi desenhada no estado novo. Os nós do Konva que mudaram são animados até onde o React já os colocou (`src/boardAnimations.ts`):
- carta comprada ou distribuída: sai do monte;
- carta ou monte virado: abre a partir da borda;
- monte embaralhado: chacoalha;
- dado rolado: balança e passa por algumas faces;
- objeto movido por outra pessoa, ou por desfazer: desliza até o lugar novo.

Durações de 150 a 300 ms. Para que os outros jogadores percebam um embaralhamento (eles nunca veem a ordem), o monte ganhou um contador, `shuffleNonce`, como o `rollNonce` do dado.

Nada anima:
- no primeiro snapshot;
- com `prefers-reduced-motion`;
- quando mais de 30 coisas mudam de uma vez;
- quando o redesenho da mesa custa mais que 10 ms naquele aparelho. A medida vem dos próprios redesenhos do Konva, não do número de objetos.

**Razão:** o estado sincronizado continua sendo a única verdade. A animação nunca atrasa um toque nem muda o que o servidor guarda, e termina exatamente no estado recebido. Cada quadro de animação redesenha a camada inteira: numa mesa cheia, num aparelho lento, a animação rodaria a poucos quadros por segundo (no perfil tablet, com 150 cartas, um embaralhamento teve 7 quadros em cerca de 1 s). Pelo critério "se travar, corta", nesses casos a mudança só aparece.

**Consequência:** os testes e2e rodam com `reducedMotion: 'reduce'` (em `playwright.config.ts`), então nada do que eles clicam está em movimento. Os testes de animação ligam o movimento de volta. O teste de desempenho (`tests/e2e/animation-performance.spec.ts`) mede os quadros no perfil tablet, com e sem animação, e verifica que, se uma animação roda na mesa cheia, a mediana dos quadros fica em até 34 ms. A medição mostrou que o custo maior hoje não é a animação: com 150 cartas, cada mudança recebida redesenha a mesa inteira (p95 de 120 a 150 ms por quadro no perfil tablet), e as sombras com desfoque dos objetos custam centenas de ms por redesenho no Chromium headless, que desenha o canvas sem GPU.

### D-013 — Distribuir cartas para todas as mãos, em rodadas

**Decisão atual:** o comando `dealCards` distribui N cartas (de 1 a 20) de um monte para **todas as mãos da mesa**, em rodadas: uma carta para cada mão, na ordem em que as mãos foram criadas, depois a próxima rodada, sempre do topo do monte. As cartas entram viradas para baixo e em leque na mão, depois das que já estavam lá. Se o monte acaba no meio, a distribuição para ali. Tudo é um passo só do desfazer. Pode distribuir quem pode comprar daquele monte (as mesmas regras de `drawCard`), e as mãos de quem está fora da sala também recebem.

**Razão:** é como se distribui numa mesa de verdade, e reaproveita as regras de mão de D-005 (cada dono vê as suas cartas e os outros, só os versos). Incluir as mãos de quem está fora evita que alguém que caiu da conexão fique sem cartas; o tutor pode apagar uma mão abandonada antes de distribuir. As cartas distribuídas são cartas compradas do monte (`creator: deck:<id>`), então voltam ao monte com **Reset** e voam do monte com a animação de compra (D-012), uma após a outra.

**Consequência:** para distribuir é preciso haver mãos na mesa; sem elas, o painel explica como criar uma. Junto com isso, **My hand** deixou de falhar quando várias pessoas tocam nele com a mesma visão: a nova mão sobe uma faixa até achar lugar livre, já que mãos não podem se sobrepor.
