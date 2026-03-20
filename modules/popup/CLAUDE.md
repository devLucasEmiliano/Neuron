# popup

## Purpose
The extension's browser-action popup. Provides quick access to the most frequently adjusted settings — global on/off toggle, items-per-page, and notification category configuration — without requiring the user to open the full options page.

## Functionality
- **Master switch**: Toggle `masterEnableNeuron` on/off. Saved immediately to `NeuronDB`; disables all other controls in the popup when off.
- **Items per page**: Number input for `generalSettings.qtdItensTratarTriar` (debounced 500ms before saving).
- **Notification settings** (collapsed behind a Bootstrap collapse section):
  - `deadlineThreshold` — number of days that qualifies a deadline as "short".
  - `dangerCountThreshold` — count above which the notification trigger turns red.
  - `filterDefault` — whether the panel defaults to "Minhas Demandas".
  - Category visibility checkboxes: Prazos Curtos, Possiveis Respondidas, Com Observacao, Prorrogadas, Complementadas. All changes debounced 300ms.
- **Site selector**: Buttons detect which Fala.BR environment the active tab is on (via `NeuronSite.getFromUrl`) and call `NeuronDB.switchSite()` / `NeuronDB.init()` so that reads and writes target the correct per-site storage namespace.
- **Theme toggle**: Cycles through light / dark / system using `ThemeManager.cycle()`; icon updates to match.
- **Falling leaves canvas animation**: A `requestAnimationFrame` loop renders 50 semi-transparent yellow leaf shapes drifting downward across a full-bleed `<canvas>` behind the popup content.
- **Version label**: Reads `chrome.runtime.getManifest()` and displays `v<version>` in the footer.
- **Config sync**: `NeuronSync.onConfigChange` updates the UI if the config is changed from the options page or a content script while the popup is open.
- **Link to options page**: Both the header logo and the footer "Opcoes" link open `options/options.html` in a new tab.

## Key Files
- `popup.html` — Markup: canvas background, header, master switch card, items-per-page card, notification settings section, footer with theme toggle + version label + options link. Loads Bootstrap 5, shared scripts.
- `popup.js` — All logic: theme management, site detection, config load/save, UI update functions, notification settings handlers, canvas animation.
- `popup.css` — Popup-specific layout, gradient header, card styles, category list, and animation canvas positioning.

## Dependencies
- `shared/js/neuron-site.js` — `NeuronSite.getFromUrl()` to detect which environment the active tab is on.
- `shared/js/neuron-db.js` — `getConfig`, `setConfig`, `init`, `switchSite` for per-site config storage.
- `shared/js/neuron-sync.js` — `NeuronSync.onConfigChange` for live sync with other contexts.
- `shared/js/theme-manager.js` — `ThemeManager.init()`, `ThemeManager.cycle()`, icon/label helpers.
- `shared/css/theme.css` — Shared CSS variables for light/dark theming.
- `vendor/bootstrap/` — Bootstrap 5 CSS + JS bundle, Bootstrap Icons.
- Does **not** use Module Factory; runs directly as an extension popup page.
