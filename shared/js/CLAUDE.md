# shared/js/

## Purpose
Core JavaScript infrastructure for the Neuron extension. Every content script, the popup, the options page, and the background service worker depend on one or more files from this directory. Files must be loaded in dependency order: `neuron-site.js` first, then `neuron-db.js`, then `neuron-sync.js`, then any consumers.

## Functionality

### Environment Detection (`neuron-site.js`)
Maps the three Fala.BR hostnames to short aliases (`producao`, `treinamento`, `homologacao`). Used by NeuronDB to namespace storage keys so data from different environments never mixes. Exposes `getFromUrl(url)`, `getDomain(alias)`, and `getLabel(alias)`.

### Storage Layer (`neuron-db.js`)
Singleton service over `chrome.storage.local` with a write-through in-memory cache. Initialised once per context by calling `NeuronDB.init(siteAlias)`. Manages five storage buckets:
- `neuron_<site>_demandas` — active demand records (object keyed by `numero`)
- `neuron_<site>_concluidas` — array of completed demand numbers
- `neuron_<site>_metadata` — arbitrary per-site key/value pairs
- `neuron_config` — global extension configuration (`neuronUserConfig`)
- `neuron_preferences` — global user preferences (theme, items-per-page, etc.)

Provides helper methods for CRUD on demands, completion tracking, statistics aggregation (`getStats()`), notification relevance filtering (`isNotificacaoRelevante()`), and safe handling of invalidated extension contexts. The internal `_updateCache()` method is called exclusively by NeuronSync to keep the cache coherent without re-reading storage.

### Cross-Context Sync (`neuron-sync.js`)
Installs a single `chrome.storage.onChanged` listener. When config or preference keys change in any extension context (popup, options page, content script, background), NeuronSync:
1. Updates the NeuronDB in-memory cache for the affected keys.
2. Diffs old and new objects and fires per-key subscriber callbacks via `onConfigChange(cb)` and `onPreferenceChange(cb)`.

Returns an unsubscribe function from both subscription methods.

### Module Lifecycle Manager (`module-factory.js`)
`createNeuronModule({ scriptId, configKey, onScriptAtivo, onScriptInativo, onConfigChange })` bootstraps a content script module:
1. Waits for `DOMContentLoaded` if the document is still loading.
2. Reads `neuronUserConfig` from NeuronDB and checks `masterEnableNeuron` and `modules[scriptId]`.
3. Calls `onScriptAtivo({ config, log })` or `onScriptInativo()` accordingly.
4. Sets up a `MutationObserver` on `document.body` to re-evaluate state on page changes (SPA navigation support).
5. Subscribes to NeuronSync config changes to re-evaluate without a page reload.

### Date Utilities (`date-utils.js`)
Exposes `window.DateUtils` with a `ready` Promise that resolves once holiday and weekend-adjustment rules are loaded from NeuronDB (`neuronUserConfig.prazosSettings` and `neuronUserConfig.holidays`). Public API:
- `parsearData(str)` / `formatarData(date)` — DD/MM/YYYY conversions
- `adicionarDiasCorridos(date, n)` — add calendar days
- `adicionarDiasUteis(date, n)` — add business days (skips weekends and holidays)
- `ajustarDataFinal(date, overrides?)` — snap a date away from weekends/holidays per configured rules (`modo1/2/3` for weekends, `proximo_dia/dia_anterior` for holidays)
- `calcularDiasRestantes(date)` — human-readable remaining time string

### Theme Manager (`theme-manager.js`)
Singleton object `ThemeManager` that handles light/dark/system theme switching:
- Persists preference and enabled state to NeuronDB preferences (`theme`, `themeEnabled`).
- Sets `data-bs-theme` attribute on `<html>` to drive Bootstrap's built-in dark mode.
- Watches `prefers-color-scheme` media query for system theme changes.
- Dispatches `neuron-theme-change` and `neuron-theme-enabled-change` CustomEvents for UI components.
- Subscribes to NeuronSync preference changes to synchronise theme across extension contexts.
- Auto-initialises on script load using the system preference to avoid a flash of wrong theme before storage resolves.

### Shared Utilities (`neuron-utils.js`)
Exposes `window.NeuronUtils` with lightweight helpers reused across modules:
- `escapeHtml(str)` — prevents XSS when inserting untrusted strings into the DOM
- `isScriptAtivo(scriptId)` — async check against `masterEnableNeuron` + `modules[scriptId]`
- `createStorageListener(scriptId, cb)` — wraps `NeuronSync.onConfigChange` filtered to `neuronUserConfig`
- `showNotification(text, type)` — injects a temporary fixed-position toast element

### Selectize Fix (`selectize-fix.js`)
Standalone IIFE that corrects Selectize.js dropdown overflow in constrained viewports. Hooks into the Selectize API (`dropdown_open`/`dropdown_close` events) or falls back to a MutationObserver per control. Adds `selectize-dropdown--dropup` CSS class when there is insufficient space below (< 250 px). Handles ASP.NET UpdatePanel dynamic injection and debounces repositioning on scroll/resize.

## Dependencies
| File | Requires |
|---|---|
| `neuron-site.js` | None (loads first) |
| `neuron-db.js` | `neuron-site.js` (implicit, shares global `siteAlias` convention); `chrome.storage` API |
| `neuron-sync.js` | `neuron-db.js` (`NeuronDB._updateCache`, `NeuronDB._getCurrentSiteAlias`); `chrome.storage.onChanged` |
| `module-factory.js` | `neuron-db.js` (`NeuronDB.getConfig`); `neuron-sync.js` (`NeuronSync.onConfigChange`) |
| `date-utils.js` | `neuron-db.js` (`NeuronDB.getConfig`) — optional, degrades to safe defaults if absent |
| `theme-manager.js` | `neuron-db.js` (`NeuronDB.getPreference/setPreference`); `neuron-sync.js` (`NeuronSync.onPreferenceChange`); `shared/css/theme.css` |
| `neuron-utils.js` | `neuron-db.js` (`NeuronDB.getConfig`); `neuron-sync.js` (`NeuronSync.onConfigChange`) |
| `selectize-fix.js` | Selectize.js (expected on the host page); no Neuron dependencies |
