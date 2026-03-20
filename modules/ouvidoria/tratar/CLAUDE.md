# modules/ouvidoria/tratar/

## Purpose
Injects a helper button into the Fala.BR legacy "tratar manifestacao" (process demand) page that copies the citizen's identifying information from the page's info panel into the contribution/analysis textarea with a single click.

## Functionality
- Uses `createNeuronModule` with `scriptId: 'tratar'`.
- On activation, locates the `UpdatePanel3` div (which contains the contribution textarea) and injects a single button: "Importar dados do cidadao".
- When clicked, the button reads the citizen's name, document type, document number, and email from the page's info elements and formats them as a multi-line text block, which is written directly into the `txtContribuicao` textarea.
- Guards against double-injection by checking for the button's ID before inserting.
- `onScriptInativo` removes the button by ID.

## Key Files
- `tratar.js` — full module implementation via `createNeuronModule`
- `tratar.css` — minor button styling (`.neuron-btn-cidadao`)

## Dependencies
- `shared/js/module-factory.js` (`createNeuronModule`)
- `shared/js/neuron-db.js` (`NeuronDB`)
- `shared/js/neuron-sync.js` (`NeuronSync`)
- No config keys beyond the standard module toggle (`config.modules.tratar`)
