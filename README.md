<p align="center">
  <img src="https://github.com/devLucasEmiliano/Neuron/blob/stable/public/images/Intro-Neuron.gif" alt="Animação de Carregamento do Neuron" width="500"/>
</p>

<h1 align="center">Neuron</h1>

<p align="center">
  <strong>Um otimizador de fluxos de trabalho para a plataforma Fala.BR</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.1-blue.svg" alt="Versão 2.0.1">
  <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Status-Ativo-success.svg" alt="Status do Projeto: Ativo">
</p>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-features">Features</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-changelog">Changelog</a> •
  <a href="#️-tecnologias-e-arquitetura">Arquitetura</a> •
  <a href="#-como-contribuir">Contribuir</a>
</p>

---

## 🚀 Sobre o Projeto

O **Neuron** é uma extensão para Google Chrome criada para otimizar e agilizar tarefas repetitivas na plataforma **Fala.BR**. A extensão injeta scripts e estilos nas páginas da plataforma, adicionando automações, assistentes inteligentes e melhorias de interface que tornam o trabalho dos operadores mais rápido, intuitivo e eficiente.

### 🎯 Plataforma Alvo

| Ambiente | URL |
|----------|-----|
| **Produção** | `https://falabr.cgu.gov.br/*` |
| **Treinamento** | `https://treinafalabr.cgu.gov.br/*` |
| **Homologação** | `https://falabr-h.cgu.gov.br/*` |

---

## ✨ Features

| Feature | Descrição |
|---------|-----------|
| **Popup de Controle** | Liga/desliga a extensão, itens por página, tema claro/escuro/sistema, seletor de site |
| **Painel de Configurações** | Gerenciamento de modelos de texto, pontos focais e configurações gerais |
| **Dashboard Dedicado** | Página dedicada com cards de métricas, gráficos, tabela de demandas paginada e seletor de site |
| **Assistente de Tramitação** | Cálculo automático de datas, seleção de pontos focais, multi-destinatários |
| **Ações Rápidas** | Modelos pré-definidos para Arquivar, Encaminhar e Prorrogar |
| **Respostas Rápidas** | Templates por tipo (intermediária, conclusiva, complementação) |
| **Gestão de Prazos** | Cálculos detalhados com feriados, dias úteis e ajuste de fim de semana |
| **Notificações Inteligentes** | Painel flutuante com categorização automática e alertas visuais |
| **Layout Modernizado** | Interface card-based, temas claro/escuro, animação de loading personalizada |
| **Import/Export JSON** | Backup e restauração completa de configurações |
| **Módulos SIC** | Suporte especializado ao Sistema de Informação ao Cidadão |

---

## 🧩 Funcionalidades

### 🎨 Interface e Experiência do Usuário (UI/UX)

* **Animação de Loading Personalizada:** Substitui a tela de carregamento padrão do Fala.BR por uma animação moderna e informativa. (Arte por Bia)
* **Layout Modernizado (Triar/Tratar):** Interface renovada com design card-based, organização visual em blocos e melhor legibilidade.
* **Cópia Rápida de Protocolo:** Copie o número do protocolo (NUP) com um único clique.
* **Temas:** Suporte a tema claro, escuro e automático (segue o sistema operacional).

### 🤖 Assistentes e Automação

* **Assistente de Tramitação:**
    * Calcula e preenche automaticamente a data de tratamento com base em regras de negócio configuráveis (dias úteis, feriados, etc.).
    * Painel para selecionar **Pontos Focais** e realizar tramitação para múltiplos destinatários de forma automática.
    * Modelos de texto customizáveis para o despacho, com variáveis como `{PRAZO}` e `{SECRETARIA}` — veja o [Manual Neuron.pdf](Manual%20Neuron.pdf) (seção 4.1) para a lista completa de chaves por categoria.
    * Templates por tipo de manifestação: Comunicação, Denúncia, Elogio, Reclamação, Solicitação, Sugestão.
* **Assistente de Arquivamento:** Menu com modelos de justificativa pré-definidos (Duplicidade, Perda de Objeto, Falta de Urbanidade, Ausência de Elementos, etc.).
* **Assistente de Encaminhamento:** Templates para mensagens ao destinatário e ao solicitante, com substituição automática de variáveis como `{OUVIDORIA}`.
* **Assistente de Prorrogação:** Modelos de justificativa para extensão de prazo.
* **Assistente de Resposta:** Sistema de respostas rápidas na tela de análise — Complementação, Resposta Conclusiva e Resposta Intermediária, com preenchimento automático de texto e responsável.

### 📅 Gerenciamento Avançado de Prazos

* **Cálculos Detalhados:** Prazo Original, Prazo Interno, Data de Cobrança e Data Improrrogável.
* **Modos de Cálculo:** Dias úteis ou dias corridos.
* **Ajuste de Fim de Semana:** 3 modos configuráveis (sábado → dia anterior, domingo → próximo dia, ou ambos).
* **Ajuste de Feriados:** Próximo dia útil, dia anterior ou sem ajuste. Lista de feriados customizável.
* **Offsets Configuráveis:** Prazo interno (-10 dias por padrão) e cobrança interna (-12 dias por padrão).

### 🔔 Sistema de Notificações

* **Painel Flutuante:** Ícone que centraliza demandas importantes com categorias:
    * Prazos Curtos (≤ 2 dias)
    * Possíveis Respondidas
    * Com Observação
    * Prorrogadas
    * Complementadas
* **Filtros:** Alterne entre "Minhas Demandas" e "Todas as Demandas".
* **Alertas Visuais:** Ícone muda de cor e pulsa para alertar sobre prazos críticos.

### 📊 Dashboard Dedicado

* **Cards de Métricas:** Total de demandas, prazos curtos, prorrogadas, complementadas e taxa de conclusão.
* **Gráficos:** Distribuição de status, distribuição de prazos, Top 10 responsáveis e gráfico temporal de demandas por mês.
* **Tabela de Demandas:** Colunas com cores de urgência, busca, ordenação, paginação e ações rápidas (Abrir no Fala.BR, Copiar NUP).
* **Filtros:** Alterne entre "Minhas Demandas" e "Todas as Demandas".
* **Seletor de Site:** Alternância entre produção, treinamento e homologação diretamente pelo Dashboard.
* **Acesso:** Navegação direta via Popup ou Página de Opções.

### 📋 Módulos SIC

* **SIC Tratar:** Extração de dados e cálculos de prazo para manifestações do Sistema de Informação ao Cidadão.
* **SIC Analisar:** Reposicionamento de botões de ação na tela de detalhes/análise SIC.

### ⚙️ Página de Opções

* **Configurações Gerais:** Toggle master, itens por página e acesso ao Dashboard dedicado.
* **Prazos:** Regras de cálculo de datas completas.
* **Respostas:** Templates de resposta rápida editáveis.
* **Modelos de Texto:** Templates para todas as ações (Arquivar, Prorrogar, Encaminhar, Tramitar), com painel de chaves de substituição por categoria.
* **Pontos Focais:** Diretório hierárquico de secretarias e órgãos.
* **JSON:** Importação e exportação completa de configurações.

---

## 📦 Instalação

> **Atenção:** a raiz do repositório **não** é mais carregável como extensão. Use o zip de release ou gere o build com `bun run build` e carregue a pasta `.output/chrome-mv3`.

### Opção A — Zip de release

1. Baixe o `neuron-02.012-chrome.zip` da release e descompacte em uma pasta.
2. Abra o Google Chrome e navegue até `chrome://extensions`.
3. Ative o **"Modo do desenvolvedor"** no canto superior direito.
4. Clique em **"Carregar sem compactação"** e selecione a pasta descompactada.
5. A extensão Neuron aparecerá na sua lista e estará pronta para uso.

### Opção B — Build a partir do código-fonte

Pré-requisito: [Bun](https://bun.sh) ≥ 1.2 (Node ≥ 22 também funciona).

1. Clone o repositório, instale as dependências (o `bun install` também executa o `wxt prepare`) e gere o build:
   ```bash
   git clone https://github.com/devLucasEmiliano/Neuron.git
   cd Neuron
   bun install
   bun run build
   ```
2. Abra o Google Chrome e navegue até `chrome://extensions`.
3. Ative o **"Modo do desenvolvedor"** no canto superior direito.
4. Clique em **"Carregar sem compactação"** e selecione a pasta `.output/chrome-mv3`.
5. A extensão Neuron aparecerá na sua lista e estará pronta para uso.

### Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `bun install` | Instala as dependências e executa `wxt prepare` |
| `bun run dev` | Servidor de desenvolvimento do WXT; abre um Chromium com a extensão carregada de `.output/chrome-mv3-dev` |
| `bun run build` | Build de produção em `.output/chrome-mv3` |
| `bun run zip` | Empacota o build em `.output/neuron-02.012-chrome.zip` |
| `bun run compile` | Checagem de tipos (`tsc --noEmit`) |
| `bun run check` | `compile` + `build` |
| `node scripts/compare-manifest.mjs` | Compara o manifest gerado com o manifest legado (tag `wxt-migration-base`) |

Para que o `bun run dev` reutilize um perfil persistente do Chromium (login no Fala.BR, etc.), crie um `web-ext.config.ts` na raiz do projeto — o arquivo é ignorado pelo git:

```ts
import { resolve } from 'node:path';
import { defineWebExtConfig } from 'wxt';
export default defineWebExtConfig({
  chromiumProfile: resolve('.wxt/chrome-data'), // Windows: caminho absoluto
  keepProfileChanges: true,
  startUrls: ['https://treinafalabr.cgu.gov.br/'],
});
```

### Como Usar

* **Popup:** Clique no ícone do Neuron na barra de ferramentas para ativar/desativar a extensão, ajustar itens por página e alternar o tema.
* **Opções Avançadas:** Clique com o botão direito no ícone → **"Opções"** para acessar o painel completo de configurações, modelos de texto, pontos focais e importação/exportação JSON.
* **Módulos:** Todos os módulos podem ser habilitados ou desabilitados individualmente na página de opções.

---

## 📝 Changelog

### 02.012 — 28/09/2026

**Alterado**
- Migração do build para **WXT 0.21 + TypeScript + Bun**: a raiz do repositório deixa de ser carregável como extensão; a instalação passa a exigir `bun run build` (pasta `.output/chrome-mv3`) ou o zip de release.
- Bibliotecas de terceiros (Bootstrap, Bootstrap Icons, Chart.js, fonte Inter) passam a vir do npm.
- `config.json` e `supabase.json` são empacotados no build e não são mais expostos via `web_accessible_resources` — apenas `images/Intro-Neuron.gif` continua acessível pelas páginas do Fala.BR.
- Cada content script é um bundle próprio, que importa explicitamente o que usa e inicializa o `NeuronDB` com o site da URL. O template do overlay de loading é embutido no bundle (sem fetch em runtime).
- O Dashboard passa a ser `chrome-extension://<id>/dashboard.html`.

**Removido**
- `modules/options/dashboard.js` e `dashboard.css` (não referenciados), ícones não usados em `images/icons/` e a pasta `vendor/`.

> Sem mudanças funcionais para o usuário. A versão do manifest permanece 2.0.1 (`version_name` 02.012).

### v2.0.1 — 17/03/2026

**Adicionado**
- Módulo **Dashboard Dedicado** com cards de métricas, gráficos (status, prazos, Top 10 responsáveis, temporal por mês) e tabela de demandas com busca, ordenação, paginação e ações rápidas (Abrir no Fala.BR, Copiar NUP).
- Filtro "Minhas Demandas" vs "Todas as Demandas" no Dashboard.
- Seletor de site (produção/treinamento/homologação) no Dashboard e no Popup.
- `NeuronSite` para mapeamento de site ativo via URL e isolamento de dados por ambiente.
- Chaves de storage com prefixo por site (`neuron_{site}_{bucket}`) e `NeuronDB.switchSite` para troca de contexto.
- Navegação ao Dashboard via Popup e Página de Opções.
- Captura do nome do usuário logado via content script.
- `selectize-fix` compartilhado com posicionamento adaptativo de dropup.
- Loading overlay para páginas `/web/*` (nova UI do Fala.BR).
- Integração com Supabase para envio de sugestões.

**Alterado**
- Refatoração do módulo `tratar-novo` em três scripts (`extract`, `insert`, `pagesize`) para melhor separação de responsabilidades.
- Módulo `arquivar` atualizado para suportar tanto páginas legadas quanto a nova UI.
- Migração de `chrome.storage.local` e `localStorage` consolidada sob `NeuronDB` com cache em memória.

**Corrigido**
- `deepMerge` preservando estruturas de array ao mesclar configs.
- Proteção contra "invalidated context" em chamadas de Chrome API (loading, neuron-db, notificacoes).
- Referência `href` hardcoded na extração de demandas.
- Validação runtime de `defaultResponses` em `options.js`.

### v2.0.0 — 21/01/2025

**Adicionado**
- Interface popup com Bootstrap 5
- Página de opções para configuração da extensão
- Configurações e gerenciamento de notificações
- Padrão Module Factory para content scripts
- Camada de persistência NeuronDB e sincronização cross-context NeuronSync

**Alterado**
- Migração completa para Manifest V3
- Arquitetura de módulos refatorada para melhor manutenibilidade

**Corrigido**
- Diversas correções de bugs e melhorias de performance

> Histórico completo disponível em [CHANGELOG.md](CHANGELOG.md)

---

## 🛠️ Tecnologias e Arquitetura

### Tecnologias

* TypeScript 5.9 (ES modules, Async/Await)
* WXT 0.21 (Vite 8) — build, servidor de desenvolvimento e geração do `manifest.json`
* Bun ≥ 1.2 como runtime e gerenciador de pacotes (Node ≥ 22 também funciona)
* Chrome Extensions Manifest V3
* `chrome.storage.local` via NeuronDB (camada de serviço com cache em memória e isolamento de dados por site)
* `chrome.storage.onChanged` via NeuronSync (sincronização cross-context)
* Bootstrap 5.3 + Bootstrap Icons + fonte Inter (`@fontsource/inter`), via npm
* Chart.js 4.5 (visualizações do Dashboard), via npm
* Supabase (integração opcional para envio de sugestões)
* HTML5 / CSS3 com suporte a temas (claro/escuro/sistema)

### Arquitetura

* **Design Modular:** Cada content script é um entrypoint próprio em `src/entrypoints/*.content.ts` — um bundle por script, que importa explicitamente a lógica correspondente em `src/features/` e inicializa o `NeuronDB` com o site da URL. Popup, Página de Opções e Dashboard vivem em `src/entrypoints/{popup,options,dashboard}/`, cada um com seu HTML, TS e CSS.
* **Manifest Gerado:** O `manifest.json` não é mais versionado — o WXT o gera a partir de `wxt.config.ts` (nome, versão, permissões, `web_accessible_resources`) e das opções declaradas em cada entrypoint (`matches`, `runAt`, etc.). Um hook preserva a ordem legada dos content scripts, e `node scripts/compare-manifest.mjs` confere a paridade com o manifest anterior.
* **NeuronSite** (`src/lib/neuron-site.ts`): Mapeia a URL atual para um alias de ambiente (`producao`, `treinamento`, `homologacao`), permitindo isolamento de dados por site.
* **NeuronDB** (`src/lib/neuron-db.ts`): Camada de serviço sobre `chrome.storage.local` com cache em memória. Gerencia dados por site (`demandas`, `concluidas`, `metadata`) e dados globais (`config`, `preferences`), usando o alias do NeuronSite para namespacing de chaves (ex.: `neuron_producao_demandas`).
* **NeuronSync** (`src/lib/neuron-sync.ts`): Sincronização cross-context via `chrome.storage.onChanged`. Mantém o cache do NeuronDB coerente entre popup, página de opções, content scripts e service worker.
* **Module Factory** (`src/lib/module-factory.ts`): Padrão de projeto para criação padronizada de módulos. Gerencia ciclo de vida (ativação/desativação) lendo `masterEnableNeuron` e o toggle por módulo, e escuta mudanças de configuração via NeuronSync para reavaliar o estado.
* **Orientado a Configuração:** O comportamento é controlado pelo arquivo `src/config/config.json` — textos, regras, pontos focais e parâmetros podem ser alterados sem modificar código. Os arquivos de `src/config/` são empacotados no build e não são expostos via `web_accessible_resources`.
* **Utilitários Compartilhados** (`src/lib/`): `date-utils` (cálculos de dias úteis e feriados), `neuron-utils` (helpers gerais), `theme-manager` (gestão de temas), `selectize-fix` (ajustes em dropdowns Selectize com posicionamento adaptativo), `text-placeholders` (substituição de variáveis em templates), `supabase-client` (cliente para integrações opcionais), `sites` (URLs e `matches` dos ambientes) e `types` (tipos compartilhados).

### Estrutura de Diretórios

```
Neuron/
├─ package.json · bun.lock · tsconfig.json · wxt.config.ts
├─ scripts/compare-manifest.mjs
├─ public/                      # copiado como está para o build
│  ├─ icon/128.png
│  └─ images/Intro-Neuron.gif   # único web_accessible_resource
└─ src/
   ├─ entrypoints/              # descobertos pelo WXT
   │  ├─ background.ts
   │  ├─ *.content.ts           # 11 content scripts: loading, notificacoes, tratar-triar, arquivar, encaminhar, prorrogar, tramitar, tratar, resposta, sic-tratar, sic-analisar
   │  ├─ popup/   (index.html, main.ts, popup.css)
   │  ├─ options/ (index.html, main.ts, melhoria.ts, options.css, melhoria.css)
   │  └─ dashboard/ (index.html, main.ts, dashboard.css)  → /dashboard.html
   ├─ features/                 # lógica dos content scripts
   │  ├─ loading/  notificacoes/
   │  ├─ ouvidoria/ (tratar-triar, arquivar, encaminhar, prorrogar, tramitar, tratar, resposta)
   │  └─ sic/ (tratar, analisar)
   ├─ lib/                      # módulos compartilhados (neuron-db, neuron-sync, neuron-site, neuron-utils, date-utils, module-factory, selectize-fix, supabase-client, text-placeholders, theme-manager, sites, types)
   ├─ styles/ (theme.css, selectize-fix.css)
   └─ config/ (config.json, supabase.json — empacotados no build)
```

O build de produção é gerado em `.output/chrome-mv3` (ignorado pelo git) e o zip de release em `.output/neuron-02.012-chrome.zip`. O `Manual Neuron.pdf` permanece na raiz do repositório e não é incluído no pacote da extensão.

---

## 🤝 Como Contribuir

Contribuições são muito bem-vindas! Se você tem ideias para novas funcionalidades, melhorias ou correções:

1. **Faça um Fork** do projeto.
2. **Crie uma Branch** para sua modificação (`git checkout -b feature/NovaFuncionalidade`).
3. **Faça o Commit** das suas alterações (`git commit -m 'Adiciona NovaFuncionalidade'`).
4. **Faça o Push** para a sua branch (`git push origin feature/NovaFuncionalidade`).
5. **Abra um Pull Request**.

---

> **Nota:** Este projeto é livre para uso. Reprodução não autorizada.

## 🙏 Agradecimentos

* **Arte da Animação de Loading:** Bia.
