# Changelog

All notable changes to the Neuron Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]


  - Automatic change detection and classification
  - Context7 validation for Chrome Extension APIs, Bootstrap 5, and IndexedDB
  - Structured changelog generation
  - Module boilerplate generation from templates
  - Configuration synchronization for manifest.json and config.json

## [2.00.19b4s] - 2026-03-17

### Changes
- chore: stamp version 2.00.19b4s (ba0c403)
- feat: Update arquivar module for new and legacy page support (19b4ca0)
- newui (aa31668)
- feat: US-009 - Seletor de site no Dashboard (e85ea8b)
- feat: US-009 - Seletor de site no Dashboard (fc996c8)
- feat: US-008 - Seletor de site no Popup (143b2cd)
- feat: US-007 - NeuronDB.switchSite para troca de contexto (a6981fd)
- feat: US-006 - Descarte de dados antigos na atualização da extensão (54ac3de)
- feat: US-005 - Correção do href hardcoded na extração de demandas (351af08)
- feat: US-004 - Inicialização do NeuronDB com contexto de site nos content scripts (55a1818)
- feat: US-003 - NeuronSync com suporte a chaves por site (a7e370c)
- feat: US-002 - Chaves de storage com prefixo por site no NeuronDB (823c5ab)
- feat: US-001 - Mapeamento de site ativo via URL (75ca2e6)
- few changes (8565f9a)
- feat: US-013 - Navegação: acesso ao Dashboard via Popup e Options (f0a112e)
- chore: update PRD and progress for US-012 (e1ca8d4)
- feat: US-012 - Ações rápidas na tabela (Abrir no Fala.BR e Copiar NUP) (3a4f9f4)
- feat: US-011 - Paginação da tabela de demandas (03acd87)
- feat: US-010 - Busca e ordenação na tabela de demandas (6bc6d80)
- feat: US-009 - Tabela de demandas com colunas e cores de urgência (3d1ab32)
- feat: US-008 - Filtro 'Minhas Demandas' vs 'Todas as Demandas' no Dashboard (0291654)
- feat: US-007 - Capturar nome do usuário logado via content script (d1e7679)
- feat: US-006 - Gráfico temporal de demandas por mês (dd627fd)
- feat: US-005 - Gráfico de Top 10 Responsáveis (2fccea6)
- feat: US-004 - Gráficos de distribuição de status e prazos (71a3c60)
- feat: US-003 - Cards de métricas principais no Dashboard (b9f0571)
- feat: US-002 - Criar pagina scaffold do Dashboard dedicado (4f1296b)
- feat: US-001 - Remover toggle 'Habilitar tema personalizado' do Options (d7afc00)
- hotfix (64cbe9e)
- hotfix (746d277)
- feat: Add prd.json and mark all US-001 through US-006 as passing (6cbf5ea)
- hotfix (fe693d9)
- feat: US-003 - Integrate shared selectize files in manifest.json and remove duplicate rules from module CSS (3fe7abe)
- feat: US-002 - Create shared selectize-fix.js with adaptive dropup positioning and MutationObserver (a97106a)
- feat: US-001 - Create shared selectize-fix.css with max-height, scroll, z-index, and visual styling (659c2f8)
- version (3235e45)
- feat: US-006 - Add runtime validation for defaultResponses in options.js (7d35258)
- feat: US-005 - Fix deepMerge to preserve array structures in config (b7fba64)
- feat: US-004 - Implement loading overlay for new-style /web/* pages (2b142e4)
- feat: US-003 - Guard chrome API calls against invalidated context in notificacoes.js (41ca435)
- feat: US-002 - Guard all chrome API calls against invalidated context in neuron-db.js (79683d4)
- feat: US-001 - Guard all chrome API calls against invalidated context in loading.js (0e3fd43)
- prod and txt deleted (d00b524)
- fix: resolve CI pipeline not triggering on testing → stable merge (0523bf5)
- chore: stamp version 2.00.9729b [skip ci] (d9dbec5)
- remove hotfix backport (bc84943)
- chore: stamp version 2.00.c522b [skip ci] (314ac95)
- version changing (76c9823)
- chore: update file permissions for bump-version.sh (b1f0a05)
- chore: stamp version 2.00.3740s [skip ci] (bc0b4a9)

## [2.0.0] - 2025-01-21

### Added
- Core popup UI with Bootstrap 5
- Options page for extension configuration
- Notification settings and management
- Module factory pattern for content scripts
- IndexedDB integration for data persistence

### Changed
- Migrated to Manifest V3
- Refactored module architecture for better maintainability

### Fixed
- Various bug fixes and performance improvements
