# modules/ouvidoria/tratar-novo/

## Purpose
Enhances the Fala.BR new-UI "tratar / triagem" (triage list) page with three cooperating scripts: automatic page-size enforcement, demand data extraction, and per-row deadline calculation blocks injected into the list.

## Functionality
All three scripts share `scriptId: 'tratarTriar'` and use `window.NeuronUtils.isScriptAtivo` / `window.NeuronUtils.createStorageListener` for lifecycle management (not `createNeuronModule`).

### tratar-novo-pagesize.js — Page size enforcement
- Observes the DOM for changes to the triage panel (`upTriagem`) using a debounced `MutationObserver`.
- When the current page-size field value differs from `config.generalSettings.qtdItensTratarTriar`, it updates the field and programmatically clicks the confirm button to apply the desired page size.
- Skips enforcement when the triage panel shows an info-only alert (no list present).

### tratar-novo-extract.js — Demand data extraction
- Observes `upTriagem` for DOM mutations (debounced, 500 ms) and also listens for the custom `NEURON_SOLICITAR_ATUALIZACAO` event.
- On each run, iterates all demand number links (`a[id*="lvwTriagem_lnkNumero_"]`) and for each builds a structured object with: `numero`, `href`, `situacao`, `prazo`, `dataCadastro`, `responsaveis`, `possivelRespondida`, `possivelobservacao`, and the original element IDs for prazo and cadastro.
- Dispatches a `dadosExtraidosNeuron` `CustomEvent` on `document` with the array of extracted objects as `event.detail`.

### tratar-novo-insert.js — Deadline block insertion
- Listens for the `dadosExtraidosNeuron` event dispatched by the extractor.
- For each demand, hides the original prazo and cadastro elements and inserts a styled info block alongside them showing: registration date (with age), original deadline (with remaining days), calculated internal deadline (or manual override from `neuronPrazosOverrides`), internal collection date, and — for non-extended demands — the improrrogavel (hard-cutoff) date.
- All date arithmetic uses `DateUtils` with the operator-configured working-days/calendar-days mode, weekend adjustment, and holiday adjustment settings from `prazosSettings`.
- Manual deadline overrides stored under `neuronPrazosOverrides` are respected and displayed with a different label ("Prazo Interno:" vs. "Possivel Prazo Interno:").
- `removerBlocosInseridos` restores original elements and removes injected blocks on deactivation.

## Key Files
- `tratar-novo-pagesize.js` — page-size auto-correction
- `tratar-novo-extract.js` — demand data extraction and event dispatch
- `tratar-novo-insert.js` — deadline block rendering
- `tratar-novo.css` — styles for the injected deadline blocks and triage list enhancements

## Dependencies
- `shared/js/neuron-db.js` (`NeuronDB`) — reads `neuronUserConfig`, `neuronPrazosOverrides`
- `shared/js/neuron-sync.js` (`NeuronSync`) — via `window.NeuronUtils.createStorageListener`
- `shared/js/date-utils.js` (`DateUtils`) — all deadline calculations
- `window.NeuronUtils` — utility helpers (`isScriptAtivo`, `createStorageListener`, `escapeHtml`, `CONFIG_KEY`) expected to be available from a shared script loaded before these modules
- `config/config.json` — `prazosSettings` (mode, offsets, adjustment rules), `generalSettings.qtdItensTratarTriar`
