# modules/ouvidoria/encaminhar/

## Purpose
Injects a text-template selector into the Fala.BR "encaminhar manifestacao" (forward) page. Each template populates two notification fields simultaneously — one addressed to the destination ouvidoria and one to the original requester — with variable substitution for the destination name and the NUP.

## Functionality
- Renders a `<select class="form-control">` dropdown with named templates sourced from `config.textModels.Encaminhar`.
- Each template entry has two sub-fields: `destinatario` and `solicitante`, which map to the two textarea elements on the page.
- Substitution variables: `{OUVIDORIA}` is replaced with the text of the currently selected destination ouvidoria; `{NUP}` is replaced with the manifestacao number.
- Tracks whether the operator manually edited either textarea (`destinatarioManualmenteEditado` / `solicitanteManualmenteEditado` flags). Once manually edited, that field is not overwritten by subsequent template or destination changes.
- Listens to the destination ouvidoria `<select>` change event to re-apply substitutions when the destination changes after a template is already selected.
- `onScriptInativo` removes the injected container via its CSS class `.neuron-encaminhar-container`.

## Key Files
- `encaminhar.js` — full module implementation via `createNeuronModule`
- `encaminhar.css` — minor layout styles for the injected container

## Dependencies
- `shared/js/module-factory.js` (`createNeuronModule`)
- `shared/js/neuron-db.js` (`NeuronDB`)
- `shared/js/neuron-sync.js` (`NeuronSync`)
- `config/config.json` — `textModels.Encaminhar` key; each entry is an object `{ destinatario: "...", solicitante: "..." }`
