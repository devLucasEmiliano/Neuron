# tasks

## Purpose

Stores Product Requirements Documents (PRDs) and planning artifacts for features in development or under consideration. These files are not loaded by the extension at runtime — they exist solely as developer reference material.

## Functionality

- Documents pending or in-progress features with full specification: motivation, user stories, acceptance criteria, functional requirements, technical notes, design decisions, out-of-scope items, and open questions.
- Serves as the written agreement between the developer and the intended behavior before implementation begins.
- Currently contains one PRD:
  - **`prd-storage-por-site.md`** — specifies the "per-site storage isolation" feature. This feature isolates `chrome.storage.local` data (demands, concluded items, metadata) by environment alias (`producao`, `treinamento`, `homologacao`) using prefixed keys (e.g., `neuron_producao_demandas`). It also covers: automatic site detection from the page URL via a new `NeuronSite` utility, fixing hardcoded `href` domains in demand extraction, a site-switcher UI in the Popup and Dashboard, cross-context cache coherence in `NeuronSync`, and cleanup of legacy unprefixed keys on extension update.

## Key Files

- `prd-storage-por-site.md` — PRD for multi-environment storage isolation (9 user stories with acceptance criteria checklists, storage key schema, and a list of the 6 impacted files).

## Dependencies

- No runtime dependencies — these files are not referenced by any extension code.
- The PRD describes changes that will affect: `shared/js/neuron-site.js`, `shared/js/neuron-db.js`, `shared/js/neuron-sync.js`, `background.js`, `modules/popup/popup.js`, and `modules/tratar-novo/tratar-novo-extract.js`.
