# sic/tratar

## Purpose
Enriches the SIC (Sistema de Informacao ao Cidadao) demand treatment listing page on Fala.BR with deadline intelligence and a protocol copy shortcut. Each row in the manifestacoes table is augmented with calculated internal deadline and internal charge dates, and protocol numbers become one-click clipboard targets.

## Functionality
- **MutationObserver**: Watches `document.body` for the appearance of `#manifestacoesTable-table-body` (the SIC demand table), then calls `processarTabelaSic()` on each mutation.
- **Row processing** (skips rows already marked with `data-neuron-processado`):
  - Extracts: protocol number/link (col 0), registration date (col 6), deadline (col 7), and situation (col 8).
  - **Copy protocol**: Changes the protocol link cursor to `copy` and overrides click to write the protocol number to the clipboard, showing a 2-second floating green notification.
  - **Deadline enrichment**: Parses the official deadline using `window.DateUtils.parsearData`, then applies configurable offsets (`tratarNovoPrazoInternoDias`, `tratarNovoCobrancaInternaDias`) using either business-day or calendar-day arithmetic. The `ajustarDataFinal` function applies weekend/holiday adjustments per the mode settings. Replaces the deadline cell with a block showing: registration date, original deadline + days remaining, internal deadline + days remaining, and internal charge date + days remaining.
  - Clears the original registration date cell to avoid duplication (since it is shown inside the deadline block).
- **DateUtils dependency**: Guards with `typeof window.DateUtils === 'undefined'` check and awaits `window.DateUtils.ready` before processing.
- **Mock config**: Deadline settings are currently hardcoded as `mockPrazosSettings` inside the script. A TODO indicates these will eventually be read from `config.json`.

## Key Files
- `sic-tratar-extract.js` — Main script; IIFE containing all extraction, calculation, and DOM injection logic.
- `sic-tratar-style.css` — Styles for `.neuron-date-block` and `.modo-calculo` injected into the table cells.

## Dependencies
- `shared/js/date-utils.js` — `window.DateUtils` object with `parsearData`, `adicionarDiasUteis`, `adicionarDiasCorridos`, `ajustarDataFinal`, `formatarData`, `calcularDiasRestantes`, and `.ready` promise. Must be injected before this script via `manifest.json`.
- No NeuronDB, NeuronSync, NeuronSite, or Module Factory usage — runs unconditionally when injected.
