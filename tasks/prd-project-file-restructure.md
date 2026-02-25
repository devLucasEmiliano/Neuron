# PRD: Project File Structure Reorganization

## Introduction

Reorganize the Neuron Chrome extension's file and folder structure to improve navigation, maintainability, and consistency — without introducing build tools, new dependencies, or splitting existing files. This is a conservative restructuring focused on moving/renaming files and updating all references accordingly.

## Goals

- Separate third-party vendored libraries from project-authored utility code
- Establish a consistent naming convention across all folders and files
- Reduce root-level clutter by grouping extension entry points
- Organize the images folder by purpose (icons vs. assets)
- Update all references in `manifest.json`, HTML files, and JS imports to match the new paths

## Current Structure

```
/workspace/
├── manifest.json
├── background.js                          ← root-level clutter
├── config/
│   └── config.json
├── lib/                                   ← mixes vendored + project code
│   ├── bootstrap/
│   ├── chart.min.js
│   ├── idb.min.js
│   ├── date_utils.js                      ← project utility, not a vendor lib
│   └── module_factory.js                  ← project utility, not a vendor lib
├── shared/
│   ├── js/
│   └── css/
├── modules/
│   ├── popup/
│   ├── options/
│   ├── loading/
│   ├── notificacoes/
│   ├── ouvidoria/
│   │   ├── arquivar/
│   │   ├── encaminhar/
│   │   ├── prorrogar/
│   │   ├── tramitar/
│   │   ├── tratar/
│   │   ├── tratar-novo/                   ← inconsistent hyphen naming
│   │   └── resposta/
│   └── sic/
│       ├── analisar/
│       └── tratar/
├── images/                                ← flat, mixes icons and assets
│   ├── Intro-Neuron.gif
│   ├── neuron128.png
│   ├── neuron64.png
│   ├── neuronoff128.png
│   └── neuronon128.png
└── scripts/
```

## Proposed Structure

```
/workspace/
├── manifest.json
├── background.js
├── config/
│   └── config.json
├── vendor/                                ← renamed from lib/, third-party only
│   ├── bootstrap/
│   │   ├── css/
│   │   ├── icons/
│   │   └── js/
│   ├── chart.min.js
│   └── idb.min.js
├── shared/
│   ├── js/
│   │   ├── neuron-db.js
│   │   ├── neuron-utils.js
│   │   ├── theme-manager.js
│   │   ├── date-utils.js                  ← moved from lib/, renamed to hyphen
│   │   └── module-factory.js              ← moved from lib/, renamed to hyphen
│   └── css/
│       └── theme.css
├── modules/
│   ├── popup/
│   ├── options/
│   ├── loading/
│   ├── notificacoes/
│   ├── ouvidoria/
│   │   ├── arquivar/
│   │   ├── encaminhar/
│   │   ├── prorrogar/
│   │   ├── tramitar/
│   │   ├── tratar/
│   │   ├── tratar-novo/
│   │   └── resposta/
│   └── sic/
│       ├── analisar/
│       └── tratar/
├── images/
│   ├── icons/                             ← extension icons grouped
│   │   ├── neuron128.png
│   │   ├── neuron64.png
│   │   ├── neuronoff128.png
│   │   └── neuronon128.png
│   └── Intro-Neuron.gif                   ← promotional/asset images at root
└── scripts/
```

## User Stories

### US-001: Separate vendored libraries from project utilities

**Description:** As a developer, I want third-party libraries and project-authored utilities in clearly distinct locations so that I can immediately tell what is external vs. internal code.

**Acceptance Criteria:**
- [ ] Rename `lib/` to `vendor/` containing only third-party code: `bootstrap/`, `chart.min.js`, `idb.min.js`
- [ ] Move `lib/date_utils.js` to `shared/js/date-utils.js` (rename underscore to hyphen for consistency with existing shared files)
- [ ] Move `lib/module_factory.js` to `shared/js/module-factory.js` (rename underscore to hyphen)
- [ ] Update all references in `manifest.json` content_scripts and web_accessible_resources
- [ ] Verify no broken references remain by searching all `.js` and `.html` files for old paths

### US-002: Rename files with underscores inside modules to use hyphens

**Description:** As a developer, I want a consistent naming convention across all files so the codebase feels uniform and predictable.

**Acceptance Criteria:**
- [ ] Rename all files in `modules/ouvidoria/tratar-novo/` from underscores to hyphens:
  - `tratar_novo_extract.js` → `tratar-novo-extract.js`
  - `tratar_novo_insert.js` → `tratar-novo-insert.js`
  - `tratar_novo_pagesize.js` → `tratar-novo-pagesize.js`
  - `tratar_novo.css` → `tratar-novo.css`
- [ ] Rename files in `modules/ouvidoria/tramitar/`:
  - `tramitar_pontos_focais.js` → `tramitar-pontos-focais.js`
- [ ] Rename files in `modules/sic/tratar/`:
  - `sic_tratar_extract.js` → `sic-tratar-extract.js`
  - `sic_tratar_style.css` → `sic-tratar-style.css`
- [ ] Rename files in `modules/sic/analisar/`:
  - `sic_analisar_move_buttons.js` → `sic-analisar-move-buttons.js`
- [ ] Update all references in `manifest.json` to use the new filenames
- [ ] Search all `.js` and `.html` files for old filenames and update any internal references

### US-003: Organize images folder by purpose

**Description:** As a developer, I want extension icons separated from promotional/asset images so the images folder is easier to navigate.

**Acceptance Criteria:**
- [ ] Create `images/icons/` subfolder
- [ ] Move extension icon files into `images/icons/`: `neuron128.png`, `neuron64.png`, `neuronoff128.png`, `neuronon128.png`
- [ ] Keep non-icon assets (e.g., `Intro-Neuron.gif`) at the `images/` root
- [ ] Update `manifest.json` icon references (`icons`, `action.default_icon`) to use `images/icons/` path
- [ ] Update any HTML or JS files that reference icon paths

### US-004: Update manifest.json web_accessible_resources

**Description:** As a developer, I want the `web_accessible_resources` section to accurately reflect the new folder structure so content scripts can access all needed files at runtime.

**Acceptance Criteria:**
- [ ] Replace `"lib/*"` and `"lib/bootstrap/*"` entries with `"vendor/*"` and `"vendor/bootstrap/*"`
- [ ] Ensure `"shared/*"` still covers the moved utility files
- [ ] Verify the extension loads without errors after all path changes
- [ ] Test that content scripts can still access config, vendor libraries, and shared utilities

### US-005: Verify extension functionality after restructure

**Description:** As a developer, I want to confirm nothing is broken after all file moves and renames.

**Acceptance Criteria:**
- [ ] Run a full-text search for every old path (`lib/date_utils`, `lib/module_factory`, `lib/idb`, `lib/chart`, all old underscore filenames) and confirm zero references remain
- [ ] Load the extension in Chrome via `chrome://extensions` (developer mode) and verify no manifest errors
- [ ] Confirm the popup opens correctly
- [ ] Confirm the options page loads correctly
- [ ] Confirm at least one content script injects properly on a Fala.BR page

## Functional Requirements

- FR-1: Rename the `lib/` directory to `vendor/`, containing only `bootstrap/`, `chart.min.js`, and `idb.min.js`
- FR-2: Move `date_utils.js` and `module_factory.js` from `lib/` to `shared/js/`, renaming to `date-utils.js` and `module-factory.js`
- FR-3: Rename all module files that use underscores to use hyphens instead (see US-002 for full list)
- FR-4: Create `images/icons/` and move all extension icon PNG files into it
- FR-5: Update every path reference in `manifest.json` (content_scripts, icons, action, web_accessible_resources)
- FR-6: Update any path references inside `.html` files that load scripts or stylesheets using old paths
- FR-7: Update any path references inside `.js` files that use `chrome.runtime.getURL()` or similar APIs with old paths

## Non-Goals

- No introduction of build tools (Webpack, Vite, esbuild, etc.)
- No addition of `package.json` or npm dependencies
- No splitting of large files (e.g., `options.js` stays as-is)
- No changes to code logic, features, or behavior
- No TypeScript migration
- No changes to the `modules/` subfolder hierarchy (ouvidoria/sic grouping stays)
- No renaming of the `tratar-novo` folder itself (it already uses hyphens)

## Technical Considerations

- **manifest.json is the single source of truth** for all file paths in a Chrome extension. Every moved/renamed file must have its manifest reference updated or the extension will fail to load.
- **`chrome.runtime.getURL()`** calls inside JS files may reference old paths — these must be found and updated. Search for `getURL` across all JS files.
- **HTML files** (popup.html, options.html, loading.html) may have `<script>` and `<link>` tags referencing old paths.
- **Order of operations matters:** rename/move files first, then update all references, then verify. Do not delete old files until all references are confirmed updated.
- **Git will track renames** if done with `git mv`, preserving file history.

## Success Metrics

- Zero broken file references after restructuring (verified by full-text search)
- Extension loads without manifest errors in Chrome developer mode
- All content scripts inject correctly on target pages
- Clear separation: `vendor/` = third-party, `shared/` = project utilities, `modules/` = features

## Open Questions

- Should `background.js` be moved into a dedicated folder (e.g., `background/background.js`) or stay at the root? Keeping it at root is standard for Chrome extensions, but grouping it could improve consistency.
- Should `modules/options/dashboard.js` and `dashboard.css` be placed in a `modules/options/dashboard/` subfolder, or is the current flat layout within `options/` acceptable?
