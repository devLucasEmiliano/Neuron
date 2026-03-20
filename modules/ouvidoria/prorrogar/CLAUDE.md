# modules/ouvidoria/prorrogar/

## Purpose
Injects a text-template selector into the Fala.BR "prorrogar manifestacao" (extend deadline) page. Operators can select a pre-written justification template, which is inserted directly into the justification textarea.

## Functionality
- Renders a `<select class="form-control">` dropdown with named templates sourced from `config.textModels.Prorrogar`.
- On selection, the chosen template text is written directly into the `txtJustificativaProrrogacao` textarea.
- No variable substitution is performed; templates are used verbatim.
- The dropdown is inserted immediately after the "motivo da prorrogacao" form group on the page.
- `onScriptInativo` removes the injected container via its CSS class `.neuron-prorrogar-container`.

## Key Files
- `prorrogar.js` — full module implementation via `createNeuronModule`
- `prorrogar.css` — layout styles for the injected container

## Dependencies
- `shared/js/module-factory.js` (`createNeuronModule`)
- `shared/js/neuron-db.js` (`NeuronDB`)
- `shared/js/neuron-sync.js` (`NeuronSync`)
- `config/config.json` — `textModels.Prorrogar` key provides the named templates
