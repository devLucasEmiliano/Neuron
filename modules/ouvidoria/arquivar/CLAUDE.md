# modules/ouvidoria/arquivar/

## Purpose
Injects a text-template selector into the Fala.BR "arquivar manifestacao" (archive) page. Operators can pick a pre-configured justification template instead of typing freeform text, with the NUP (manifestacao number) automatically substituted into the template.

## Functionality
- Detects whether the current page is the **new UI** (Design System gov.br, `br-select` component) or the **legacy UI** (plain Bootstrap `<select>`).
- **New UI**: renders a custom `br-select`-style dropdown with radio-button list items that matches the gov.br Design System visually. Toggling is handled by an `expanded` attribute on the container.
- **Legacy UI**: renders a native `<select class="form-control">` dropdown.
- On selection, populates the `txtJustificativaArquivamento` textarea and fires an `input` event so the host page's own validation logic is notified.
- Replaces the `(NUP)` placeholder in every template string with the actual manifestacao number read from the page.
- `onScriptInativo` removes the injected container, handling both new and legacy markup variations.

## Key Files
- `arquivar.js` — full module implementation via `createNeuronModule`
- `arquivar.css` — styles for both legacy (`.neuronLabelArquivar`) and new UI (`.neuron-arquivar-novo`, `[expanded] .br-list`) variants

## Dependencies
- `shared/js/module-factory.js` (`createNeuronModule`)
- `shared/js/neuron-db.js` (`NeuronDB`) — loaded by module-factory to read `neuronUserConfig`
- `shared/js/neuron-sync.js` (`NeuronSync`) — loaded by module-factory to react to config changes
- `config/config.json` — `textModels.Arquivar` key provides the named templates
