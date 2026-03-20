# modules/ouvidoria/resposta/

## Purpose
Injects a contextual response-option selector into the Fala.BR "resposta" (official response drafting) page. When the operator selects a response type, a secondary Neuron dropdown appears with pre-configured options that fill in the response textarea, the responsible party field, and the response body in one click.

## Functionality
- Does **not** use `createNeuronModule`; implements the full activate/deactivate lifecycle manually using `NeuronDB` and `NeuronSync` directly (the page uses the new gov.br Design System, which required a custom approach).
- Uses a `MutationObserver` on `document.body` to wait for the response form elements to appear before initializing (the page loads content dynamically).
- Injects a `br-select`-style dropdown (`#neuron-novoDropdown`) after the "tipo de resposta" selector. The dropdown is hidden until a response type is chosen.
- A second `MutationObserver` (`tipoRespostaObserver`) watches the response-type selector for changes to show/hide the Neuron dropdown and re-render its options.
- On initial load, checks if a response type is already selected (e.g., after a page reload) and renders options immediately via `verificarTipoRespostaInicial` (with a 200 ms delay).
- Options are sourced from `config.defaultResponses[tipoResposta].novoDropdownOptions` — each option has `text`, `conteudoTextarea`, and `responsavel` fields.
- Selecting an option populates `txtResposta-textarea`, `responsavelResposta-input`, and fires `input` events on both.
- `desativarFuncionalidade` disconnects the observer, removes the injected UI, and removes the document-level click handler.

## Key Files
- `resposta.js` — standalone IIFE; full lifecycle management without module-factory

## Dependencies
- `shared/js/neuron-db.js` (`NeuronDB`) — reads `neuronUserConfig`
- `shared/js/neuron-sync.js` (`NeuronSync`) — listens for config changes via `NeuronSync.onConfigChange`
- `config/config.json` — `defaultResponses` key; each response-type entry contains a `novoDropdownOptions` array
