# PRD: Storage Separado por Site (Multi-Ambiente)

## Introdução

Atualmente, a extensão Neuron utiliza um único namespace no `chrome.storage.local` para todos os dados, independentemente de qual ambiente Fala.BR o usuário está acessando (produção, treinamento ou homologação). Isso causa mistura de demandas entre ambientes, links com domínio errado (hardcoded para produção) e dados inconsistentes quando o usuário alterna entre sites.

Esta feature implementa **isolamento de storage por site**, garantindo que demandas, concluídas e metadata sejam armazenados separadamente para cada ambiente, enquanto configurações e preferências permanecem globais (compartilhadas entre os 3 sites).

## Ambientes Suportados

| Alias | URL | Uso |
|-------|-----|-----|
| `producao` | `https://falabr.cgu.gov.br` | Produção |
| `treinamento` | `https://treinafalabr.cgu.gov.br` | Treinamento |
| `homologacao` | `https://falabr-h.cgu.gov.br` | Homologação |

## Objetivos

- Isolar dados de demandas, concluídas e metadata por ambiente (site)
- Manter config e preferências como dados globais compartilhados
- Detectar automaticamente o site ativo via URL da aba
- Corrigir o `href` das demandas extraídas para usar o domínio real (não hardcoded)
- Permitir alternar visualização entre sites no Dashboard e Popup
- Descarte limpo dos dados antigos (não migrar — começar limpo)

## User Stories

### US-001: Mapeamento de site ativo via URL
**Descrição:** Como desenvolvedor, preciso de um utilitário que identifique o site ativo a partir da URL, para que todo o sistema saiba de qual ambiente os dados pertencem.

**Acceptance Criteria:**
- [ ] Criar função `NeuronSite.getFromUrl(url)` em `shared/js/neuron-site.js` que retorna o alias do site (`producao`, `treinamento`, `homologacao`) a partir de uma URL
- [ ] Criar função `NeuronSite.getDomain(alias)` que retorna o domínio completo a partir do alias
- [ ] Criar constante `NeuronSite.SITES` com o mapa de aliases para domínios
- [ ] Retornar `null` se a URL não corresponder a nenhum site conhecido
- [ ] Registrar o arquivo no `manifest.json` em todos os blocos de content_scripts que usam `neuron-db.js`
- [ ] Typecheck/lint passa

### US-002: Chaves de storage com prefixo por site
**Descrição:** Como desenvolvedor, preciso que as chaves de storage de demandas, concluídas e metadata sejam prefixadas com o alias do site, para que cada ambiente tenha seu próprio espaço de armazenamento.

**Acceptance Criteria:**
- [ ] As chaves `neuron_demandas`, `neuron_concluidas` e `neuron_metadata` passam a ser geradas dinamicamente: `neuron_{alias}_demandas`, `neuron_{alias}_concluidas`, `neuron_{alias}_metadata`
- [ ] As chaves `neuron_config` e `neuron_preferences` permanecem sem prefixo (globais)
- [ ] `NeuronDB.init()` recebe o parâmetro opcional `siteAlias` para definir o contexto do site
- [ ] Quando `siteAlias` não é informado (ex: popup, background), o NeuronDB opera com um site padrão ou aguarda que o site seja definido
- [ ] O cache em memória reflete as chaves do site ativo
- [ ] Typecheck/lint passa

### US-003: Inicialização do NeuronDB com contexto de site nos content scripts
**Descrição:** Como content script, preciso inicializar o NeuronDB com o site correto detectado pela URL da página, para que os dados sejam lidos e escritos no namespace correto.

**Acceptance Criteria:**
- [ ] Cada content script que usa `NeuronDB.init()` passa a chamar `NeuronDB.init(NeuronSite.getFromUrl(window.location.href))`
- [ ] O site é detectado automaticamente — nenhuma intervenção do usuário é necessária
- [ ] Dados salvos em um site não aparecem ao acessar outro site
- [ ] Typecheck/lint passa

### US-004: Correção do href hardcoded na extração de demandas
**Descrição:** Como usuário, quero que os links das demandas extraídas apontem para o domínio correto do site onde estou navegando, para que não seja redirecionado para produção quando estou em treinamento.

**Acceptance Criteria:**
- [ ] Em `tratar-novo-extract.js`, o `href` é montado dinamicamente usando `window.location.origin` em vez de `https://falabr.cgu.gov.br` hardcoded
- [ ] Demandas extraídas no treinamento têm `href` com `https://treinafalabr.cgu.gov.br`
- [ ] Demandas extraídas na homologação têm `href` com `https://falabr-h.cgu.gov.br`
- [ ] Typecheck/lint passa

### US-005: Descarte de dados antigos na atualização da extensão
**Descrição:** Como desenvolvedor, preciso limpar os dados do formato antigo (sem prefixo de site) quando a extensão é atualizada, para evitar dados órfãos ou misturados.

**Acceptance Criteria:**
- [ ] No `background.js`, no evento `onInstalled` com reason `update`, verificar se existem chaves no formato antigo (`neuron_demandas`, `neuron_concluidas`, `neuron_metadata`)
- [ ] Se existirem, removê-las do `chrome.storage.local`
- [ ] As chaves globais (`neuron_config`, `neuron_preferences`) NÃO são removidas
- [ ] Lógica de migração executa apenas uma vez (usar flag `neuron_migrated_v2` no storage)
- [ ] Typecheck/lint passa

### US-006: NeuronDB com suporte a troca de site (para Popup e Dashboard)
**Descrição:** Como popup/dashboard, preciso poder consultar dados de qualquer site (não apenas o ativo), para mostrar dados do site desejado pelo usuário.

**Acceptance Criteria:**
- [ ] Criar método `NeuronDB.switchSite(siteAlias)` que recarrega o cache com as chaves do novo site
- [ ] Criar método `NeuronDB.getCurrentSite()` que retorna o alias do site ativo no NeuronDB
- [ ] Após `switchSite`, todas as operações de leitura/escrita usam as chaves do novo site
- [ ] Config e preferências continuam sendo globais independente do site
- [ ] Typecheck/lint passa

### US-007: Seletor de site no Popup
**Descrição:** Como usuário, quero ver no popup de qual site os dados estão sendo exibidos e poder alternar para outro site, para comparar demandas entre ambientes.

**Acceptance Criteria:**
- [ ] Adicionar seletor (dropdown ou segmented control) no popup com as opções: Produção, Treinamento, Homologação
- [ ] O site da aba ativa é selecionado por padrão (detectado via `chrome.tabs.query`)
- [ ] Ao trocar o site, os dados do popup (contadores, notificações) atualizam para o site selecionado
- [ ] Indicador visual claro de qual site está selecionado (cores diferentes por ambiente: ex. azul=produção, laranja=treinamento, verde=homologação)
- [ ] Typecheck/lint passa
- [ ] **Verificar no browser usando dev-browser skill**

### US-008: Seletor de site no Dashboard
**Descrição:** Como usuário, quero alternar entre sites no Dashboard para visualizar estatísticas de cada ambiente separadamente.

**Acceptance Criteria:**
- [ ] Adicionar seletor de site no header do Dashboard (mesmo padrão visual do popup)
- [ ] O site da aba ativa é selecionado por padrão
- [ ] Ao trocar o site, todos os gráficos, tabela de demandas e contadores recarregam com dados do site selecionado
- [ ] Indicador visual do site ativo (mesmas cores do popup)
- [ ] Typecheck/lint passa
- [ ] **Verificar no browser usando dev-browser skill**

### US-009: NeuronSync com suporte a chaves por site
**Descrição:** Como desenvolvedor, preciso que o NeuronSync mantenha a coerência de cache para chaves prefixadas por site, para que mudanças de storage em um contexto reflitam em todos os outros.

**Acceptance Criteria:**
- [ ] `NeuronSync` detecta mudanças em chaves com formato `neuron_{alias}_*` e atualiza o cache do NeuronDB corretamente
- [ ] Mudanças em chaves de um site diferente do ativo no NeuronDB são ignoradas no cache (mas podem disparar callbacks)
- [ ] As listeners de config e preferências continuam funcionando normalmente (chaves globais)
- [ ] Typecheck/lint passa

## Requisitos Funcionais

- **FR-1:** O sistema deve identificar o site ativo a partir do hostname da URL: `falabr.cgu.gov.br` → `producao`, `treinafalabr.cgu.gov.br` → `treinamento`, `falabr-h.cgu.gov.br` → `homologacao`
- **FR-2:** As chaves de storage `neuron_demandas`, `neuron_concluidas` e `neuron_metadata` devem ser prefixadas com o alias do site (ex: `neuron_producao_demandas`)
- **FR-3:** As chaves `neuron_config` e `neuron_preferences` devem permanecer globais (sem prefixo)
- **FR-4:** Content scripts devem detectar o site automaticamente via `window.location` e inicializar o NeuronDB com o contexto correto
- **FR-5:** O Popup e o Dashboard devem detectar o site da aba ativa via `chrome.tabs.query` e permitir alternar entre sites
- **FR-6:** O `href` das demandas extraídas deve usar `window.location.origin` em vez de domínio hardcoded
- **FR-7:** Na atualização da extensão, dados no formato antigo (sem prefixo de site) devem ser removidos
- **FR-8:** O `NeuronDB.switchSite()` deve recarregar o cache do storage para o site especificado

## Não-Objetivos (Fora de Escopo)

- Migrar dados existentes do formato antigo para um site específico (decisão: começar limpo)
- Permitir visualização consolidada de todos os sites simultaneamente no Dashboard
- Sincronizar dados entre ambientes (cada site é 100% independente)
- Adicionar novos ambientes/URLs dinamicamente (os 3 sites são fixos)
- Modificar a lógica de negócio de notificações, prazos ou respostas — apenas o layer de storage muda

## Considerações de Design

- **Seletor de site:** Usar segmented control (botões lado a lado) ao invés de dropdown, para visibilidade imediata dos 3 ambientes
- **Cores por ambiente:**
  - Produção: azul (cor padrão atual)
  - Treinamento: laranja
  - Homologação: verde
- **Label curto:** Usar "PROD", "TREINA", "HOMOLOG" nos seletores para economizar espaço
- Reutilizar componentes visuais existentes do popup e dashboard

## Considerações Técnicas

- **Estrutura de chaves no storage:**
  ```
  neuron_producao_demandas    → {}
  neuron_producao_concluidas  → []
  neuron_producao_metadata    → {}
  neuron_treinamento_demandas → {}
  neuron_treinamento_concluidas → []
  neuron_treinamento_metadata → {}
  neuron_homologacao_demandas → {}
  neuron_homologacao_concluidas → []
  neuron_homologacao_metadata → {}
  neuron_config               → {}  (global)
  neuron_preferences          → {}  (global)
  ```
- **`NeuronDB.init(siteAlias)`:** O `init` passa a aceitar um alias e construir as chaves dinâmicas. O cache em memória armazena apenas dados do site ativo.
- **Popup/Dashboard:** Usam `chrome.tabs.query({active: true, currentWindow: true})` para detectar a URL da aba ativa e derivar o site. Se a aba não for um site Fala.BR, default para `producao`.
- **`neuron-site.js`:** Deve ser carregado antes de `neuron-db.js` em todos os content_scripts do manifest.
- **17 arquivos** referenciam `NeuronDB` — a maioria não precisará de mudanças se a inicialização for feita centralmente. Os impactados são: `tratar-novo-extract.js` (href), `tratar-novo-insert.js` (init), `background.js` (migração), `popup.js` (seletor), `dashboard.js` (seletor), `neuron-sync.js` (chaves dinâmicas).
- **Quota de storage:** `chrome.storage.local` tem 10MB por padrão. Com 3 sites separados, monitorar uso via `chrome.storage.local.getBytesInUse()`.

## Métricas de Sucesso

- Dados de demandas de um site NÃO aparecem ao navegar em outro site
- Links `href` das demandas apontam para o domínio correto
- Popup e Dashboard mostram dados do site ativo por padrão
- Alternância de site no Popup/Dashboard carrega dados corretos em menos de 500ms
- Dados antigos (formato sem prefixo) são removidos na atualização sem erro

## Perguntas em Aberto

- Devemos mostrar um badge/indicador no ícone da extensão com o ambiente ativo (ex: "T" para treinamento)?
- Se o usuário estiver em uma aba que não é Fala.BR, qual site deve ser exibido por padrão no popup? (assumido: produção)
- Devemos limitar o `chrome.storage.local` com quota warning se uso ultrapassar 80%?
