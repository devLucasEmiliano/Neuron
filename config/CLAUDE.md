# config

## Purpose

Holds the default configuration that is loaded into `chrome.storage.local` on extension install (`background.js` `onInstalled` event). It acts as the single source of truth for all factory defaults — module toggles, deadline settings, holidays, text templates, and focal point lists.

## Functionality

- **Global kill switch:** `masterEnableNeuron` enables or disables the entire extension.
- **Module toggles:** `modules.*` booleans control individual features (`notificacoes`, `prazos`, `respostas`, `modelos`, `pontosFocais`).
- **General settings:** `generalSettings.qtdItensTratarTriar` sets the default number of items fetched on the treat/triage page.
- **Notification settings:** `notificacoesSettings` configures deadline thresholds, danger count thresholds, and per-category visibility in the floating notification panel.
- **Deadline calculation settings:** `prazosSettings` configures the calculation mode (business days vs. calendar days), weekend/holiday adjustment strategies, and internal deadline offsets for the `tratar-novo` module.
- **Holidays:** `holidays` is an array of dated entries used by `date-utils.js` for business day calculations.
- **Text templates:** `textModels` provides pre-written text blocks organized by action type (`Arquivar`, `Prorrogar`, `Encaminhar`, `Tramitar`, `Tratar`). Operators select these from dropdowns injected into Fala.BR pages. Substitution keys available per category (e.g., `{NUP}`, `{OUVIDORIA}`, `{PRAZO}`, `{SECRETARIA}`) are documented in `shared/js/text-placeholders.js` and in section 4.1 of `Manual Neuron.pdf`.
- **Default responses:** `defaultResponses` provides template sets for the `tratar-novo` response UI (`Pedido de Complementacao`, `Resposta Conclusiva`, `Resposta Intermediaria`), each containing dropdown options with pre-filled textarea content and a responsible party field.
- **Focal points:** `focalPoints` maps short organizational codes (e.g., `SDA/DIPOA`) to arrays of full organizational unit names used in routing/tramitacao flows.

## Key Files

- `config.json` — the only file in this directory; version-tagged via `configVersion` (currently `5.0.0`).

## Dependencies

- **`background.js`** reads this file on install and writes its contents to `chrome.storage.local` under the key `neuronUserConfig`.
- **`NeuronDB.getConfig()`** is the runtime accessor for this data across all modules.
- **`date-utils.js`** consumes `holidays` and `prazosSettings` values.
- **Module Factory (`module-factory.js`)** reads `masterEnableNeuron` and per-module keys from `modules.*` to decide whether to activate each content script.
- **Options page** allows users to edit and export/import this config at runtime; the stored version in `chrome.storage.local` takes precedence over this file after first install.
