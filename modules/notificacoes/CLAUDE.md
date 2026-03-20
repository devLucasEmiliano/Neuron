# notificacoes

## Purpose
Injects a persistent floating notification panel into Fala.BR pages. The panel monitors demand data extracted from the platform and surfaces actionable alerts — short deadlines, possibly-answered demands, extended demands, complemented demands, and demands with observations — so operators can quickly prioritize their work.

## Functionality
- **Floating trigger button**: A bell-icon button appended to `document.body`. Shows a pulsating badge counter with color-coded status (`status-ok`, `status-warning`, `status-danger`) based on the number of pending notifications and the configurable `dangerCountThreshold`.
- **Notification panel**: A slide-in panel with a header (title + user filter toggle), a scrollable body grouped by category, and a footer with "Refresh" and "Clear List" actions.
- **Demand categories** (each independently togglable via `config.notificacoesSettings.categoryVisibility`):
  - Prazos Curtos — deadlines within `deadlineThreshold` days.
  - Possiveis Respondidas — demands flagged as possibly answered.
  - Com Observacao — demands with an observation flag.
  - Prorrogadas — demands whose `situacao` includes "Prorrogada".
  - Complementadas — demands whose `situacao` includes "Complementada".
- **User filter**: Toggle between "Minhas Demandas" (only demands where the logged-in user appears in `responsaveis`) and "Todas as Demandas". State is persisted via `NeuronDB.setPreference('filtroUsuarioAtivado', ...)`.
- **Data flow**: Listens for the custom DOM event `dadosExtraidosNeuron` (fired by other modules that scrape the demand list), saves new demands to `NeuronDB`, and re-renders the panel.
- **Collapsible groups**: Each category section collapses/expands with a CSS `max-height` transition.
- **Mark as done**: Each demand item has a checkbox; checked state is persisted via `NeuronDB.markConcluida()` and excluded from the counter.
- **Navigation**: Clicking a demand number scrolls to it on the current page (with a highlight effect) or opens it in a new tab if not found.
- **Clear list**: Calls `NeuronDB.clearAll()` after a confirmation modal, then fires a `dashboardRefreshSignal` preference update.
- **Theme support**: Applies `neuron-dark` CSS class to the panel and trigger based on `ThemeManager` preference; reacts to `theme` and `themeEnabled` preference changes via `NeuronSync.onPreferenceChange`.
- **Lifecycle**: Activated/deactivated cleanly through `ativarFuncionalidade` / `desativarFuncionalidade`, which add/remove all event listeners and the UI.
- **Config reactivity**: Responds to `NeuronSync.onConfigChange` (module toggle) and `NeuronSync.onPreferenceChange` (filter state, theme).

## Key Files
- `notificacoes.js` — All logic: UI creation, data handling, rendering, event delegation, theme, and lifecycle management.
- `notificacoes.css` — Styles for the trigger button, panel, groups, items, toggle switch, toast, and dark mode variants.

## Dependencies
- `shared/js/neuron-site.js` — Site alias resolution for `NeuronDB.init()`.
- `shared/js/neuron-db.js` — Persists demands (`saveDemandas`), concluidas (`markConcluida`, `getConcluidas`), preferences (`filtroUsuarioAtivado`, `dashboardRefreshSignal`), and metadata (`currentUser`).
- `shared/js/neuron-sync.js` — `NeuronSync.onConfigChange` and `NeuronSync.onPreferenceChange` for cross-context reactivity.
- `window.NeuronUtils.escapeHtml` — XSS-safe HTML rendering (from `shared/js/neuron-utils.js`).
- Custom DOM event `dadosExtraidosNeuron` — Produced by demand-list scraping modules (e.g., `tratar`, `tratar-novo`).
