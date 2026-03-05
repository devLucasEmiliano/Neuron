# PRD: Neuron Data Layer Migration — IndexedDB to chrome.storage.local

## Introduction

Neuron is a Chrome extension (Manifest V3) that optimizes workflows on the Fala.br platform. The current data layer uses IndexedDB (`NeuronDB`) and BroadcastChannel (`NeuronSync`) for storage and synchronization. This causes a critical bug: IndexedDB is isolated by origin. Content scripts running on `falabr.cgu.gov.br` save data to the site's IndexedDB, while extension pages (options/dashboard running on `chrome-extension://`) read from a different, empty IndexedDB. BroadcastChannel has the same isolation problem. Result: the dashboard and cross-context notifications receive no data.

This migration replaces IndexedDB + BroadcastChannel with `chrome.storage.local` + `chrome.storage.onChanged`, which are shared natively across all extension contexts (content scripts, service worker, popup, options page) without origin isolation.

## Goals

- Fix the critical cross-origin data isolation bug so dashboard and notifications receive real data
- Replace IndexedDB with `chrome.storage.local` for all data stores
- Replace BroadcastChannel with `chrome.storage.onChanged` for real-time sync
- Preserve the exact public API of `NeuronDB` and `NeuronSync` to minimize consumer changes
- Pre-load data into an in-memory cache on `init()` for fast synchronous-like access

## User Stories

### US-001: Rewrite NeuronDB to use chrome.storage.local
**Description:** As a developer, I want to replace the IndexedDB backend in `neuron-db.js` with `chrome.storage.local` so that data is shared across all extension contexts.

**Acceptance Criteria:**
- [ ] `neuron-db.js` uses `chrome.storage.local` instead of IndexedDB for all operations
- [ ] All 5 stores are mapped to chrome.storage.local keys: `neuron_demandas` (object keyed by numero), `neuron_concluidas` (array of numeros), `neuron_metadata` (object key-value), `neuron_config` (object key-value), `neuron_preferences` (object key-value)
- [ ] `init()` pre-loads all data from chrome.storage.local into an in-memory cache and returns a resolved promise
- [ ] All existing public API methods are preserved with the same names and signatures
- [ ] Batch operations (`saveDemandas`, `saveDemandasFromObject`) use a single `chrome.storage.local.set()` call
- [ ] `getStats()` calculates the same statistics (total, pendentes, concluidas, taxaConclusao, prazosCurtos, atrasadas, prorrogadas, complementadas, possivelRespondida, possivelobservacao, byResponsavel, topResponsaveis, byPrazoRange) operating on the in-memory cache
- [ ] Pure utility functions (`parseDate`, `calcularDiasRestantes`, `isNotificacaoRelevante`) remain unchanged
- [ ] Write operations update both the in-memory cache and chrome.storage.local
- [ ] No references to IndexedDB, `idb`, or `openDB` remain in the file

### US-002: Rewrite NeuronSync to use chrome.storage.onChanged
**Description:** As a developer, I want to replace BroadcastChannel in `neuron-sync.js` with `chrome.storage.onChanged` so that sync events work across all extension contexts.

**Acceptance Criteria:**
- [ ] `neuron-sync.js` uses `chrome.storage.onChanged` listener instead of BroadcastChannel
- [ ] `broadcast(changeType, key, newValue)` is no longer needed as a separate broadcast — changes are detected automatically by `chrome.storage.onChanged` when `NeuronDB.setConfig()` or `NeuronDB.setPreference()` writes to storage
- [ ] `onConfigChange(callback)` fires when `neuron_config` key changes in storage, calling `callback(key, newValue)` for each changed config entry
- [ ] `onPreferenceChange(callback)` fires when `neuron_preferences` key changes in storage, calling `callback(key, newValue)` for each changed preference entry
- [ ] Both subscription methods return an unsubscribe function
- [ ] No references to BroadcastChannel remain in the file
- [ ] The `onChanged` listener also updates NeuronDB's in-memory cache when changes come from other contexts

### US-003: Update manifest.json and remove idb dependency
**Description:** As a developer, I want to update the manifest to add the `storage` permission and remove the `idb.min.js` dependency that is no longer needed.

**Acceptance Criteria:**
- [ ] `"storage"` is added to the `permissions` array in `manifest.json`
- [ ] All references to `vendor/idb.min.js` are removed from `manifest.json` content_scripts entries
- [ ] All references to `vendor/idb.min.js` are removed from options page HTML (`modules/options/options.html`)
- [ ] The file `vendor/idb.min.js` is deleted from the repository
- [ ] `background.js` no longer imports `vendor/idb.min.js` via `importScripts()`

### US-004: Update background.js for new data layer
**Description:** As a developer, I want to update `background.js` to work with the new chrome.storage.local-based NeuronDB.

**Acceptance Criteria:**
- [ ] `importScripts()` no longer includes `vendor/idb.min.js`
- [ ] `NeuronDB.init()` is still called on `onInstalled` to pre-load the cache
- [ ] Default config initialization (`config.json` loading) still works correctly
- [ ] `NeuronSync.onConfigChange()` listener still works for debug logging
- [ ] No other logic changes in background.js

### US-005: Verify core consumers — notificacoes.js
**Description:** As a developer, I want to verify that `modules/notificacoes/notificacoes.js` works correctly with the new data layer.

**Acceptance Criteria:**
- [ ] `NeuronDB.init()` call works and pre-loads cache
- [ ] `getAllDemandasAsObject()` returns demandas extracted by content scripts
- [ ] `getConcluidas()` returns the set of completed demanda numbers
- [ ] `saveDemandas()` persists extracted demandas to chrome.storage.local
- [ ] `markConcluida()` persists completion status across all contexts
- [ ] `clearAll()` clears data visible to all contexts
- [ ] `getConfig()`, `getPreference()`, `setPreference()` work correctly
- [ ] `NeuronSync.onConfigChange()` and `onPreferenceChange()` fire when changes occur from other contexts
- [ ] No changes to business logic are required

### US-006: Verify core consumers — dashboard.js and options.js
**Description:** As a developer, I want to verify that the options page modules work correctly with the new data layer.

**Acceptance Criteria:**
- [ ] `dashboard.js`: `NeuronDB.getStats()` returns real statistics from data extracted by content scripts
- [ ] `dashboard.js`: `NeuronSync.onPreferenceChange()` fires when preferences change from popup or content scripts
- [ ] `options.js`: `NeuronDB.getConfig()` reads config shared across all contexts
- [ ] `options.js`: `NeuronDB.setConfig()` persists config changes visible to all contexts
- [ ] `options.js`: `NeuronSync.onConfigChange()` fires when config changes from other contexts
- [ ] No changes to business logic are required in either file

### US-007: Verify core consumers — popup.js and theme-manager.js
**Description:** As a developer, I want to verify that the popup and theme manager work correctly with the new data layer.

**Acceptance Criteria:**
- [ ] `popup.js`: `NeuronDB.getConfig()`, `setConfig()`, `getPreference()`, `setPreference()` all work
- [ ] `popup.js`: `NeuronSync.onConfigChange()` and `onPreferenceChange()` fire correctly
- [ ] `theme-manager.js`: `NeuronDB.getPreference()` and `setPreference()` work for theme persistence
- [ ] Theme changes in popup reflect immediately in dashboard and content scripts via `onChanged`
- [ ] No changes to business logic are required in either file

### US-008: Verify additional consumers
**Description:** As a developer, I want to verify that all additional modules using NeuronDB/NeuronSync continue working with the new data layer.

**Acceptance Criteria:**
- [ ] `shared/js/neuron-utils.js`: `NeuronDB.getConfig()` and `NeuronSync.onConfigChange()` work correctly
- [ ] `shared/js/date-utils.js`: any NeuronDB usage works correctly
- [ ] `shared/js/module-factory.js`: any NeuronDB usage works correctly
- [ ] `modules/loading/loading.js`: any NeuronDB/NeuronSync usage works correctly
- [ ] `modules/ouvidoria/resposta/resposta.js`: any NeuronDB usage works correctly
- [ ] `modules/ouvidoria/tramitar/tramitar.js`: any NeuronDB usage works correctly
- [ ] `modules/ouvidoria/tramitar/tramitar-pontos-focais.js`: any NeuronDB usage works correctly
- [ ] `modules/ouvidoria/tratar-novo/tratar-novo-insert.js`: any NeuronDB usage works correctly
- [ ] `modules/ouvidoria/tratar-novo/tratar-novo-pagesize.js`: any NeuronDB usage works correctly
- [ ] No changes to business logic are required in any of these files — the preserved API ensures compatibility

## Functional Requirements

- FR-1: `neuron-db.js` must use `chrome.storage.local` as its storage backend, with all data accessible from any extension context
- FR-2: The 5 IndexedDB object stores must map to chrome.storage.local keys: `neuron_demandas`, `neuron_concluidas`, `neuron_metadata`, `neuron_config`, `neuron_preferences`
- FR-3: `neuron_demandas` must be stored as an object keyed by `numero` (e.g., `{ "12345": { numero: "12345", ... } }`)
- FR-4: `neuron_concluidas` must be stored as an array of numero strings
- FR-5: `neuron_metadata`, `neuron_config`, and `neuron_preferences` must be stored as key-value objects
- FR-6: `init()` must load all 5 keys from chrome.storage.local into an in-memory cache for fast access
- FR-7: All read operations must read from the in-memory cache (no async storage calls needed after init)
- FR-8: All write operations must update both the in-memory cache and chrome.storage.local
- FR-9: Batch operations (`saveDemandas`, `saveDemandasFromObject`) must use a single `chrome.storage.local.set()` call
- FR-10: `neuron-sync.js` must use `chrome.storage.onChanged` to detect changes from other contexts
- FR-11: The `onChanged` listener must update NeuronDB's in-memory cache when changes arrive from other contexts, keeping all contexts in sync
- FR-12: `onConfigChange(callback)` must detect changes to the `neuron_config` key and invoke callback with the specific sub-key and new value that changed
- FR-13: `onPreferenceChange(callback)` must detect changes to the `neuron_preferences` key and invoke callback with the specific sub-key and new value that changed
- FR-14: The `"storage"` permission must be declared in `manifest.json`
- FR-15: `vendor/idb.min.js` must be removed from manifest content_scripts, options HTML, background importScripts, and deleted from the repository
- FR-16: All public API method names and signatures of `NeuronDB` and `NeuronSync` must be preserved exactly
- FR-17: `getStats()` must produce identical statistics structure: total, pendentes, concluidas, taxaConclusao, prazosCurtos, atrasadas, prorrogadas, complementadas, possivelRespondida, possivelobservacao, byResponsavel, topResponsaveis, byPrazoRange

## Non-Goals (Out of Scope)

- No UI changes to dashboard, notifications, options, or popup
- No changes to data extraction logic (`tratar-novo-extract.js`)
- No changes to business logic in any consumer module
- No new features or functionality beyond the storage migration
- No IndexedDB-to-chrome.storage.local data migration — users start fresh and data is re-extracted on next page visit
- No changes to `modules/ouvidoria` action modules (arquivar, encaminhar, prorrogar, tramitar, tratar) beyond verifying they work
- No addition of `chrome.storage.sync` — only `chrome.storage.local` is used

## Technical Considerations

- **Data volume:** 100-2000 demandas (~500KB-2MB), well within chrome.storage.local's 10MB limit
- **Performance:** Reading and filtering 2000 records in JS takes <5ms after cache load; acceptable
- **In-memory cache strategy:** `init()` loads all data into memory. Reads are synchronous from cache. Writes update cache + async storage. `onChanged` events from other contexts refresh the cache.
- **`importScripts()` compatibility:** `background.js` uses `importScripts()` to load `neuron-db.js` and `neuron-sync.js` — this must continue working in the service worker context
- **`chrome.storage.onChanged` for sync:** When NeuronDB writes to storage, the `onChanged` event fires in all OTHER contexts. NeuronSync must avoid triggering callbacks in the context that originated the change (it can compare old vs new values, or use a flag).
- **Atomic writes:** `chrome.storage.local.set()` is atomic per call. Batch operations that update multiple keys should combine them into a single `set()` call where possible.
- **Cache coherence:** When `onChanged` fires from another context, NeuronSync must update NeuronDB's in-memory cache. This requires NeuronSync to have access to NeuronDB's cache (either via a shared reference or a method like `NeuronDB._updateCache(key, value)`).

## Success Metrics

- Dashboard on options page displays real data extracted by content scripts (cross-origin data sharing works)
- Notifications on Fala.br display data persisted between sessions
- Config changes on options page reflect immediately in content scripts and popup
- Theme changes in popup reflect immediately in dashboard and notifications
- "Limpar Lista" button in notifications clears data for all contexts
- Zero consumer files require business logic changes — only import/load changes if necessary

## Open Questions

- Should `NeuronSync.broadcast()` be kept as a no-op for backward compatibility, or can it be removed since `chrome.storage.onChanged` fires automatically on writes?
- Should the in-memory cache in `init()` load all 5 keys in a single `chrome.storage.local.get()` call or individual calls? (Single call recommended for performance.)
- If a context never calls `init()` (e.g., a module loaded after NeuronDB), should read methods fall back to async storage reads, or should they throw an error?
