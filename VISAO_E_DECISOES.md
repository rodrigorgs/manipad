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
