# modules/

## Purpose
Top-level container for all Neuron feature modules. Each subdirectory is a self-contained unit that injects UI or behavior into a specific Fala.BR page. Modules are organized by platform area (ouvidoria, sic) and by supporting concerns (loading, popup, options, notificacoes).

## Functionality
- **ouvidoria/**: Operator action modules for the main ouvidoria (ombudsman) workflow — archiving, forwarding, extending deadlines, routing, treating, and drafting responses.
- **sic/**: Modules for the SIC (Sistema de Informacao ao Cidadao) sub-system — demand extraction and analysis.
- **loading/**: Replaces Fala.BR's default loading animation with a custom Neuron one.
- **popup/**: Extension popup (global on/off toggle, items-per-page setting, theme switcher).
- **options/**: Full settings page — module toggles, text template editor, focal points management, JSON import/export.
- **notificacoes/**: Floating notification panel with demand categorization and status tracking.

## Key Files
- `ouvidoria/` — see `ouvidoria/CLAUDE.md`
- `sic/tratar/sic-tratar-extract.js` — extracts SIC demand data from the list page
- `sic/analisar/sic-analisar-move-buttons.js` — repositions action buttons on the SIC analysis page
- `loading/loading.js` / `loading.html` / `loading.css` — custom loading overlay
- `popup/popup.js` / `popup.html` / `popup.css` — extension popup
- `options/options.js` / `options.html` / `options.css` — settings page
- `notificacoes/notificacoes.js` / `notificacoes.css` — notification panel

## Dependencies
- `shared/js/neuron-site.js` — site alias resolution (loaded first by every content script group)
- `shared/js/neuron-db.js` — storage service (`NeuronDB`)
- `shared/js/neuron-sync.js` — cross-context config sync (`NeuronSync`)
- `shared/js/module-factory.js` — lifecycle manager (`createNeuronModule`)
- `shared/js/date-utils.js` — business day / deadline calculations (`DateUtils`)
- `config/config.json` — default configuration including text templates, deadline settings, and holidays
