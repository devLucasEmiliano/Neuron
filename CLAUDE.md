# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neuron is a Chrome Extension (Manifest V3) that optimizes workflows on the Brazilian government platform **Fala.BR** (falabr.cgu.gov.br). It injects content scripts into Fala.BR pages to add automation, assistants, and UI improvements for government operators handling citizen requests (ouvidoria).

The extension targets three environments: production (`falabr.cgu.gov.br`), training (`treinafalabr.cgu.gov.br`), and staging (`falabr-h.cgu.gov.br`).

Language: the codebase, UI, comments, and config are in **Brazilian Portuguese**.

## Development

No build system, bundler, or test framework. This is a vanilla JS Chrome Extension loaded directly via `chrome://extensions` > "Load unpacked". To test changes, reload the extension in Chrome.

## Git Workflow

- **stable**: main/production branch (PR target)
- **developing**: active development branch
- **testing**: QA/validation branch

## Architecture

### Core Layer (`shared/js/`)

- **NeuronSite** (`neuron-site.js`): Maps URLs to site aliases (`producao`, `treinamento`, `homologacao`) for per-environment data isolation. Loaded first in every content script group.
- **NeuronDB** (`neuron-db.js`): Storage service layer over `chrome.storage.local` with in-memory cache. Manages per-site data (demandas, concluidas, metadata) and global data (config, preferences). Uses site alias from NeuronSite for key namespacing (e.g., `neuron_producao_demandas`).
- **NeuronSync** (`neuron-sync.js`): Cross-context synchronization via `chrome.storage.onChanged`. Keeps NeuronDB cache coherent across popup, options page, content scripts, and background service worker.
- **Module Factory** (`module-factory.js`): Lifecycle manager for content script modules. Takes a `scriptId` and `configKey`, loads config from NeuronDB, checks `masterEnableNeuron` and per-module toggle, then calls `onScriptAtivo`/`onScriptInativo`. Listens for config changes via NeuronSync to re-evaluate state.
- **date-utils.js**: Business day calculations with configurable holidays, weekend adjustment modes, and offset-based deadline computation.

### Content Script Injection

Injection is defined in `manifest.json` `content_scripts` — each entry matches specific Fala.BR URL patterns to inject the appropriate module. Scripts run at `document_start` (loading animation + DB init) or `document_idle` (feature modules).

### Module Structure (`modules/`)

Each module has its own directory with JS, CSS, and sometimes HTML files:

- **ouvidoria/**: Operator action modules — `arquivar`, `encaminhar`, `prorrogar`, `tramitar`, `tratar`, `tratar-novo`, `resposta`. Each injects UI helpers into the corresponding Fala.BR page.
- **sic/**: SIC (Sistema de Informacao ao Cidadao) modules — `tratar`, `analisar`.
- **loading/**: Custom loading animation (replaces Fala.BR's default).
- **popup/**: Extension popup (on/off toggle, items per page, theme).
- **options/**: Full settings page (config management, text templates, focal points, JSON import/export).
- **notificacoes/**: Floating notification panel with demand categorization.

Modules using Module Factory follow this pattern: call `createNeuronModule({ scriptId, configKey, onScriptAtivo, onScriptInativo })`.

### Configuration

- **`config/config.json`**: Default configuration loaded on install. Contains module toggles, deadline calculation settings, holidays, and text templates for all action types.
- Runtime config is stored in `chrome.storage.local` under key `neuronUserConfig` and accessed via `NeuronDB.getConfig()`.
- The `masterEnableNeuron` flag is the global kill switch; each module also has its own toggle under `modules.*`.

### Background Service Worker

`background.js` initializes default config on install, handles storage migration (v1 to v2 per-site keys), and logs config changes.

### Vendor Libraries

`vendor/` contains Bootstrap 5, Bootstrap Icons, Chart.js, and idb.min.js — committed directly (no package manager).
