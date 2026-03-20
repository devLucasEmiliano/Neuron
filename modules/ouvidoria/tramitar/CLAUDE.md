# modules/ouvidoria/tramitar/

## Purpose
Injects two complementary tools into the Fala.BR "tramitar manifestacao" (route to internal unit) page: a deadline information panel with automatic internal-deadline calculation, and a focal-points panel that lets operators add a pre-configured list of recipients to the routing form in one click.

## Functionality

### tramitar.js — Deadline panel and message templates
- Does not use `createNeuronModule`; implements the lifecycle manually.
- Reads the official response deadline from the page (`txtPrazoAtendimento`) and uses `DateUtils` to calculate a suggested internal deadline based on `config.prazosSettings.tratarNovoPrazoInternoDias`, respecting working-days vs. calendar-days mode.
- Pre-fills the `txtDataTratamento` field with the calculated internal deadline if it is empty.
- Injects `#neuronPainelPrazos` above the message field, showing the original deadline and the internal deadline with remaining-days counts. Updates live as the operator edits the date field.
- Persists manual deadline overrides per manifestacao number to `neuronPrazosOverrides` in storage, so the override is remembered if the operator navigates away and returns.
- Injects `#neuronSelectMensagensTramitar`, a dropdown of message templates from `config.textModels.Tramitar`. On selection, substitutes `{SECRETARIA}` (from the tags field) and `{PRAZO}` (from the date field) into the template and writes it to the message textarea.
- `removerElementosCriados` strips the panel, the dropdown, and the date-field event listeners cleanly.

### tramitar-pontos-focais.js — Focal points auto-add panel
- Independent IIFE; checks `config.modules.tramitar` (same toggle as tramitar.js).
- Injects `#neuronPainelPontosFocais`, a Bootstrap panel with a secretaria selector and a list of the corresponding focal-point names from `config.focalPoints`.
- Persists the last selected secretaria to `NeuronDB` preferences so it is restored on next visit.
- "Auto-Tramitar" button iterates over the focal-point names, types each into the selectize user-search input, simulates Enter, clicks the add button, and waits for the table row count to increase before proceeding to the next name — using a `MutationObserver`-based promise with a 10-second timeout.

## Key Files
- `tramitar.js` — deadline panel + message template dropdown (manual lifecycle)
- `tramitar-pontos-focais.js` — focal points panel (manual lifecycle, standalone IIFE)
- `tramitar.css` — styles for `#neuronPainelPontosFocais`, `#neuronPainelPrazos`, and `#neuronSelectMensagensTramitar`

## Dependencies
- `shared/js/neuron-db.js` (`NeuronDB`) — reads `neuronUserConfig`, `neuronPrazosOverrides`; writes preferences
- `shared/js/neuron-sync.js` (`NeuronSync`) — config change listener
- `shared/js/date-utils.js` (`DateUtils`) — deadline arithmetic (`parsearData`, `adicionarDiasUteis`, `adicionarDiasCorridos`, `ajustarDataFinal`, `formatarData`, `calcularDiasRestantes`)
- `config/config.json` — `prazosSettings`, `textModels.Tramitar`, `focalPoints`
