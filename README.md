<p align="center">
  <img src="https://github.com/devLucasEmiliano/Neuron/blob/stable/images/Intro-Neuron.gif" alt="Animação de Carregamento do Neuron" width="500"/>
</p>

<h1 align="center">Neuron</h1>

<p align="center">
  <strong>Um otimizador de fluxos de trabalho para a plataforma Fala.BR</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue.svg" alt="Versão 2.0">
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
| **Popup de Controle** | Liga/desliga a extensão, itens por página, tema claro/escuro/sistema |
| **Painel de Configurações** | Dashboard com gráficos, gerenciamento de modelos de texto e pontos focais |
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

### 📋 Módulos SIC

* **SIC Tratar:** Extração de dados e cálculos de prazo para manifestações do Sistema de Informação ao Cidadão.
* **SIC Analisar:** Reposicionamento de botões de ação na tela de detalhes/análise SIC.

### ⚙️ Página de Opções

* **Dashboard:** Cards estatísticos e gráficos (total de demandas, prazos curtos, prorrogadas, complementadas, taxa de conclusão).
* **Configurações Gerais:** Toggle master, itens por página.
* **Prazos:** Regras de cálculo de datas completas.
* **Respostas:** Templates de resposta rápida editáveis.
* **Modelos de Texto:** Templates para todas as ações (Arquivar, Prorrogar, Encaminhar, Tramitar), com painel de chaves de substituição por categoria.
* **Pontos Focais:** Diretório hierárquico de secretarias e órgãos.
* **JSON:** Importação e exportação completa de configurações.

---

## 📦 Instalação

1. Faça o download ou clone o repositório:
   ```bash
   git clone https://github.com/devLucasEmiliano/Neuron.git
   ```
2. Abra o Google Chrome e navegue até `chrome://extensions`.
3. Ative o **"Modo do desenvolvedor"** no canto superior direito.
4. Clique em **"Carregar sem compactação"**.
5. Selecione o diretório onde você clonou ou descompactou o projeto.
6. A extensão Neuron aparecerá na sua lista e estará pronta para uso.

### Como Usar

* **Popup:** Clique no ícone do Neuron na barra de ferramentas para ativar/desativar a extensão, ajustar itens por página e alternar o tema.
* **Opções Avançadas:** Clique com o botão direito no ícone → **"Opções"** para acessar o painel completo de configurações, modelos de texto, pontos focais e importação/exportação JSON.
* **Módulos:** Todos os módulos podem ser habilitados ou desabilitados individualmente na página de opções.

---

## 📝 Changelog

### v2.0.0 — 21/01/2025

**Adicionado**
- Interface popup com Bootstrap 5
- Página de opções para configuração da extensão
- Configurações e gerenciamento de notificações
- Padrão Module Factory para content scripts
- Integração com IndexedDB para persistência de dados (NeuronDB)
- Sincronização cross-context via BroadcastChannel (NeuronSync)

**Alterado**
- Migração completa para Manifest V3
- Arquitetura de módulos refatorada para melhor manutenibilidade
- Migração de chrome.storage.local e localStorage para IndexedDB

**Corrigido**
- Diversas correções de bugs e melhorias de performance

> Histórico completo disponível em [CHANGELOG.md](CHANGELOG.md)

---

## 🛠️ Tecnologias e Arquitetura

### Tecnologias

* JavaScript ES6+ (Async/Await)
* Chrome Extensions Manifest V3
* IndexedDB via NeuronDB (wrapper sobre a biblioteca `idb`)
* BroadcastChannel API via NeuronSync
* Bootstrap 5 + Bootstrap Icons
* Chart.js (visualizações do dashboard)
* HTML5 / CSS3 com suporte a temas (claro/escuro/sistema)

### Arquitetura

* **Design Modular:** Cada funcionalidade reside em seu próprio módulo na pasta `/modules/`, com arquivos JS, CSS e HTML independentes.
* **Module Factory** (`shared/js/module-factory.js`): Padrão de projeto para criação padronizada de módulos, gerenciando ciclo de vida (ativação/desativação) e leitura de configurações.
* **NeuronDB** (`shared/js/neuron-db.js`): Camada de serviço IndexedDB com stores para demandas, concluídas, metadata, config e preferences.
* **NeuronSync** (`shared/js/neuron-sync.js`): Sincronização via BroadcastChannel entre todos os contextos da extensão (popup, options, content scripts, background).
* **Orientado a Configuração:** O comportamento é controlado pelo arquivo `config/config.json` — textos, regras, pontos focais e parâmetros podem ser alterados sem modificar código.
* **Utilitários Compartilhados** (`shared/js/`): Funções reutilizáveis centralizadas (cálculos de data, gerenciamento de temas, utilidades gerais).

### Estrutura de Diretórios

```
Neuron/
├── background.js                 # Service Worker (Manifest V3)
├── manifest.json                 # Configuração da extensão
├── config/config.json            # Configurações dinâmicas
├── shared/
│   ├── js/                       # neuron-db, neuron-sync, module-factory, date-utils, theme-manager, neuron-utils
│   └── css/                      # Estilos compartilhados e temas
├── modules/
│   ├── loading/                  # Animação de loading
│   ├── popup/                    # Popup de controle rápido
│   ├── options/                  # Página de opções + dashboard
│   ├── notificacoes/             # Sistema de notificações
│   ├── ouvidoria/                # Módulos de ouvidoria
│   │   ├── arquivar/
│   │   ├── encaminhar/
│   │   ├── prorrogar/
│   │   ├── tramitar/
│   │   ├── tratar/
│   │   ├── tratar-novo/
│   │   └── resposta/
│   └── sic/                      # Módulos SIC
│       ├── tratar/
│       └── analisar/
├── vendor/                       # Bootstrap 5, Chart.js, idb.min.js
└── images/                       # Ícones e assets
```

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
