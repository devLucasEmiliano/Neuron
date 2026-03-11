# PRD: Correção de Sobreposição do Dropdown de Tags — Selectize Global

## Introduction

O dropdown do Selectize (usado para seleção de tags e outros campos) apresenta um problema crítico de sobreposição visual em diversas páginas do sistema Fala.BR. Quando o dropdown é aberto, ele ultrapassa os limites do container pai (ex: cabeçalho do card com ~59px de altura) e sobrepõe conteúdo adjacente — textos de manifestação, datas, prazos e até cards vizinhos — tornando a interface confusa e dificultando o uso.

A causa raiz é o uso de `position: absolute` com `z-index: 9999` no dropdown (`.selectize-dropdown`), combinado com containers ancestrais que não possuem gestão adequada de overflow ou stacking context. A solução deve ser global (aplicável a todos os dropdowns Selectize do sistema) e adaptativa (comportamento inteligente baseado no espaço disponível na viewport).

## Goals

- Eliminar a sobreposição visual confusa do dropdown de tags sobre conteúdo adjacente em todas as páginas do sistema
- Implementar uma solução CSS/JS global que funcione para todos os dropdowns Selectize, não apenas na página "Tratar (Novo)"
- Garantir que o dropdown tenha scroll interno quando a lista de opções exceder o espaço disponível
- Criar comportamento adaptativo: o dropdown abre para baixo ou para cima conforme o espaço na viewport
- Manter a funcionalidade completa de seleção de tags sem regressões visuais

## User Stories

### US-001: Limitar altura do dropdown com scroll interno
**Description:** Como usuário, quero que o dropdown de tags tenha uma altura máxima controlada com scroll interno para que ele não invada o conteúdo de outros elementos da página.

**Acceptance Criteria:**
- [ ] O dropdown `.selectize-dropdown` possui `max-height` definido (valor que exiba ~6-8 itens visíveis)
- [ ] Quando a lista de opções excede o `max-height`, aparece scroll vertical (`overflow-y: auto`)
- [ ] O scroll é estilizado de forma discreta (scrollbar fina, cores consistentes com o tema)
- [ ] A regra CSS é global, aplicando-se a todos os `.selectize-dropdown` do sistema, não apenas na página "Tratar (Novo)"
- [ ] O dropdown não ultrapassa os limites visuais razoáveis do card/container onde está inserido
- [ ] Typecheck/lint passa

### US-002: Criar stacking context adequado para o dropdown
**Description:** Como usuário, quero que quando o dropdown estiver aberto, ele fique visualmente acima de todo o conteúdo da página de forma clara, sem causar confusão com elementos sobrepostos.

**Acceptance Criteria:**
- [ ] O container do Selectize (`.selectize-control`) ou a coluna de tags (`.coluna3dalista`) cria um stacking context adequado quando o dropdown está ativo
- [ ] O `z-index` do dropdown é superior ao `z-index` dos cards em hover (atualmente `z-index: 10` no hover)
- [ ] O dropdown aparece acima de: texto da manifestação (`.col-md-4`), linha de corpo do card (row even), e cards adjacentes
- [ ] Não há conflito de z-index com outros elementos posicionados da página (modais, tooltips, menus de navegação)
- [ ] A solução funciona tanto no CSS de `tratar-novo.css` quanto no `sic-tratar-style.css` (ou em um CSS compartilhado)
- [ ] Typecheck/lint passa

### US-003: Comportamento adaptativo (dropdown/dropup)
**Description:** Como usuário, quero que o dropdown abra para cima automaticamente quando não há espaço suficiente abaixo, para que eu sempre consiga ver todas as opções sem precisar rolar a página.

**Acceptance Criteria:**
- [ ] Existe um script JS que detecta a posição do dropdown na viewport ao abrir
- [ ] Se o espaço abaixo do campo for insuficiente para exibir o dropdown (considerando o `max-height`), ele abre para cima (dropup)
- [ ] Se o espaço abaixo for suficiente, o comportamento padrão (abrir para baixo) é mantido
- [ ] A classe CSS `.selectize-dropdown--dropup` (ou equivalente) é aplicada/removida dinamicamente
- [ ] O posicionamento é recalculado em eventos de scroll e resize da janela
- [ ] O script é genérico e funciona para qualquer instância do Selectize no sistema, não apenas tags
- [ ] Typecheck/lint passa

### US-004: Estilização visual do dropdown aberto
**Description:** Como usuário, quero que o dropdown de tags tenha uma aparência visual clara e polida que indique inequivocamente que é um elemento sobreposto temporário.

**Acceptance Criteria:**
- [ ] O dropdown possui `box-shadow` que cria efeito de elevação (separação visual do conteúdo abaixo)
- [ ] O dropdown possui `border` definida e `border-radius` consistente com o tema (`--raio-borda`)
- [ ] O fundo do dropdown é opaco (`background-color` sólido, sem transparência)
- [ ] Os itens da lista possuem padding e hover state claros
- [ ] A aparência é consistente com o design system existente (variáveis CSS do `:root`)
- [ ] A estilização é aplicada globalmente para todos os dropdowns Selectize do sistema
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-005: Aplicar correções no CSS compartilhado
**Description:** Como desenvolvedor, preciso que as correções de CSS para o Selectize estejam em um local centralizado para evitar duplicação entre `tratar-novo.css`, `sic-tratar-style.css` e futuros módulos.

**Acceptance Criteria:**
- [ ] Existe um arquivo CSS compartilhado (ex: `shared/css/selectize-fix.css` ou regras adicionadas em `shared/css/theme.css`) com todas as correções globais do Selectize
- [ ] As regras duplicadas de `.selectize-dropdown` são removidas dos CSS específicos de módulo (`tratar-novo.css`)
- [ ] O CSS compartilhado é importado/injetado nos módulos que utilizam Selectize
- [ ] O mecanismo de injeção segue o padrão existente do projeto (verificar `module-factory.js` ou manifest de módulos)
- [ ] Não há regressão visual nas páginas existentes (Tratar Novo, SIC Tratar, Tramitar)
- [ ] Typecheck/lint passa

### US-006: Integrar script adaptativo no fluxo de módulos
**Description:** Como desenvolvedor, preciso que o script de comportamento adaptativo (dropup) seja integrado ao sistema de módulos existente para que funcione automaticamente em todas as páginas com Selectize.

**Acceptance Criteria:**
- [ ] O script JS de posicionamento adaptativo está em um arquivo compartilhado (ex: `shared/js/selectize-fix.js`)
- [ ] O script é inicializado automaticamente ao detectar instâncias do Selectize na página (via MutationObserver ou evento de inicialização)
- [ ] O script funciona com instâncias de Selectize criadas dinamicamente (ex: após AJAX/UpdatePanel do ASP.NET)
- [ ] O script não interfere com a funcionalidade existente do Selectize (seleção, busca, criação de tags)
- [ ] O script segue os padrões de código do projeto (verificar convenções em `shared/js/`)
- [ ] Typecheck/lint passa

## Functional Requirements

- FR-1: O dropdown `.selectize-dropdown` deve ter `max-height` com `overflow-y: auto` para limitar sua expansão vertical
- FR-2: O dropdown deve possuir `background-color` opaco, `box-shadow` de elevação, e `border-radius` consistente com o tema
- FR-3: O sistema deve detectar a posição do dropdown na viewport e decidir se abre para baixo (padrão) ou para cima (dropup)
- FR-4: O `z-index` do dropdown deve ser superior ao de qualquer elemento posicionado nos cards (hover z-index: 10) e inferior ao de modais do sistema
- FR-5: Todas as regras CSS do Selectize devem estar centralizadas em um arquivo compartilhado, não duplicadas em CSS de módulos individuais
- FR-6: O script JS de posicionamento deve funcionar com instâncias de Selectize criadas dinamicamente (compatibilidade com ASP.NET UpdatePanel)
- FR-7: O dropdown deve recalcular seu posicionamento em eventos de `scroll` e `resize`
- FR-8: A scrollbar interna do dropdown deve ser estilizada de forma discreta (webkit-scrollbar ou scrollbar-width/color)

## Non-Goals

- Não substituir o Selectize por outra biblioteca de dropdown (ex: Select2, Choices.js)
- Não alterar a lógica de negócio de seleção/criação de tags
- Não modificar o backend/API de tags
- Não alterar o layout geral dos cards (heights, columns, grid)
- Não implementar virtualização/lazy-loading para listas de tags muito longas (otimização futura)
- Não alterar o comportamento do dropdown em dispositivos móveis (escopo futuro)

## Design Considerations

- Reutilizar as variáveis CSS existentes em `:root` (`--cor-card`, `--cor-borda`, `--raio-borda`, `--cor-sombra`, `--familia-fonte`)
- O dropdown deve parecer um "popover elevado" — com sombra clara que o separe visualmente do conteúdo abaixo
- Manter consistência visual com os outros elementos do design system (badges de tipo, campos de texto, botões)
- A scrollbar deve ser fina e discreta, não a scrollbar nativa do sistema operacional

## Technical Considerations

- O Selectize é uma biblioteca externa que aplica classes como `.selectize-dropdown`, `.selectize-input`, `.selectize-control` — as correções devem usar esses seletores
- O sistema Fala.BR usa ASP.NET com UpdatePanels, o que pode recriar elementos DOM após postbacks parciais — o script deve ser resiliente a isso (MutationObserver)
- Os módulos do projeto usam `module-factory.js` para inicialização — verificar se o script compartilhado pode ser integrado via esse mecanismo
- O CSS atual em `tratar-novo.css` (linha 56-62) já tenta resolver com `overflow: visible !important` e `z-index: 9999` — essa abordagem parcial deve ser substituída pela solução completa
- O `sic-tratar-style.css` possui estrutura similar de cards e pode ter o mesmo problema com dropdowns

## Success Metrics

- O dropdown de tags não sobrepõe de forma confusa nenhum conteúdo textual adjacente em nenhuma página do sistema
- O dropdown é totalmente utilizável (scroll, seleção, busca) mesmo com muitas tags disponíveis
- O comportamento dropup funciona corretamente quando o campo está próximo ao final da viewport
- Zero regressões visuais nas páginas existentes (Tratar Novo, SIC Tratar, Tramitar)
- A solução é aplicada automaticamente a novas instâncias de Selectize sem configuração adicional por módulo

## Open Questions

- Quantas tags existem no sistema atualmente? Se forem centenas, pode ser necessário considerar busca/filtro no dropdown além do scroll
- Existem outras páginas além de "Tratar (Novo)", "SIC Tratar" e "Tramitar" que utilizam Selectize? Inventário completo seria útil
- O `module-factory.js` suporta injeção de CSS/JS compartilhado ou cada módulo precisa declarar suas dependências individualmente?
- Há algum z-index convention no projeto para modais, tooltips e outros overlays? (para garantir que o dropdown não conflite)
