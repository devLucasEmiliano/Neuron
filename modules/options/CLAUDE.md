# options

## Purpose
Full-page settings UI for the Neuron extension, opened in a dedicated browser tab. Provides structured access to all configurable aspects of the extension: module toggles, deadline parameters, holiday calendar, response templates, text models, focal point groups, and raw JSON editing with import/export.

## Functionality
The page uses a sidebar navigation pattern — clicking a section link shows the corresponding `<section>` panel and initializes it lazily on first visit.

### Sections
- **Geral**: Master on/off switch (`masterEnableNeuron`), per-module toggles (notificacoes, prazos, respostas, modelos, pontosFocais), and items-per-page setting (`qtdItensTratarTriar`). All controls are disabled when the master switch is off.
- **Prazos**: Offset values for internal deadline and internal charge date calculations, calculation mode (business days / calendar days), weekend adjustment mode, and holiday adjustment mode. Also contains the holiday list manager (add by DD/MM/YYYY + description, remove, sort, reset to default, save).
- **Respostas**: Per-type quick-reply option editor. Select a response type, then add/edit/remove dropdown options (text, textarea content, responsavel). Supports reset to default per type.
- **Modelos (Textos)**: Per-category text model editor. Supports string-valued models (key + textarea) and object-valued models (nested key/sub-key textareas). Keys can be renamed; models can be added/removed and reset to default.
- **Pontos Focais**: Accordion-based group editor for focal point lists (used in routing). Groups can be renamed, and individual points within each group can be added, edited, or removed. Entire groups can be deleted.
- **JSON**: Raw textarea editor displaying the full `fullConfig` object as formatted JSON. Supports direct edit + save and a full reset to default. Also hosts the export (downloads a timestamped `.json` file) and import (reads a `.json` file, validates it, and applies) workflow.

### Configuration handling
- On load, fetches `config/config.json` as `defaultConfig` and merges it with the stored `neuronUserConfig` via a recursive `deepMerge`.
- Save writes back to `NeuronDB.setConfig('neuronUserConfig', fullConfig)`.
- Listens to `NeuronSync.onConfigChange` to stay in sync when another context (e.g., popup) modifies the config.
- Status messages use Bootstrap dismissible alerts with auto-dismiss timers.

### Theme
- Initializes `ThemeManager` on load; cycles light / dark / system via a header button.

## Key Files
- `options.html` — Page structure: header with theme toggle, sidebar nav, all section panels, global save footer. Loads Bootstrap 5, Bootstrap Icons, and shared scripts.
- `options.js` — All page logic: config load/save/merge, tab setup functions (`setupHolidaysTab`, `setupResponsesTab`, `setupTextModelsTab`, `setupFocalPointsTab`), sidebar navigation with lazy init, import/export handlers, and sync listener.
- `options.css` — Layout styles for the sidebar + content split, section cards, and form elements.

## Dependencies
- `shared/js/neuron-db.js` — `getConfig`, `setConfig` for reading and writing `neuronUserConfig`.
- `shared/js/neuron-sync.js` — `NeuronSync.onConfigChange` to react to config changes from other contexts.
- `shared/js/neuron-utils.js` — `window.NeuronUtils.escapeHtml` for safe rendering of user-supplied template content.
- `shared/js/theme-manager.js` — `ThemeManager.init()`, `ThemeManager.cycle()`, icon/label helpers.
- `shared/css/theme.css` — Shared CSS variables for light/dark theming.
- `vendor/bootstrap/` — Bootstrap 5 CSS + JS bundle, Bootstrap Icons.
- `config/config.json` — Loaded at runtime as the default/reset baseline.
- Does **not** use Module Factory; runs directly as an extension options page.
