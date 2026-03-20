# shared/

## Purpose
Root shared directory that bundles all reusable JavaScript and CSS assets for the Neuron extension. These assets are injected across every content script context, the popup, the options page, and the background service worker. Nothing in this directory is page- or module-specific.

## Functionality
- Provides the complete core layer (storage, sync, site detection, module lifecycle, date arithmetic) via `shared/js/`.
- Provides the design system (theme tokens, dark/light mode, Selectize overrides) via `shared/css/`.
- Acts as the single source of truth for cross-cutting concerns so individual modules stay thin and avoid duplicating infrastructure code.

## Key Files
| Path | Role |
|---|---|
| `js/neuron-site.js` | URL-to-environment alias mapping |
| `js/neuron-db.js` | Storage service layer with in-memory cache |
| `js/neuron-sync.js` | Cross-context storage change propagation |
| `js/module-factory.js` | Module lifecycle manager (activate / deactivate) |
| `js/date-utils.js` | Business-day and deadline date calculations |
| `js/theme-manager.js` | Dark/light/system theme switching |
| `js/neuron-utils.js` | Miscellaneous shared helpers (XSS escape, notifications) |
| `js/selectize-fix.js` | Adaptive dropdown positioning for Selectize widgets |
| `css/theme.css` | CSS custom properties design system + Bootstrap overrides |
| `css/selectize-fix.css` | Themed Selectize dropdown styles + dropup variant |

## Dependencies
- `chrome.storage.local` API (runtime, not bundled)
- `chrome.storage.onChanged` API (runtime, not bundled)
- Bootstrap 5 (`vendor/`) — theme tokens extend Bootstrap CSS variables
- Bootstrap Icons (`vendor/`) — icon class names referenced by `ThemeManager.getIconClass()`
- Inter font (`vendor/fonts/inter/`) — loaded via `@font-face` in `theme.css`
- Selectize.js — expected to already be present in the page; `selectize-fix.js` hooks into its API
