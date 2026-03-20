# modules/ouvidoria/

## Purpose
Parent directory for all ouvidoria (ombudsman) operator modules. Each sub-module targets a distinct action page within Fala.BR and injects UI helpers that streamline the operator's workflow when handling citizen requests (manifestacoes).

## Functionality
Each sub-module is independently toggled via `config.modules.<scriptId>` and the global `masterEnableNeuron` flag. They all follow the Module Factory pattern (or its equivalent manual implementation) and clean up their injected elements when deactivated.

| Sub-module    | Target page action          | Core feature                                      |
|---------------|-----------------------------|---------------------------------------------------|
| `arquivar`    | Archive a manifestacao      | Text template dropdown for justification field    |
| `encaminhar`  | Forward to another ouvidoria| Dual-field text templates with variable substitution |
| `prorrogar`   | Extend deadline             | Text template dropdown for justification field    |
| `resposta`    | Draft official response     | Contextual response options based on response type |
| `tramitar`    | Route to internal unit      | Deadline panel + message templates + focal points auto-add |
| `tratar`      | Process legacy demand       | One-click citizen data import into contribution field |
| `tratar-novo` | Process demand (new UI)     | Deadline calculations, data extraction, and block insertion on the triage list |

## Key Files
- `arquivar/` — see `arquivar/CLAUDE.md`
- `encaminhar/` — see `encaminhar/CLAUDE.md`
- `prorrogar/` — see `prorrogar/CLAUDE.md`
- `resposta/` — see `resposta/CLAUDE.md`
- `tramitar/` — see `tramitar/CLAUDE.md`
- `tratar/` — see `tratar/CLAUDE.md`
- `tratar-novo/` — see `tratar-novo/CLAUDE.md`

## Dependencies
- `shared/js/neuron-site.js`
- `shared/js/neuron-db.js` (`NeuronDB`)
- `shared/js/neuron-sync.js` (`NeuronSync`)
- `shared/js/module-factory.js` (`createNeuronModule`) — used by arquivar, encaminhar, prorrogar, tratar
- `shared/js/date-utils.js` (`DateUtils`) — used by tramitar and tratar-novo
- `config/config.json` — provides `textModels`, `prazosSettings`, `focalPoints`, and `defaultResponses`
