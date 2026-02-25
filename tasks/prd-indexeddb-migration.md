# PRD: Migrate All Storage to IndexedDB

## Introduction

The Neuron extension currently uses three separate storage mechanisms: `chrome.storage.local` for configuration and preferences, `localStorage` for theme caching, and IndexedDB (via `NeuronDB`) for demand data. This feature consolidates **all** storage into IndexedDB by extending the existing `NeuronDB` module, replacing `chrome.storage.local` and `localStorage` entirely. Cross-context synchronization (previously handled by `chrome.storage.onChanged`) will be replaced with the `BroadcastChannel` API.

## Goals

- Eliminate all usage of `chrome.storage.local` across the extension
- Eliminate all usage of `localStorage` (theme cache)
- Extend `NeuronDB` with new object stores for configuration and preferences
- Implement `BroadcastChannel`-based synchronization to replace `chrome.storage.onChanged` listeners
- Maintain the same user-facing behavior (config persistence, theme persistence, cross-tab sync)
- No data migration required — users start with fresh defaults after update

## User Stories

### US-001: Add config and preferences stores to NeuronDB
**Description:** As a developer, I need new IndexedDB object stores so that configuration and preferences can be persisted without `chrome.storage.local`.

**Acceptance Criteria:**
- [ ] Bump `DB_VERSION` to `2` in `neuron-db.js`
- [ ] Add `config` object store (keyPath: `key`) for storing configuration entries (e.g., `neuronUserConfig`, `neuronSecretariaSelecionadaTramitar`)
- [ ] Add `preferences` object store (keyPath: `key`) for lightweight preferences (e.g., theme preference, filter toggle, dashboard refresh signal)
- [ ] Handle the `upgrade` callback properly so existing stores (`demandas`, `concluidas`, `metadata`) are preserved
- [ ] Add CRUD methods: `getConfig(key)`, `setConfig(key, value)`, `getPreference(key)`, `setPreference(key, value)`
- [ ] All new methods are async and use the existing `init()` pattern
- [ ] Typecheck/lint passes

### US-002: Implement BroadcastChannel synchronization layer
**Description:** As a developer, I need a cross-context notification system so that when config or preferences change in one context (e.g., options page), all other contexts (popup, content scripts, background) are notified — replacing `chrome.storage.onChanged`.

**Acceptance Criteria:**
- [ ] Create a `NeuronSync` module (or extend `NeuronDB`) that wraps `BroadcastChannel` with channel name `'neuron-sync'`
- [ ] Expose `broadcast(changeType, key, newValue)` to send change notifications
- [ ] Expose `onConfigChange(callback)` to subscribe to config changes — callback receives `{ key, newValue }`
- [ ] Expose `onPreferenceChange(callback)` to subscribe to preference changes — callback receives `{ key, newValue }`
- [ ] `setConfig()` and `setPreference()` from US-001 automatically broadcast after writing to IndexedDB
- [ ] Listeners are properly cleaned up when calling a returned `unsubscribe()` function
- [ ] Works across extension contexts: options page, popup, content scripts, background service worker
- [ ] Typecheck/lint passes

### US-003: Migrate options page to use NeuronDB
**Description:** As a user, I want my settings saved to IndexedDB so the options page no longer depends on `chrome.storage.local`.

**Acceptance Criteria:**
- [ ] `modules/options/options.js`: Replace `chrome.storage.local.get(CONFIG_STORAGE_KEY)` with `NeuronDB.getConfig('neuronUserConfig')`
- [ ] `modules/options/options.js`: Replace `chrome.storage.local.set(...)` with `NeuronDB.setConfig('neuronUserConfig', fullConfig)`
- [ ] Remove `chrome.storage.onChanged` listener; replace with `NeuronSync.onConfigChange(...)` or equivalent
- [ ] Ensure `idb.min.js` and `neuron-db.js` are loaded in the options page (check `options.html`)
- [ ] Saving config still updates all other open extension contexts in real time
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Migrate popup to use NeuronDB
**Description:** As a user, I want the popup to read/write config from IndexedDB so it no longer depends on `chrome.storage.local`.

**Acceptance Criteria:**
- [ ] `modules/popup/popup.js`: Replace `chrome.storage.local.get(CONFIG_KEY)` with `NeuronDB.getConfig('neuronUserConfig')`
- [ ] `modules/popup/popup.js`: Replace `chrome.storage.local.set(...)` with `NeuronDB.setConfig('neuronUserConfig', ...)`
- [ ] Remove `chrome.storage.onChanged` listener; replace with BroadcastChannel equivalent
- [ ] Ensure `idb.min.js` and `neuron-db.js` are loaded in `popup.html`
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Migrate ThemeManager to use NeuronDB
**Description:** As a user, I want my theme preference stored in IndexedDB, removing both the `chrome.storage.local` and `localStorage` dependencies from theme management.

**Acceptance Criteria:**
- [ ] `shared/js/theme-manager.js`: Replace `chrome.storage.local.get(STORAGE_KEY)` with `NeuronDB.getPreference('theme')`
- [ ] `shared/js/theme-manager.js`: Replace `chrome.storage.local.set(...)` with `NeuronDB.setPreference('theme', value)`
- [ ] Remove `localStorage.setItem('neuron-theme-cache', ...)` call in `applyTheme()`
- [ ] Remove `localStorage.getItem('neuron-theme-cache')` in the auto-init IIFE
- [ ] Replace `chrome.storage.onChanged` listener at bottom of file with BroadcastChannel subscription
- [ ] Anti-FOUC strategy: the auto-init IIFE should fall back to `ThemeManager.getSystemTheme()` since there is no synchronous cache. Accept a possible brief flash on first load.
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Migrate NeuronUtils to use NeuronDB
**Description:** As a developer, I need `NeuronUtils.isScriptAtivo()` and `createStorageListener()` to work with IndexedDB so all content scripts using these utilities are automatically migrated.

**Acceptance Criteria:**
- [ ] `shared/js/neuron-utils.js`: `isScriptAtivo()` reads config from `NeuronDB.getConfig('neuronUserConfig')` instead of `chrome.storage.local.get(CONFIG_KEY)`
- [ ] `shared/js/neuron-utils.js`: `createStorageListener()` uses BroadcastChannel subscription instead of `chrome.storage.onChanged.addListener()`
- [ ] Ensure `idb.min.js` and `neuron-db.js` are loaded before `neuron-utils.js` in all contexts that use it
- [ ] All content scripts that depend on `NeuronUtils` continue to work without changes to their own code
- [ ] Typecheck/lint passes

### US-007: Migrate module-factory.js to use NeuronDB
**Description:** As a developer, I need the module factory pattern to load config from IndexedDB so all modules created via the factory use the new storage.

**Acceptance Criteria:**
- [ ] `shared/js/module-factory.js`: Replace `chrome.storage.local.get(configKey)` with `NeuronDB.getConfig(configKey)`
- [ ] `shared/js/module-factory.js`: Replace `chrome.storage.onChanged` listener with BroadcastChannel subscription
- [ ] Modules created via the factory still activate/deactivate correctly when config changes
- [ ] Typecheck/lint passes

### US-008: Migrate notificacoes module to use NeuronDB
**Description:** As a user, I want the notifications panel to read/write preferences from IndexedDB, removing all `chrome.storage.local` usage.

**Acceptance Criteria:**
- [ ] `modules/notificacoes/notificacoes.js`: Replace `chrome.storage.local.get(STORAGE_KEY_THEME)` with `NeuronDB.getPreference('theme')`
- [ ] `modules/notificacoes/notificacoes.js`: Replace `chrome.storage.local.get([CONFIG_KEY, STORAGE_KEY_FILTRO_USUARIO])` with `NeuronDB.getConfig('neuronUserConfig')` and `NeuronDB.getPreference('filtroUsuario')`
- [ ] `modules/notificacoes/notificacoes.js`: Replace `chrome.storage.local.set({ neuronDashboardRefreshSignal: ... })` with `NeuronDB.setPreference('dashboardRefreshSignal', Date.now())`
- [ ] `modules/notificacoes/notificacoes.js`: Replace `chrome.storage.local.set({ [STORAGE_KEY_FILTRO_USUARIO]: ... })` with `NeuronDB.setPreference('filtroUsuario', value)`
- [ ] Replace `chrome.storage.onChanged` listener with BroadcastChannel subscription
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Migrate dashboard to use NeuronDB
**Description:** As a user, I want the dashboard to receive refresh signals via BroadcastChannel instead of `chrome.storage.onChanged`.

**Acceptance Criteria:**
- [ ] `modules/options/dashboard.js`: Replace `chrome.storage.onChanged` listener (which watches for `neuronDashboardRefreshSignal`) with BroadcastChannel subscription
- [ ] Dashboard still auto-refreshes when user marks demands as concluded in the notifications panel
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: Migrate remaining content script modules to use NeuronDB
**Description:** As a developer, I need all remaining content scripts to read config from IndexedDB.

**Acceptance Criteria:**
- [ ] `modules/ouvidoria/resposta/resposta.js`: Replace `chrome.storage.local.get(CONFIG_KEY)` with `NeuronDB.getConfig('neuronUserConfig')` and replace `chrome.storage.onChanged` listener
- [ ] `modules/ouvidoria/tramitar/tramitar.js`: Replace `chrome.storage.local.get(CONFIG_KEY)` with `NeuronDB.getConfig('neuronUserConfig')` and replace `chrome.storage.onChanged` listener
- [ ] `modules/ouvidoria/tramitar/tramitar-pontos-focais.js`: Replace `chrome.storage.local.get(CONFIG_KEY)` with `NeuronDB.getConfig('neuronUserConfig')`, replace `chrome.storage.local.get/set('neuronSecretariaSelecionadaTramitar')` with `NeuronDB.getPreference()/setPreference()`, and replace `chrome.storage.onChanged` listener
- [ ] `modules/ouvidoria/tratar-novo/tratar-novo-pagesize.js`: Replace `chrome.storage.local.get(...)` with `NeuronDB.getConfig('neuronUserConfig')`
- [ ] `modules/ouvidoria/tratar-novo/tratar-novo-insert.js`: Replace `chrome.storage.local.get(...)` with `NeuronDB.getConfig('neuronUserConfig')`
- [ ] `modules/loading/loading.js`: Replace `chrome.storage.local.get(CONFIG_KEY)` with `NeuronDB.getConfig('neuronUserConfig')` and replace `chrome.storage.onChanged` listener
- [ ] `shared/js/date-utils.js`: Replace `chrome.storage.local.get('neuronUserConfig')` with `NeuronDB.getConfig('neuronUserConfig')`
- [ ] Typecheck/lint passes

### US-011: Update background service worker
**Description:** As a developer, I need the background service worker to use IndexedDB and BroadcastChannel instead of `chrome.storage.local`.

**Acceptance Criteria:**
- [ ] `background.js`: Replace `chrome.storage.onChanged` listener with BroadcastChannel subscription
- [ ] Remove the old `chrome.storage.local` demand migration logic (since we are not migrating data and demands are already in IndexedDB)
- [ ] Ensure `idb.min.js` and `neuron-db.js` are imported in the service worker context (via `importScripts` or manifest background scripts)
- [ ] Typecheck/lint passes

### US-012: Update manifest.json and HTML files
**Description:** As a developer, I need to ensure all extension pages and contexts load the IndexedDB dependencies and that the `storage` permission can be removed from the manifest.

**Acceptance Criteria:**
- [ ] Verify `idb.min.js` and `neuron-db.js` are included in all HTML pages that need them: `options.html`, `popup.html`, `notificacoes.html`
- [ ] Verify script load order: `idb.min.js` before `neuron-db.js` before any module that uses `NeuronDB`
- [ ] Remove `"storage"` permission from `manifest.json` (IndexedDB does not require a permission)
- [ ] Verify all `web_accessible_resources` and `content_scripts` entries are correct
- [ ] Extension installs and loads without errors in `chrome://extensions`

### US-013: Remove all dead chrome.storage.local and localStorage code
**Description:** As a developer, I want to clean up any remaining references to `chrome.storage.local` and `localStorage` to ensure no dead code remains.

**Acceptance Criteria:**
- [ ] Zero occurrences of `chrome.storage.local` in the codebase (search with grep)
- [ ] Zero occurrences of `chrome.storage.onChanged` in the codebase (search with grep)
- [ ] Zero occurrences of `localStorage.setItem` or `localStorage.getItem` in the codebase (search with grep)
- [ ] The `migrateFromChromeStorage()` method in `neuron-db.js` is removed (no longer needed)
- [ ] The `needsMigration()` method in `neuron-db.js` is removed
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Extend `NeuronDB` with `config` object store (keyPath: `key`) and `preferences` object store (keyPath: `key`), bumping DB version to 2
- FR-2: Provide `getConfig(key)`, `setConfig(key, value)`, `getPreference(key)`, `setPreference(key, value)` methods on `NeuronDB`
- FR-3: Implement a `BroadcastChannel`-based sync mechanism (channel name: `neuron-sync`) that broadcasts change events when config or preferences are written
- FR-4: Broadcast messages must include `{ type: 'config-change' | 'preference-change', key: string, value: any }`
- FR-5: All contexts that previously used `chrome.storage.onChanged` must subscribe to the BroadcastChannel and react to relevant changes
- FR-6: The `setConfig()` and `setPreference()` methods must write to IndexedDB AND broadcast the change in a single call
- FR-7: All config reads currently using `chrome.storage.local.get()` must be replaced with `NeuronDB.getConfig()` or `NeuronDB.getPreference()`
- FR-8: All config writes currently using `chrome.storage.local.set()` must be replaced with `NeuronDB.setConfig()` or `NeuronDB.setPreference()`
- FR-9: The `localStorage` theme cache must be removed entirely; theme initialization falls back to system preference detection
- FR-10: Remove the `"storage"` permission from `manifest.json`
- FR-11: Default config values (from `config/config.json`) must be loaded when no config exists in IndexedDB (first install)

## Non-Goals

- No automatic data migration from `chrome.storage.local` to IndexedDB (users start fresh)
- No backward compatibility shim for `chrome.storage.local`
- No changes to the demand data storage (already in IndexedDB)
- No changes to the extension's UI or functionality beyond the storage layer
- No polyfill for `BroadcastChannel` (supported in all modern Chrome versions)

## Technical Considerations

- **BroadcastChannel in service workers:** Chrome MV3 service workers support `BroadcastChannel`. However, the service worker may be inactive when a message is sent. Content scripts and extension pages will receive messages only when they have an active listener. This is acceptable since the current `chrome.storage.onChanged` has similar behavior for sleeping service workers.
- **IndexedDB in content scripts:** Content scripts can access IndexedDB, but the database is scoped to the **host page's origin**, not the extension's origin. To share a single IndexedDB across contexts, content scripts must access the database through the extension's background service worker using `chrome.runtime.sendMessage()`, OR use `chrome.offscreen` documents. **Alternative:** Content scripts can use the extension's own IndexedDB if accessed via a `chrome.runtime.getURL()` iframe or by importing the DB module in the extension context. This needs careful evaluation — if content scripts cannot directly share the extension's IndexedDB, a message-passing bridge to the background worker will be needed for config reads.
- **Script load order:** `idb.min.js` must load before `neuron-db.js`, which must load before any consuming module. Ensure this order in all HTML files and `importScripts` calls.
- **Anti-FOUC trade-off:** Removing the `localStorage` theme cache means there may be a brief flash of the wrong theme on page load, since IndexedDB reads are asynchronous. This is an accepted trade-off per the user's decision.
- **DB version upgrade:** Bumping from v1 to v2 triggers the `upgrade` callback. The existing stores must be preserved; only new stores are created in the upgrade path.

## Success Metrics

- Zero references to `chrome.storage.local`, `chrome.storage.onChanged`, or `localStorage` in the codebase
- `"storage"` permission removed from `manifest.json`
- All config and preference reads/writes go through `NeuronDB`
- Cross-context sync works via `BroadcastChannel` (changing a setting in options page is reflected in popup and content scripts)
- Extension loads and functions correctly after a clean install (no migration needed)

## Open Questions

- **Content script IndexedDB access:** Content scripts run in the host page's context. Can they access the extension's IndexedDB directly, or do we need a message-passing bridge via the background service worker? This needs a quick prototype to confirm. If a bridge is needed, it adds complexity to US-006, US-007, and US-010.
- **Service worker lifecycle:** If the background service worker is asleep when a BroadcastChannel message is sent, the message is lost. Is this acceptable, or do we need a fallback (e.g., content scripts re-read config on `visibilitychange`)?
- **Default config on first install:** Should the background worker seed IndexedDB with defaults from `config/config.json` on `chrome.runtime.onInstalled`, or should each module handle missing config gracefully by falling back to defaults?
